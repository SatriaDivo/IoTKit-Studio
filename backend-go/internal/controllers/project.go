package controllers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"iotkit-studio-go/internal/database"
	ws "iotkit-studio-go/internal/websocket"
)

func GetProjects(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var projects []database.Project
	database.DB.Where("\"userId\" = ?", userID).Order("\"createdAt\" DESC").Find(&projects)

	return c.JSON(projects)
}

func GetProject(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", id, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	return c.JSON(project)
}

type ProjectInput struct {
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	Protocol      string  `json:"protocol"`
	Host          string  `json:"host"`
	Port          *int    `json:"port"`
	Endpoint      *string `json:"endpoint"`
	Topic         *string `json:"topic"`
	AuthToken     *string `json:"authToken"`
	Headers       *string `json:"headers"`
	Username      *string `json:"username"`
	Password      *string `json:"password"`
	SSLEnabled    bool    `json:"sslEnabled"`
	AutoReconnect bool    `json:"autoReconnect"`
}

func CreateProject(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var input ProjectInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	project := database.Project{
		Name:          input.Name,
		Description:   input.Description,
		Protocol:      input.Protocol,
		Host:          input.Host,
		Port:          input.Port,
		Endpoint:      input.Endpoint,
		Topic:         input.Topic,
		AuthToken:     input.AuthToken,
		Headers:       input.Headers,
		Username:      input.Username,
		Password:      input.Password,
		SSLEnabled:    input.SSLEnabled,
		AutoReconnect: input.AutoReconnect,
		UserID:        userID,
	}

	if err := database.DB.Create(&project).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create project"})
	}

	ws.HubInstance.Broadcast("projects", "project:created", project)
	ws.HubInstance.Broadcast("global", "project:created", project)

	return c.Status(201).JSON(project)
}

func UpdateProject(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", id, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	var input ProjectInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	now := time.Now()
	database.DB.Model(&project).Updates(map[string]interface{}{
		"name":          input.Name,
		"description":   input.Description,
		"protocol":      input.Protocol,
		"host":          input.Host,
		"port":          input.Port,
		"endpoint":      input.Endpoint,
		"topic":         input.Topic,
		"authToken":     input.AuthToken,
		"headers":       input.Headers,
		"username":      input.Username,
		"password":      input.Password,
		"sslEnabled":    input.SSLEnabled,
		"autoReconnect": input.AutoReconnect,
		"lastActivity":  &now,
	})

	database.DB.First(&project, "id = ?", id)
	ws.HubInstance.Broadcast("projects", "project:updated", project)
	ws.HubInstance.Broadcast("global", "project:updated", project)
	return c.JSON(project)
}

func DeleteProject(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userId").(string)

	result := database.DB.Where("id = ? AND \"userId\" = ?", id, userID).Delete(&database.Project{})
	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	ws.HubInstance.Broadcast("projects", "project:deleted", map[string]interface{}{"id": id})
	ws.HubInstance.Broadcast("global", "project:deleted", map[string]interface{}{"id": id})

	return c.JSON(fiber.Map{"message": "Project deleted"})
}
