package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"iotkit-studio-go/internal/database"
)

type ChatMessageInput struct {
	Message             string           `json:"message"`
	ConversationHistory []ConversationMsg `json:"conversationHistory"`
	SessionID           string           `json:"sessionId"`
}

type ConversationMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type SessionDTO struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	LastMessage     string     `json:"lastMessage"`
	LastMessageAt   *time.Time `json:"lastMessageAt"`
	LastMessageRole string     `json:"lastMessageRole"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	MessageCount    int64      `json:"messageCount"`
}

// GetSessions returns all chat sessions for user
func GetSessions(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)
	limitQuery := c.Query("limit", "50")
	offsetQuery := c.Query("offset", "0")

	limit, err := strconv.Atoi(limitQuery)
	if err != nil {
		limit = 50
	}
	offset, err := strconv.Atoi(offsetQuery)
	if err != nil {
		offset = 0
	}

	var sessions []database.ChatSession
	if err := database.DB.Where("userId = ?", userID).
		Order("updatedAt desc").
		Limit(limit).
		Offset(offset).
		Find(&sessions).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch sessions"})
	}

	sessionsDTO := make([]SessionDTO, len(sessions))
	for i, s := range sessions {
		var lastMsg database.ChatMessage
		var msgCount int64

		// Count messages
		database.DB.Model(&database.ChatMessage{}).Where("sessionId = ?", s.ID).Count(&msgCount)

		// Get last message
		var lastMessageContent string
		var lastMessageRole string
		var lastMessageAt *time.Time

		if err := database.DB.Where("sessionId = ?", s.ID).
			Order("createdAt desc").
			First(&lastMsg).Error; err == nil {
			lastMessageContent = lastMsg.Content
			if len(lastMessageContent) > 100 {
				lastMessageContent = lastMessageContent[:100]
			}
			lastMessageRole = lastMsg.Role
			lastMessageAt = &lastMsg.CreatedAt
		}

		sessionsDTO[i] = SessionDTO{
			ID:              s.ID,
			Title:           s.Title,
			LastMessage:     lastMessageContent,
			LastMessageAt:   lastMessageAt,
			LastMessageRole: lastMessageRole,
			CreatedAt:       s.CreatedAt,
			UpdatedAt:       s.UpdatedAt,
			MessageCount:    msgCount,
		}
	}

	return c.JSON(fiber.Map{"sessions": sessionsDTO})
}

// GetCurrentSession returns the active session or creates a new one
func GetCurrentSession(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var session database.ChatSession
	err := database.DB.Preload("Messages", func(db *gorm.DB) *gorm.DB {
		return db.Order("chat_messages.createdAt asc").Limit(100)
	}).Where("userId = ? AND title = ?", userID, "Current Chat").First(&session).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new
			session = database.ChatSession{
				UserID: userID,
				Title:  "Current Chat",
			}
			if err := database.DB.Create(&session).Error; err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to create default session"})
			}
			session.Messages = []database.ChatMessage{}
		} else {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch session"})
		}
	}

	return c.JSON(fiber.Map{"session": session})
}

// CreateSession creates a new session
func CreateSession(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var input struct {
		Title string `json:"title"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	title := input.Title
	if title == "" {
		title = fmt.Sprintf("Chat %s", time.Now().Format("02/01/2006 15:04:05"))
	}

	session := database.ChatSession{
		UserID: userID,
		Title:  title,
	}

	if err := database.DB.Create(&session).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create session"})
	}

	return c.Status(201).JSON(fiber.Map{"session": session})
}

// DeleteSession deletes a session
func DeleteSession(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)
	id := c.Params("id")

	result := database.DB.Where("id = ? AND userId = ?", id, userID).Delete(&database.ChatSession{})
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete session"})
	}
	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// Chat calls OpenRouter API with history and processes instructions
