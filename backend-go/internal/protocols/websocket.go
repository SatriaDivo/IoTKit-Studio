package protocols

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"iotkit-studio-go/internal/database"
)

type WSClient struct {
	conn      *websocket.Conn
	project   *database.Project
	connected bool
	mu        sync.Mutex
}

func NewWSClient(project *database.Project) *WSClient {
	return &WSClient{project: project}
}

func (w *WSClient) Connect() error {
	scheme := "ws"
	if w.project.Protocol == "WSS" || w.project.Protocol == "wss" {
		scheme = "wss"
	}

	port := 80
	if w.project.Port != nil {
		port = *w.project.Port
	}

	endpoint := ""
	if w.project.Endpoint != nil {
		endpoint = *w.project.Endpoint
	}

	url := fmt.Sprintf("%s://%s:%d%s", scheme, w.project.Host, port, endpoint)

	headers := make(map[string][]string)
	if w.project.AuthToken != nil && *w.project.AuthToken != "" {
		headers["Authorization"] = []string{"Bearer " + *w.project.AuthToken}
	}

	if w.project.Headers != nil && *w.project.Headers != "" {
		var customHeaders []struct {
			Key   string `json:"key"`
			Value string `json:"value"`
		}
		json.Unmarshal([]byte(*w.project.Headers), &customHeaders)
		for _, h := range customHeaders {
			if h.Key != "" && h.Value != "" {
				headers[h.Key] = []string{h.Value}
			}
		}
	}

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.Dial(url, headers)
	if err != nil {
		return fmt.Errorf("WebSocket connect failed: %v", err)
	}

	w.conn = conn
	w.connected = true
	log.Printf("[WS] Connected to %s", url)
	return nil
}

func (w *WSClient) Send(payload interface{}) (bool, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if !w.connected || w.conn == nil {
		return false, fmt.Errorf("WebSocket not connected")
	}

	data, _ := json.Marshal(payload)
	err := w.conn.WriteMessage(websocket.TextMessage, data)
	if err != nil {
		return false, err
	}

	log.Printf("[WS] Message sent | %d bytes", len(data))
	return true, nil
}

func (w *WSClient) Disconnect() {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.conn != nil {
		w.conn.Close()
		w.connected = false
	}
}

func (w *WSClient) IsConnected() bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.connected
}
