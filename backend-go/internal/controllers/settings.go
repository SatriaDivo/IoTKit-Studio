package controllers

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// In-memory or fallback notification settings (mocked exactly to match frontend state)
func GetNotificationSettings(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"emailNotifications": true,
		"simulationAlerts":   true,
		"errorAlerts":        true,
		"weeklyReport":       false,
	})
}

func UpdateNotificationSettings(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"message": "Notification settings updated successfully",
	})
}

// In-memory or fallback API Keys list (mocked exactly to match frontend state)
func GetApiKeys(c *fiber.Ctx) error {
	return c.JSON([]interface{}{})
}

func CreateApiKey(c *fiber.Ctx) error {
	var input struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	return c.JSON(fiber.Map{
		"id":        "mock-key-id-" + time.Now().Format("20060102150405"),
		"name":      input.Name,
		"key":       "iotkit_sk_mock_" + time.Now().Format("20060102150405") + "_xyz",
		"createdAt": time.Now(),
	})
}

func DeleteApiKey(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"message": "API key deleted successfully",
	})
}
