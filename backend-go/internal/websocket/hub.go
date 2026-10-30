package websocket

import (
	"encoding/json"
	"log"
	"strings"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/middleware"
	"iotkit-studio-go/internal/security"
)

type ActiveInspector struct {
	Client mqtt.Client
	Conn   *websocket.Conn
	ConnMu *sync.Mutex
}

var inspectorClients = make(map[*websocket.Conn]*ActiveInspector)
var inspectorClientsMu sync.Mutex

func sendEvent(conn *websocket.Conn, connMu *sync.Mutex, event string, data interface{}) {
	msg, err := json.Marshal(map[string]interface{}{
		"event": event,
		"data":  data,
	})
	if err != nil {
		return
	}
	connMu.Lock()
	defer connMu.Unlock()
	_ = conn.WriteMessage(1, msg)
}

// Hub manages WebSocket connections and broadcasting
type Hub struct {
	// rooms maps room names to a set of connections
	rooms map[string]map[*websocket.Conn]bool
	mu    sync.RWMutex
}

var HubInstance = &Hub{
	rooms: make(map[string]map[*websocket.Conn]bool),
}

// Subscribe adds a connection to a room
func (h *Hub) Subscribe(room string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[room] == nil {
		h.rooms[room] = make(map[*websocket.Conn]bool)
	}
	h.rooms[room][conn] = true
	log.Printf("[WS-Hub] Client subscribed to %s", room)
}

// Unsubscribe removes a connection from a room
func (h *Hub) Unsubscribe(room string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if conns, ok := h.rooms[room]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.rooms, room)
		}
	}
	log.Printf("[WS-Hub] Client unsubscribed from %s", room)
}

// UnsubscribeAll removes a connection from all rooms
func (h *Hub) UnsubscribeAll(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for room, conns := range h.rooms {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(h.rooms, room)
		}
	}
}

// Broadcast sends a message to all connections in a room
func (h *Hub) Broadcast(room string, event string, data interface{}) {
	h.mu.RLock()
	conns := h.rooms[room]
	h.mu.RUnlock()

	if len(conns) == 0 {
		return
	}

	msg, _ := json.Marshal(map[string]interface{}{
		"event": event,
		"data":  data,
	})

	h.mu.RLock()
	defer h.mu.RUnlock()
	for conn := range conns {
		if err := conn.WriteMessage(1, msg); err != nil {
			log.Printf("[WS-Hub] Write error: %v", err)
		}
	}
}

// BroadcastToProject sends to project-specific room
func (h *Hub) BroadcastToProject(projectID string, event string, data interface{}) {
	h.Broadcast("project:"+projectID, event, data)
}

