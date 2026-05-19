package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

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
		defer func() {
			HubInstance.UnsubscribeAll(c)
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
				Action    string `json:"action"`
				Room      string `json:"room"`
				ProjectID string `json:"projectId"`
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
			}
		}
	}))
}
