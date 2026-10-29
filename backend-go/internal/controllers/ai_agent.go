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
	if err := database.DB.Where("\"userId\" = ?", userID).
		Order("\"updatedAt\" desc").
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
		database.DB.Model(&database.ChatMessage{}).Where("\"sessionId\" = ?", s.ID).Count(&msgCount)

		// Get last message
		var lastMessageContent string
		var lastMessageRole string
		var lastMessageAt *time.Time

		if err := database.DB.Where("\"sessionId\" = ?", s.ID).
			Order("\"createdAt\" desc").
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
		return db.Order("chat_messages.\"createdAt\" asc").Limit(100)
	}).Where("\"userId\" = ? AND title = ?", userID, "Current Chat").First(&session).Error

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

	result := database.DB.Where("id = ? AND \"userId\" = ?", id, userID).Delete(&database.ChatSession{})
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete session"})
	}
	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Session not found"})
	}

	return c.JSON(fiber.Map{"success": true})
}

// getAIConfig retrieves base URL, API key, and model from environment variables
// Supports 9router, OpenRouter, or any OpenAI-compatible API gateway
func getAIConfig() (baseURL, apiKey, model string) {
	apiKey = os.Getenv("AI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("OPENROUTER_API_KEY")
	}

	baseURL = os.Getenv("AI_BASE_URL")
	if baseURL == "" {
		baseURL = os.Getenv("OPENROUTER_BASE_URL")
	}
	if baseURL == "" {
		baseURL = "https://9router.stdv.biz.id/v1"
	}
	baseURL = strings.TrimRight(baseURL, "/")

	model = os.Getenv("AI_MODEL")
	if model == "" {
		model = os.Getenv("OPENROUTER_MODEL")
	}
	if model == "" {
		model = "ag/gemini-3.8-flash-high"
	}

	return baseURL, apiKey, model
}