func Chat(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var input ChatMessageInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Message == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Message is required"})
	}

	// Daily message count verification
	today := time.Now().Truncate(24 * time.Hour)
	var dailyCount int64

	database.DB.Model(&database.ChatMessage{}).
		Joins("JOIN chat_sessions ON chat_messages.sessionId = chat_sessions.id").
		Where("chat_messages.role = ? AND chat_messages.createdAt >= ? AND chat_sessions.userId = ?", "user", today, userID).
		Count(&dailyCount)

	if dailyCount >= 5 {
		return c.Status(429).JSON(fiber.Map{
			"error":   "Daily limit reached",
			"message": "You have reached your daily limit of 5 AI Agent prompts. Please try again tomorrow.",
		})
	}

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	model := os.Getenv("OPENROUTER_MODEL")
	if model == "" {
		model = "anthropic/claude-3.5-sonnet"
	}

	if apiKey == "" {
		return c.Status(500).JSON(fiber.Map{
			"error":   "OpenRouter API key not configured",
			"message": "Please add OPENROUTER_API_KEY to your .env file",
		})
	}

	// Find or create session
	var session database.ChatSession
	var err error
	if input.SessionID != "" {
		err = database.DB.Where("id = ? AND userId = ?", input.SessionID, userID).First(&session).Error
	}

	if input.SessionID == "" || err != nil {
		session = database.ChatSession{
			UserID: userID,
			Title:  "Current Chat",
		}
		if err := database.DB.Create(&session).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create session"})
		}
	}

	// Save user message
	userMessage := database.ChatMessage{
		SessionID: session.ID,
		Role:      "user",
		Content:   input.Message,
	}
	if err := database.DB.Create(&userMessage).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save user message"})
	}

	// Prepare OpenRouter request
	systemMsg := fiber.Map{
		"role": "system",
		"content": `You are an autonomous IoT AI Assistant for IoTKit-Studio platform. You can EXECUTE actions, not just suggest them.

AVAILABLE ACTIONS:
1. CREATE_PROJECT - Create a new IoT project
2. CREATE_PAYLOAD - Create payload structure
3. START_SIMULATION - Start simulation
4. ANALYZE_DATA - Analyze simulation data

When user asks you to create/build something, respond with a JSON action plan:
{
  "type": "action_plan",
  "tasks": [
    {
      "action": "CREATE_PROJECT",
      "params": {
        "name": "Temperature Monitoring",
        "description": "Monitor temperature sensors",
        "protocol": "MQTT",
        "endpoint": "mqtt://103.217.145.187:1883",
        "topic": "sensors/temperature"
      }
    },
    {
      "action": "CREATE_PAYLOAD",
      "params": {
        "name": "Temperature Payload",
        "projectName": "Temperature Monitoring",
        "structure": [
          {
            "name": "deviceId",
            "type": "string",
            "mode": "static",
            "value": "temp_sensor_01"
          },
          {
            "name": "temperature",
            "type": "number",
            "mode": "random",
            "min": 20,
            "max": 30
          },
          {
            "name": "timestamp",
            "type": "string",
            "mode": "timestamp"
          }
        ]
      }
    }
  ],
  "summary": "I'll create a temperature monitoring project with MQTT protocol and configure the payload structure."
}

For regular questions, respond normally without JSON.

IMPORTANT:
- Always use valid JSON format for action plans
- Include all required parameters
- Be specific with values (don't use placeholders)
- Protocols: MQTT, MQTTS, HTTP, HTTPS, WS, WSS
- Endpoint format: protocol://host:port (e.g., mqtt://103.217.145.187:1883, http://api.example.com:8080)
- For CREATE_PAYLOAD, use "projectName" to reference the project created in previous task
- Payload types: string, number, boolean, object, array
- Payload modes: static, random, incremental, timestamp
- Support both Indonesian and English prompts`,
	}

	apiMessages := []fiber.Map{systemMsg}
	for _, h := range input.ConversationHistory {
		apiMessages = append(apiMessages, fiber.Map{
			"role":    h.Role,
			"content": h.Content,
		})
	}
	apiMessages = append(apiMessages, fiber.Map{
		"role":    "user",
		"content": input.Message,
	})

	reqBody := fiber.Map{
		"model":       model,
		"messages":    apiMessages,
		"temperature": 0.7,
		"max_tokens":  2000,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to serialize request"})
	}

	req, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create API request"})
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}
	req.Header.Set("HTTP-Referer", corsOrigin)
	req.Header.Set("X-Title", "IoTKit-Studio")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to communicate with OpenRouter"})
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read AI response"})
	}

	if resp.StatusCode != 200 {
		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error":   "API Error",
			"message": string(respBytes),
		})
	}

	var openrouterResponse struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Model string `json:"model"`
		Usage any    `json:"usage"`
	}

	if err := json.Unmarshal(respBytes, &openrouterResponse); err != nil || len(openrouterResponse.Choices) == 0 {
		return c.Status(500).JSON(fiber.Map{"error": "Invalid AI response structure"})
	}

	aiMessage := openrouterResponse.Choices[0].Message.Content

	// Check if response contains an action plan JSON block
	var actionPlan map[string]any
	var metadataStr *string

	r := regexp.MustCompile(`\{[\s\S]*"type":\s*"action_plan"[\s\S]*\}`)
	match := r.FindString(aiMessage)
	if match != "" {
		if err := json.Unmarshal([]byte(match), &actionPlan); err == nil {
			metadataStr = &match
		}
	}

	// Save AI message
	assistantMessage := database.ChatMessage{
		SessionID: session.ID,
		Role:      "assistant",
		Content:   aiMessage,
		Metadata:  metadataStr,
	}

	if err := database.DB.Create(&assistantMessage).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save AI response"})
	}

	// Update session updatedAt
	database.DB.Model(&session).Update("updatedAt", time.Now())

	return c.JSON(fiber.Map{
		"message":    aiMessage,
		"actionPlan": actionPlan,
		"sessionId":  session.ID,
		"messageId":  assistantMessage.ID,
		"model":      openrouterResponse.Model,
		"usage":      openrouterResponse.Usage,
	})
}

