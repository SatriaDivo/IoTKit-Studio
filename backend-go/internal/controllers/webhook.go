package controllers

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/services"
	ws "iotkit-studio-go/internal/websocket"
)

// --- Webhook Management (auth required) ---

func WebhookGenerate(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	// Always generate a fresh new token when requested (Regenerate)
	token := uuid.New().String()

	enabled := true
	database.DB.Model(&project).Updates(map[string]interface{}{
		"webhookToken":   token,
		"webhookEnabled": true,
	})

	webhookURL := fmt.Sprintf("http://localhost:4000/api/webhook/%s", token)

	return c.JSON(fiber.Map{
		"token":          token,
		"webhookUrl":     webhookURL,
		"webhookEnabled": enabled,
	})
}

func WebhookClear(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	database.DB.Model(&project).Updates(map[string]interface{}{
		"webhookToken":   nil,
		"webhookEnabled": false,
	})

	return c.JSON(fiber.Map{"message": "Webhook disabled successfully"})
}

func WebhookGetHistory(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)
	limit := c.QueryInt("limit", 50)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	var logs []database.Log
	database.DB.Where("\"projectId\" = ? AND type = ?", projectID, "webhook").
		Order("timestamp DESC").Limit(limit).Find(&logs)

	return c.JSON(fiber.Map{
		"token":          project.WebhookToken,
		"webhookEnabled": project.WebhookEnabled,
		"logs":           logs,
	})
}

func WebhookGetInfo(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).
		Select("id, name, \"webhookToken\", \"webhookEnabled\"").First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	var webhookURL *string
	if project.WebhookToken != nil && *project.WebhookToken != "" {
		url := fmt.Sprintf("http://localhost:4000/api/webhook/%s", *project.WebhookToken)
		webhookURL = &url
	}

	return c.JSON(fiber.Map{
		"id":             project.ID,
		"name":           project.Name,
		"webhookToken":   project.WebhookToken,
		"webhookEnabled": project.WebhookEnabled,
		"webhookUrl":     webhookURL,
	})
}

// --- Public Webhook Receiver (no auth) ---

func WebhookReceive(c *fiber.Ctx) error {
	token := c.Params("token")
	body := c.Body()

	var project database.Project
	if err := database.DB.Where("\"webhookToken\" = ?", token).First(&project).Error; err != nil || !project.WebhookEnabled {
		return c.Status(404).JSON(fiber.Map{"error": "Webhook endpoint not found or disabled"})
	}

	method := c.Method()
	ip := c.IP()
	payloadStr := string(body)
	byteSize := len(body)

	statusCode := 200
	latency := 0
	msg := fmt.Sprintf("Incoming webhook from %s [%s] %dB", ip, method, byteSize)

	logEntry := database.Log{
		Type:       "webhook",
		Protocol:   "HTTP",
		Message:    msg,
		Payload:    &payloadStr,
		StatusCode: &statusCode,
		Latency:    &latency,
		ProjectID:  project.ID,
	}
	database.DB.Create(&logEntry)

	// Check if Webhook schema mapping is configured and active
	var webhookMap database.WebhookMap
	hasMap := false
	var targetPayload interface{}
	var parsedBody map[string]interface{}

	if err := json.Unmarshal(body, &parsedBody); err == nil {
		targetPayload = parsedBody

		if errMap := database.DB.Where("\"projectId\" = ? AND active = ?", project.ID, true).First(&webhookMap).Error; errMap == nil {
			mappedData := services.TransformPayload(parsedBody, webhookMap.Mappings)
			if len(mappedData) > 0 {
				targetPayload = mappedData
				hasMap = true

				// Save secondary response log with mapped data
				mappedJSONBytes, _ := json.Marshal(mappedData)
				mappedJSONStr := string(mappedJSONBytes)
				respMsg := "[Mapped Webhook] Telemetry mapped variables captured"

				telemetryLog := database.Log{
					Type:       "response",
					Protocol:   "HTTP",
					Message:    respMsg,
					Payload:    &mappedJSONStr,
					StatusCode: &statusCode,
					Latency:    &latency,
					ProjectID:  project.ID,
				}
				database.DB.Create(&telemetryLog)
			}
		}
	} else {
		// Fallback to raw string parsing
		var parsedRaw interface{}
		json.Unmarshal(body, &parsedRaw)
		targetPayload = parsedRaw
	}

	targetPayloadJSONBytes, _ := json.Marshal(targetPayload)
	targetPayloadJSONStr := string(targetPayloadJSONBytes)

	// Run rule evaluation on webhook payload (using mapped payload if active)
	EvaluatePayloadRules(project.ID, targetPayloadJSONStr)

	// Broadcast real-time event
	ws.HubInstance.BroadcastToProject(project.ID, "webhookReceived", map[string]interface{}{
		"projectId": project.ID,
		"log": map[string]interface{}{
			"id":            logEntry.ID,
			"type":          logEntry.Type,
			"message":       logEntry.Message,
			"payload":       payloadStr,
			"timestamp":     logEntry.Timestamp,
			"parsedPayload": targetPayload,
			"isMapped":      hasMap,
		},
	})

	log.Printf("[Webhook] Received for project %s from %s %s", project.ID, ip, func() string {
		if hasMap {
			return "(Mapped)"
		}
		return ""
	}())

	return c.JSON(fiber.Map{"received": true, "timestamp": logEntry.Timestamp, "mapped": hasMap})
}

// WebhookGetMapping - GET /api/webhook-manage/mapping/:projectId
func WebhookGetMapping(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	var mapping database.WebhookMap
	if err := database.DB.Where("\"projectId\" = ?", projectID).First(&mapping).Error; err != nil {
		return c.JSON(fiber.Map{
			"projectId": projectID,
			"mappings":  "[]",
			"active":    false,
		})
	}

	return c.JSON(mapping)
}

// WebhookSaveMapping - POST /api/webhook-manage/mapping/:projectId
func WebhookSaveMapping(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	type MappingInput struct {
		Mappings interface{} `json:"mappings"`
		Active   *bool       `json:"active"`
	}

	var input MappingInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var mappingsStr string
	switch m := input.Mappings.(type) {
	case string:
		mappingsStr = m
	default:
		bs, _ := json.Marshal(m)
		mappingsStr = string(bs)
	}

	activeVal := true
	if input.Active != nil {
		activeVal = *input.Active
	}

	var mapping database.WebhookMap
	err := database.DB.Where("\"projectId\" = ?", projectID).First(&mapping).Error

	if err != nil {
		// Create new
		mapping = database.WebhookMap{
			ProjectID: projectID,
			Mappings:  mappingsStr,
			Active:    activeVal,
		}
		if err := database.DB.Create(&mapping).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create mapping config"})
		}
	} else {
		// Update existing
		mapping.Mappings = mappingsStr
		mapping.Active = activeVal
		if err := database.DB.Save(&mapping).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update mapping config"})
		}
	}

	return c.JSON(fiber.Map{"message": "Webhook schema mapping saved successfully", "data": mapping})
}

// WebhookDeleteMapping - DELETE /api/webhook-manage/mapping/:projectId
func WebhookDeleteMapping(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	if err := database.DB.Where("\"projectId\" = ?", projectID).Delete(&database.WebhookMap{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete mapping config"})
	}

	return c.JSON(fiber.Map{"message": "Webhook schema mapping deleted successfully"})
}
