package controllers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"iotkit-studio-go/internal/database"
)

// GET /api/alerts/rules/project/:projectId
func GetAlertRulesByProject(c *fiber.Ctx) error {
	projectID := c.Params("projectId")

	var rules []database.AlertRule
	if err := database.DB.Where("\"projectId\" = ?", projectID).Order("createdAt DESC").Find(&rules).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch alert rules"})
	}

	return c.JSON(rules)
}

// POST /api/alerts/rules
func CreateAlertRule(c *fiber.Ctx) error {
	var input struct {
		Name      string `json:"name"`
		ProjectID string `json:"projectId"`
		Field     string `json:"field"`
		Operator  string `json:"operator"`
		Value     string `json:"value"`
		Severity  string `json:"severity"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input data"})
	}

	if input.Name == "" || input.ProjectID == "" || input.Field == "" || input.Operator == "" || input.Value == "" {
		return c.Status(400).JSON(fiber.Map{"error": "All fields are required"})
	}

	rule := database.AlertRule{
		Name:      input.Name,
		ProjectID: input.ProjectID,
		Field:     input.Field,
		Operator:  input.Operator,
		Value:     input.Value,
		Severity:  input.Severity,
		IsActive:  true,
	}

	if err := database.DB.Create(&rule).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create alert rule"})
	}

	return c.Status(201).JSON(rule)
}

// PUT /api/alerts/rules/:id
func UpdateAlertRule(c *fiber.Ctx) error {
	id := c.Params("id")

	var input struct {
		Name     *string `json:"name"`
		Field    *string `json:"field"`
		Operator *string `json:"operator"`
		Value    *string `json:"value"`
		Severity *string `json:"severity"`
		IsActive *bool   `json:"isActive"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input data"})
	}

	var rule database.AlertRule
	if err := database.DB.First(&rule, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Alert rule not found"})
	}

	if input.Name != nil {
		rule.Name = *input.Name
	}
	if input.Field != nil {
		rule.Field = *input.Field
	}
	if input.Operator != nil {
		rule.Operator = *input.Operator
	}
	if input.Value != nil {
		rule.Value = *input.Value
	}
	if input.Severity != nil {
		rule.Severity = *input.Severity
	}
	if input.IsActive != nil {
		rule.IsActive = *input.IsActive
	}

	rule.UpdatedAt = time.Now()

	if err := database.DB.Save(&rule).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update alert rule"})
	}

	return c.JSON(rule)
}

// DELETE /api/alerts/rules/:id
func DeleteAlertRule(c *fiber.Ctx) error {
	id := c.Params("id")

	var rule database.AlertRule
	if err := database.DB.First(&rule, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Alert rule not found"})
	}

	if err := database.DB.Delete(&rule).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete alert rule"})
	}

	return c.JSON(fiber.Map{"message": "Alert rule deleted successfully"})
}

// GET /api/alerts/history/project/:projectId
func GetAlertHistoryByProject(c *fiber.Ctx) error {
	projectID := c.Params("projectId")

	var history []database.AlertLog
	if err := database.DB.Where("\"projectId\" = ?", projectID).Order("timestamp DESC").Find(&history).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch alert history"})
	}

	return c.JSON(history)
}

// POST /api/alerts/history/clear/:projectId
func ClearAlertHistoryByProject(c *fiber.Ctx) error {
	projectID := c.Params("projectId")

	if err := database.DB.Where("\"projectId\" = ?", projectID).Delete(&database.AlertLog{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to clear alert history"})
	}

	return c.JSON(fiber.Map{"message": "Alert history cleared successfully"})
}