// Chat calls AI completion API with history and processes instructions
func Chat(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var input ChatMessageInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if input.Message == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Message is required"})
	}

	baseURL, apiKey, model := getAIConfig()
	if apiKey == "" {
		return c.Status(500).JSON(fiber.Map{
			"error":   "AI API key not configured",
			"message": "Please configure AI_API_KEY or OPENROUTER_API_KEY in your .env file",
		})
	}

	// Find or create session
	var session database.ChatSession
	var err error
	if input.SessionID != "" {
		err = database.DB.Where("id = ? AND \"userId\" = ?", input.SessionID, userID).First(&session).Error
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
		"content": `Anda adalah Asisten AI IoT otonom untuk platform IoTKit-Studio. Anda dapat MENGEKSEKUSI aksi secara langsung di sistem, bukan sekadar memberikan saran.

ATURAN BAHASA & FORMATTING (SANGAT PENTING & MUTLAK):
1. Anda WAJIB SELALU berkomunikasi, merespon, dan menjelaskan HANYA DALAM BAHASA INDONESIA.
2. Dilarang keras merespon dalam bahasa Inggris, kecuali untuk nama parameter teknis, sintaks kode JSON, atau protokol jaringan (seperti MQTT, HTTP, WS).
3. Field "summary" pada action plan wajib ditulis dalam Bahasa Indonesia yang jelas, ringkas, dan profesional.
4. Jika pengguna bertanya hal umum, teknis, troubleshooting, atau rekomendasi sensor IoT, jawablah secara lengkap dan ramah dalam Bahasa Indonesia tanpa membungkusnya dalam format JSON action plan.
5. Gunakan format Markdown (.md) yang rapi, bersih, dan terstruktur (gunakan heading ###, bullet list standar, kode inline, atau divider line). Hindari penumpukan tanda bintang yang berlebihan atau formatting bertumpuk (* *"teks"*).

AKSI YANG TERSEDIA:
1. CREATE_PROJECT - Membuat project/node simulasi IoT baru
2. CREATE_PAYLOAD - Membuat struktur skema payload data sensor
3. START_SIMULATION - Memulai proses simulasi stream
4. ANALYZE_DATA - Menganalisis telemetri atau data sensor

Ketika pengguna meminta Anda untuk membuat, merancang, atau menyiapkan sistem/sensor/proyek IoT, berikan respon rencana aksi JSON (action plan) dengan format:
{
  "type": "action_plan",
  "tasks": [
    {
      "action": "CREATE_PROJECT",
      "params": {
        "name": "Monitoring Suhu Ruangan",
        "description": "Pemantauan telemetri suhu dan kelembaban ruangan",
        "protocol": "MQTT",
        "endpoint": "mqtt://103.217.145.187:1883",
        "topic": "sensors/temperature"
      }
    },
    {
      "action": "CREATE_PAYLOAD",
      "params": {
        "name": "Payload Suhu",
        "projectName": "Monitoring Suhu Ruangan",
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
  "summary": "Saya akan membuat proyek monitoring suhu dengan protokol MQTT dan mengonfigurasi skema payload sensor terkait."
}

PEDOMAN TEKNIS:
- Selalu gunakan format JSON yang valid untuk rencana aksi.
- Sertakan seluruh parameter yang dibutuhkan secara spesifik dan realistis (jangan gunakan teks placeholder).
- Protokol yang didukung: MQTT, MQTTS, HTTP, HTTPS, WS, WSS.
- Format endpoint: protocol://host:port (contoh: mqtt://103.217.145.187:1883, http://api.example.com:8080).
- Untuk CREATE_PAYLOAD, gunakan "projectName" yang merujuk pada nama proyek yang dibuat pada task sebelumnya.
- Tipe data payload: string, number, boolean, object, array.
- Mode payload: static, random, incremental, timestamp.`,
	}

	// Sliding window for conversation history: keep recent turns (max 15) to prevent token explosion & latency degradation
	history := input.ConversationHistory
	const maxHistoryTurns = 15
	if len(history) > maxHistoryTurns {
		history = history[len(history)-maxHistoryTurns:]
	}

	apiMessages := []fiber.Map{systemMsg}
	for _, h := range history {
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
		"stream":      false,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to serialize request"})
	}

	req, err := http.NewRequest("POST", baseURL+"/chat/completions", bytes.NewBuffer(jsonBytes))
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
		return c.Status(500).JSON(fiber.Map{"error": "Failed to communicate with AI provider"})
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read AI response"})
	}

	if resp.StatusCode != 200 {
		var providerErr struct {
			Error struct {
				Message string `json:"message"`
				Code    any    `json:"code"`
			} `json:"error"`
		}
		errMsg := string(respBytes)
		if json.Unmarshal(respBytes, &providerErr) == nil && providerErr.Error.Message != "" {
			errMsg = providerErr.Error.Message
		}

		return c.Status(resp.StatusCode).JSON(fiber.Map{
			"error":   "AI Provider Error",
			"message": errMsg,
		})
	}

	var chatResponse struct {
		Choices []struct {
			Message struct {
				Role             string `json:"role"`
				Content          string `json:"content"`
				ReasoningContent string `json:"reasoning_content"`
			} `json:"message"`
		} `json:"choices"`
		Model string `json:"model"`
		Usage any    `json:"usage"`
	}

	if err := json.Unmarshal(respBytes, &chatResponse); err != nil || len(chatResponse.Choices) == 0 {
		return c.Status(500).JSON(fiber.Map{"error": "Invalid AI response structure"})
	}

	aiMessage := chatResponse.Choices[0].Message.Content
	if aiMessage == "" && chatResponse.Choices[0].Message.ReasoningContent != "" {
		aiMessage = chatResponse.Choices[0].Message.ReasoningContent
	}

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
	database.DB.Model(&database.ChatSession{}).Where("id = ?", session.ID).UpdateColumn("updatedAt", time.Now())

	return c.JSON(fiber.Map{
		"message":    aiMessage,
		"actionPlan": actionPlan,
		"sessionId":  session.ID,
		"messageId":  assistantMessage.ID,
		"model":      chatResponse.Model,
		"usage":      chatResponse.Usage,
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
		err := database.DB.Where("\"userId\" = ? AND name = ?", userID, params.ProjectName).
			Order("\"createdAt\" desc").
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

// GetModels lists available models from AI Provider
func GetModels(c *fiber.Ctx) error {
	baseURL, apiKey, _ := getAIConfig()
	if apiKey == "" {
		return c.Status(500).JSON(fiber.Map{"error": "AI Provider API key not configured"})
	}

	req, err := http.NewRequest("GET", baseURL+"/models", nil)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create API request"})
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch models from AI provider"})
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to read API response"})
	}

	var rawJSON json.RawMessage
	if err := json.Unmarshal(respBytes, &rawJSON); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse models response"})
	}

	return c.JSON(rawJSON)
}

// GetUsage returns user usage stats for the day (unlimited mode)
func GetUsage(c *fiber.Ctx) error {
	_, apiKey, currentModel := getAIConfig()
	if apiKey == "" {
		return c.Status(500).JSON(fiber.Map{"error": "AI Provider API key not configured"})
	}

	userID := c.Locals("userId").(string)

	today := time.Now().Truncate(24 * time.Hour)
	var dailyCount int64

	database.DB.Model(&database.ChatMessage{}).
		Joins("JOIN chat_sessions ON chat_messages.\"sessionId\" = chat_sessions.id").
		Where("chat_messages.role = ? AND chat_messages.\"createdAt\" >= ? AND chat_sessions.\"userId\" = ?", "user", today, userID).
		Count(&dailyCount)

	return c.JSON(fiber.Map{
		"limit":        -1,
		"unlimited":    true,
		"used":         dailyCount,
		"remaining":    -1,
		"currentModel": currentModel,
	})
}