// SetupWebSocket registers WebSocket routes on the Fiber app with strict authentication and authorization
func SetupWebSocket(app *fiber.App) {
	app.Use("/ws", func(c *fiber.Ctx) error {
		if !websocket.IsWebSocketUpgrade(c) {
			return fiber.ErrUpgradeRequired
		}

		// 1. Extract token from query param "?token=..."
		tokenStr := strings.TrimSpace(c.Query("token"))

		// 2. Or from Authorization header "Bearer <token>"
		if tokenStr == "" {
			authHeader := strings.TrimSpace(c.Get("Authorization"))
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		// 3. Or from Sec-WebSocket-Protocol "bearer.<token>"
		if tokenStr == "" {
			protocols := c.Get("Sec-WebSocket-Protocol")
			for _, p := range strings.Split(protocols, ",") {
				p = strings.TrimSpace(p)
				if strings.HasPrefix(p, "bearer.") {
					tokenStr = strings.TrimPrefix(p, "bearer.")
					break
				}
			}
		}

		if tokenStr == "" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Authentication token required for WebSocket connection (use ?token=<jwt> or Authorization header)",
			})
		}

		userID, role, err := middleware.VerifyTokenWithRole(tokenStr)
		if err != nil || userID == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid or expired authentication token"})
		}

		c.Locals("userId", userID)
		c.Locals("userRole", role)
		return c.Next()
	})

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		connMu := &sync.Mutex{}

		userID, _ := c.Locals("userId").(string)
		userRole, _ := c.Locals("userRole").(string)
		if userID == "" {
			c.Close()
			return
		}

		defer func() {
			HubInstance.UnsubscribeAll(c)
			
			// Clean up any active inspector client associated with this connection
			inspectorClientsMu.Lock()
			if active, exists := inspectorClients[c]; exists {
				if active.Client != nil && active.Client.IsConnected() {
					active.Client.Disconnect(250)
				}
				delete(inspectorClients, c)
			}
			inspectorClientsMu.Unlock()

			c.Close()
			log.Printf("[WS-Hub] Client disconnected (User: %s)", userID)
		}()

		log.Printf("[WS-Hub] Authenticated client connected (User: %s, Role: %s)", userID, userRole)

		for {
			_, msg, err := c.ReadMessage()
			if err != nil {
				break
			}

			var payload struct {
				Action    string   `json:"action"`
				Room      string   `json:"room"`
				ProjectID string   `json:"projectId"`
				Broker    string   `json:"broker"`
				ClientID  string   `json:"clientId"`
				Username  string   `json:"username"`
				Password  string   `json:"password"`
				Topics    []string `json:"topics"`
				Topic     string   `json:"topic"`
				Message   string   `json:"message"`
			}

			if err := json.Unmarshal(msg, &payload); err != nil {
				continue
			}

			switch payload.Action {
			case "subscribe":
				room := strings.TrimSpace(payload.Room)
				if room == "" && payload.ProjectID != "" {
					room = "project:" + strings.TrimSpace(payload.ProjectID)
				}
				if room == "" {
					continue
				}

				// Authorization verification
				if strings.HasPrefix(room, "project:") {
					targetProjectID := strings.TrimPrefix(room, "project:")
					if userRole != "admin" {
						var count int64
						database.DB.Model(&database.Project{}).Where("id = ? AND \"userId\" = ?", targetProjectID, userID).Count(&count)
						if count == 0 {
							sendEvent(c, connMu, "ws_error", map[string]string{
								"error": "Forbidden: You do not have permission to subscribe to this project's events",
							})
							continue
						}
					}
				} else if room == "global" {
					if userRole != "admin" {
						sendEvent(c, connMu, "ws_error", map[string]string{
							"error": "Forbidden: Administrator role required to subscribe to global room",
						})
						continue
					}
				} else if room == "projects" {
					// Allowed for any authenticated user
				} else {
					sendEvent(c, connMu, "ws_error", map[string]string{
						"error": "Forbidden: unknown room",
					})
					continue
				}

				HubInstance.Subscribe(room, c)
				sendEvent(c, connMu, "subscribed", map[string]string{"room": room})

			case "unsubscribe":
				room := strings.TrimSpace(payload.Room)
				if room == "" && payload.ProjectID != "" {
					room = "project:" + strings.TrimSpace(payload.ProjectID)
				}
				if room != "" {
					HubInstance.Unsubscribe(room, c)
				}

			case "mqtt_connect":
				// Validate broker against SSRF and unauthorized local network access
				if err := security.ValidateBrokerURL(payload.Broker); err != nil {
					sendEvent(c, connMu, "mqtt_error", map[string]string{
						"message": "Connection blocked for security: " + err.Error(),
					})
					continue
				}

				// Disconnect any existing inspector for this connection first
				inspectorClientsMu.Lock()
				if active, exists := inspectorClients[c]; exists {
					if active.Client != nil && active.Client.IsConnected() {
						active.Client.Disconnect(250)
					}
					delete(inspectorClients, c)
				}
				inspectorClientsMu.Unlock()

				opts := mqtt.NewClientOptions().
					AddBroker(payload.Broker).
					SetClientID(payload.ClientID).
					SetCleanSession(true).
					SetConnectTimeout(5 * time.Second)

				if payload.Username != "" {
					opts.SetUsername(payload.Username)
				}
				if payload.Password != "" {
					opts.SetPassword(payload.Password)
				}

				client := mqtt.NewClient(opts)
				token := client.Connect()
				token.Wait()
				if token.Error() != nil {
					sendEvent(c, connMu, "mqtt_error", map[string]string{"message": token.Error().Error()})
					continue
				}

				// Subscribe to topics
				for _, t := range payload.Topics {
					if t != "" {
						client.Subscribe(t, 1, func(cli mqtt.Client, msg mqtt.Message) {
							sendEvent(c, connMu, "mqtt_message", map[string]interface{}{
								"topic":     msg.Topic(),
								"payload":   string(msg.Payload()),
								"qos":       msg.Qos(),
								"retained":  msg.Retained(),
								"timestamp": time.Now().Format(time.RFC3339),
							})
						})
					}
				}

				inspectorClientsMu.Lock()
				inspectorClients[c] = &ActiveInspector{
					Client: client,
					Conn:   c,
					ConnMu: connMu,
				}
				inspectorClientsMu.Unlock()

				sendEvent(c, connMu, "mqtt_connected", map[string]string{"broker": payload.Broker})

			case "mqtt_subscribe":
				inspectorClientsMu.Lock()
				active, exists := inspectorClients[c]
				inspectorClientsMu.Unlock()

				if exists && active.Client != nil && active.Client.IsConnected() {
					for _, t := range payload.Topics {
						if t != "" {
							active.Client.Subscribe(t, 1, func(cli mqtt.Client, msg mqtt.Message) {
								sendEvent(c, connMu, "mqtt_message", map[string]interface{}{
									"topic":     msg.Topic(),
									"payload":   string(msg.Payload()),
									"qos":       msg.Qos(),
									"retained":  msg.Retained(),
									"timestamp": time.Now().Format(time.RFC3339),
								})
							})
						}
					}
				}

			case "mqtt_publish":
				inspectorClientsMu.Lock()
				active, exists := inspectorClients[c]
				inspectorClientsMu.Unlock()

				if exists && active.Client != nil && active.Client.IsConnected() {
					token := active.Client.Publish(payload.Topic, 1, false, []byte(payload.Message))
					token.Wait()
				}

			case "mqtt_disconnect":
				inspectorClientsMu.Lock()
				if active, exists := inspectorClients[c]; exists {
					if active.Client != nil && active.Client.IsConnected() {
						active.Client.Disconnect(250)
					}
					delete(inspectorClients, c)
				}
				inspectorClientsMu.Unlock()
				sendEvent(c, connMu, "mqtt_disconnected", nil)
			}
		}
	}))
}
