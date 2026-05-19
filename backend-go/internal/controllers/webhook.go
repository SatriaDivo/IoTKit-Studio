package controllers

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"iotkit-studio-go/internal/database"
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

	token := ""
	if project.WebhookToken != nil && *project.WebhookToken != "" {
		token = *project.WebhookToken
	} else {
		token = uuid.New().String()
	}

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

	// Also delete webhook logs for this project
	database.DB.Where("\"projectId\" = ? AND type = ?", projectID, "webhook").Delete(&database.Log{})

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

	// Broadcast real-time event
	var parsedPayload interface{}
	json.Unmarshal(body, &parsedPayload)

	ws.HubInstance.BroadcastToProject(project.ID, "webhookReceived", map[string]interface{}{
		"projectId": project.ID,
		"log": map[string]interface{}{
			"id":             logEntry.ID,
			"type":           logEntry.Type,
			"message":        logEntry.Message,
			"payload":        payloadStr,
			"timestamp":      logEntry.Timestamp,
			"parsedPayload":  parsedPayload,
		},
	})

	log.Printf("[Webhook] Received for project %s from %s", project.ID, ip)
	return c.JSON(fiber.Map{"received": true, "timestamp": logEntry.Timestamp})
}