// ExecuteAction executes actions like CREATE_PROJECT, CREATE_PAYLOAD, etc.
func ExecuteAction(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var input struct {
		Action string          `json:"action"`
		Params json.RawMessage `json:"params"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	var result any
	var err error

	switch input.Action {
	case "CREATE_PROJECT":
		result, err = executeCreateProject(userID, input.Params)
	case "CREATE_PAYLOAD":
		result, err = executeCreatePayload(userID, input.Params)
	case "START_SIMULATION":
		result, err = executeStartSimulation(userID, input.Params)
	case "ANALYZE_DATA":
		result, err = executeAnalyzeData(userID, input.Params)
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Unknown action"})
	}

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"action":  input.Action,
		"result":  result,
	})
}

func executeCreateProject(userID string, paramsBytes []byte) (any, error) {
	var params struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Protocol    string `json:"protocol"`
		Endpoint    string `json:"endpoint"`
		Topic       string `json:"topic"`
		Username    string `json:"username"`
		Password    string `json:"password"`
	}
	if err := json.Unmarshal(paramsBytes, &params); err != nil {
		return nil, err
	}

	var host string
	var port *int
	endpoint := params.Endpoint

	if strings.Contains(params.Endpoint, "://") {
		u, err := url.Parse(params.Endpoint)
		if err == nil {
			host = u.Hostname()
			if u.Port() != "" {
				p, err := strconv.Atoi(u.Port())
				if err == nil {
					port = &p
				}
			}
			endpoint = u.Path
			if endpoint == "" {
				endpoint = "/"
			}
		} else {
			host = params.Endpoint
		}
	} else {
		parts := strings.Split(params.Endpoint, ":")
		host = parts[0]
		if len(parts) > 1 {
			p, err := strconv.Atoi(parts[1])
			if err == nil {
				port = &p
			}
		}
	}

	if host == "" {
		host = "localhost"
	}

	if port == nil {
		defaultPorts := map[string]int{
			"HTTP":  80,
			"HTTPS": 443,
			"MQTT":  1883,
			"MQTTS": 8883,
			"WS":    80,
			"WSS":   443,
		}
		p := defaultPorts[strings.ToUpper(params.Protocol)]
		if p == 0 {
			p = 80
		}
		port = &p
	}

	sslEnabled := strings.HasSuffix(strings.ToUpper(params.Protocol), "S")

	var desc *string
	if params.Description != "" {
		desc = &params.Description
	}

	var topic *string
	if params.Topic != "" {
		topic = &params.Topic
	}

	var username *string
	if params.Username != "" {
		username = &params.Username
	}

	var password *string
	if params.Password != "" {
		password = &params.Password
	}

	project := database.Project{
		Name:        params.Name,
		Description: desc,
		Protocol:    strings.ToUpper(params.Protocol),
		Host:        host,
		Port:        port,
		Endpoint:    &endpoint,
		Topic:       topic,
		Username:    username,
		Password:    password,
		SSLEnabled:  sslEnabled,
		Status:      "inactive",
		UserID:      userID,
	}

	if err := database.DB.Create(&project).Error; err != nil {
		return nil, err
	}

	return fiber.Map{
		"projectId": project.ID,
		"name":      project.Name,
		"protocol":  project.Protocol,
		"host":      project.Host,
		"port":      project.Port,
	}, nil
}

func executeCreatePayload(userID string, paramsBytes []byte) (any, error) {
	var params struct {
		ProjectID   string          `json:"projectId"`
		ProjectName string          `json:"projectName"`
		Name        string          `json:"name"`
		Structure   json.RawMessage `json:"structure"`
		Template    bool            `json:"template"`
	}
	if err := json.Unmarshal(paramsBytes, &params); err != nil {
		return nil, err
	}

	projectID := params.ProjectID

	if projectID == "" && params.ProjectName != "" {
		var project database.Project
		err := database.DB.Where("userId = ? AND name = ?", userID, params.ProjectName).
			Order("createdAt desc").
			First(&project).Error
		if err != nil {
			return nil, fmt.Errorf("project '%s' not found", params.ProjectName)
		}
		projectID = project.ID
	}

	if projectID == "" {
		return nil, fmt.Errorf("project ID or name is required")
	}

	payload := database.Payload{
		Name:      params.Name,
		Structure: string(params.Structure),
		Template:  params.Template,
		ProjectID: projectID,
	}

	if err := database.DB.Create(&payload).Error; err != nil {
		return nil, err
	}

	return fiber.Map{
		"payloadId": payload.ID,
		"name":      payload.Name,
		"projectId": projectID,
	}, nil
}

func executeStartSimulation(userID string, paramsBytes []byte) (any, error) {
	var params struct {
		ProjectID string `json:"projectId"`
	}
	if err := json.Unmarshal(paramsBytes, &params); err != nil {
		return nil, err
	}

	return fiber.Map{
		"message":   "Simulation start would be triggered here",
		"projectId": params.ProjectID,
	}, nil
}

func executeAnalyzeData(userID string, paramsBytes []byte) (any, error) {
	var params struct {
		ProjectID string `json:"projectId"`
	}
	if err := json.Unmarshal(paramsBytes, &params); err != nil {
		return nil, err
	}

	return fiber.Map{
		"message":   "Data analysis would be performed here",
		"projectId": params.ProjectID,
	}, nil
}

// GetModels lists available models from OpenRouter
func GetModels(c *fiber.Ctx) error {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return c.Status(500).JSON(fiber.Map{"error": "OpenRouter API key not configured"})
	}

	req, err := http.NewRequest("GET", "https://openrouter.ai/api/v1/models", nil)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create API request"})
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch models from OpenRouter"})
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read API response"})
	}

	var rawJSON json.RawMessage
	if err := json.Unmarshal(respBytes, &rawJSON); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse OpenRouter response"})
	}

	return c.JSON(rawJSON)
}

// GetUsage returns user usage stats for the day
func GetUsage(c *fiber.Ctx) error {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return c.Status(500).JSON(fiber.Map{"error": "OpenRouter API key not configured"})
	}

	userID := c.Locals("userId").(string)
	limit := 5

	today := time.Now().Truncate(24 * time.Hour)
	var dailyCount int64

	database.DB.Model(&database.ChatMessage{}).
		Joins("JOIN chat_sessions ON chat_messages.sessionId = chat_sessions.id").
		Where("chat_messages.role = ? AND chat_messages.createdAt >= ? AND chat_sessions.userId = ?", "user", today, userID).
		Count(&dailyCount)

	currentModel := os.Getenv("OPENROUTER_MODEL")
	if currentModel == "" {
		currentModel = "anthropic/claude-3.5-sonnet"
	}

	remaining := limit - int(dailyCount)
	if remaining < 0 {
		remaining = 0
	}

	return c.JSON(fiber.Map{
		"limit":        limit,
		"used":         dailyCount,
		"remaining":    remaining,
		"currentModel": currentModel,
	})
}
