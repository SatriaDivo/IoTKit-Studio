package controllers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"

	"iotkit-studio-go/internal/database"
)

func GetPayloadsByProject(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var payloads []database.Payload
	database.DB.Joins("JOIN \"Project\" ON \"Payload\".\"projectId\" = \"Project\".\"id\"").
		Where("\"Payload\".\"projectId\" = ? AND \"Project\".\"userId\" = ?", projectID, userID).
		Order("\"Payload\".\"createdAt\" DESC").Find(&payloads)

	return c.JSON(payloads)
}

type PayloadInput struct {
	Name      string      `json:"name"`
	Structure interface{} `json:"structure"`
	ProjectID string      `json:"projectId"`
}

func CreatePayload(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var input PayloadInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Verify project ownership
	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", input.ProjectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	var structureStr string
	switch v := input.Structure.(type) {
	case string:
		structureStr = v
	default:
		bytes, err := json.Marshal(v)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid payload structure format"})
		}
		structureStr = string(bytes)
	}

	payload := database.Payload{
		Name:      input.Name,
		Structure: structureStr,
		ProjectID: input.ProjectID,
	}

	if err := database.DB.Create(&payload).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create payload"})
	}

	return c.Status(201).JSON(payload)
}

func UpdatePayload(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userId").(string)

	var payload database.Payload
	if err := database.DB.Joins("JOIN \"Project\" ON \"Payload\".\"projectId\" = \"Project\".\"id\"").
		Where("\"Payload\".id = ? AND \"Project\".\"userId\" = ?", id, userID).
		First(&payload).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Payload not found"})
	}

	var input PayloadInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	var structureStr string
	switch v := input.Structure.(type) {
	case string:
		structureStr = v
	default:
		bytes, err := json.Marshal(v)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid payload structure format"})
		}
		structureStr = string(bytes)
	}

	database.DB.Model(&payload).Updates(map[string]interface{}{
		"name":      input.Name,
		"structure": structureStr,
	})

	database.DB.First(&payload, "id = ?", id)
	return c.JSON(payload)
}

func DeletePayload(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userId").(string)

	var payload database.Payload
	if err := database.DB.Joins("JOIN \"Project\" ON \"Payload\".\"projectId\" = \"Project\".\"id\"").
		Where("\"Payload\".id = ? AND \"Project\".\"userId\" = ?", id, userID).
		First(&payload).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Payload not found"})
	}

	database.DB.Delete(&payload)
	return c.JSON(fiber.Map{"message": "Payload deleted"})
}
