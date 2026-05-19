package protocols

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"

	"iotkit-studio-go/internal/database"
)

type MQTTClient struct {
	client    mqtt.Client
	project   *database.Project
	connected bool
	mu        sync.Mutex
}

func NewMQTTClient(project *database.Project) *MQTTClient {
	return &MQTTClient{project: project}
}

func (m *MQTTClient) Connect() error {
	protocol := "tcp"
	port := 1883
	if m.project.Port != nil {
		port = *m.project.Port
	}

	proto := m.project.Protocol
	if proto == "MQTTS" || proto == "mqtts" {
		protocol = "ssl"
		if port == 1883 {
			port = 8883
		}
	}

	broker := fmt.Sprintf("%s://%s:%d", protocol, m.project.Host, port)
	clientID := fmt.Sprintf("iotkit_%x", rand.Int63())

	opts := mqtt.NewClientOptions().
		AddBroker(broker).
		SetClientID(clientID).
		SetCleanSession(true).
		SetAutoReconnect(m.project.AutoReconnect).
		SetConnectTimeout(10 * time.Second)

	if m.project.Username != nil && *m.project.Username != "" {
		opts.SetUsername(*m.project.Username)
	}
	if m.project.Password != nil && *m.project.Password != "" {
		opts.SetPassword(*m.project.Password)
	}

	opts.SetOnConnectHandler(func(c mqtt.Client) {
		m.mu.Lock()
		m.connected = true
		m.mu.Unlock()
		log.Printf("[MQTT] Connected to %s", broker)
	})

	opts.SetConnectionLostHandler(func(c mqtt.Client, err error) {
		m.mu.Lock()
		m.connected = false
		m.mu.Unlock()
		log.Printf("[MQTT] Connection lost: %v", err)
	})

	m.client = mqtt.NewClient(opts)
	token := m.client.Connect()
	token.Wait()
	if token.Error() != nil {
		return fmt.Errorf("MQTT connect failed: %v", token.Error())
	}

	m.connected = true
	return nil
}

func (m *MQTTClient) Publish(payload map[string]interface{}) (bool, error) {
	m.mu.Lock()
	connected := m.connected
	m.mu.Unlock()

	if !connected || m.client == nil {
		return false, fmt.Errorf("MQTT client not connected")
	}

	topic := "iotkit/default"
	if m.project.Topic != nil && *m.project.Topic != "" {
		topic = *m.project.Topic
	}

	data, _ := json.Marshal(payload)
	token := m.client.Publish(topic, 1, false, data)
	token.Wait()

	if token.Error() != nil {
		return false, token.Error()
	}

	log.Printf("[MQTT] Published to %s | %d bytes", topic, len(data))
	return true, nil
}

func (m *MQTTClient) Disconnect() {
	if m.client != nil {
		m.client.Disconnect(1000)
		m.connected = false
	}
}

func (m *MQTTClient) IsConnected() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.connected
}
