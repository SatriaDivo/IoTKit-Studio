package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
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

// SetupWebSocket registers WebSocket routes on the Fiber app
func SetupWebSocket(app *fiber.App) {
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		connMu := &sync.Mutex{}

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
			log.Println("[WS-Hub] Client disconnected")
		}()

		log.Println("[WS-Hub] Client connected")

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
				room := payload.Room
				if room == "" && payload.ProjectID != "" {
					room = "project:" + payload.ProjectID
				}
				if room != "" {
					HubInstance.Subscribe(room, c)
				}
			case "unsubscribe":
				room := payload.Room
				if room == "" && payload.ProjectID != "" {
					room = "project:" + payload.ProjectID
				}
				if room != "" {
					HubInstance.Unsubscribe(room, c)
				}

			case "mqtt_connect":
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
