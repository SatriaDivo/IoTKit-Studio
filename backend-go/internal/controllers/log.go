package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"iotkit-studio-go/internal/database"
)

func GetLogs(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	sortOrder := c.Query("sort", "desc")
	projectID := c.Query("projectId")
	logType := c.Query("type")

	query := database.DB.Model(&database.Log{})

	if projectID != "" {
		query = query.Where("\"projectId\" = ?", projectID)
	}
	if logType != "" {
		query = query.Where("type = ?", logType)
	}

	if sortOrder == "asc" {
		query = query.Order("timestamp ASC")
	} else {
		query = query.Order("timestamp DESC")
	}

	var logs []database.Log
	query.Limit(limit).Find(&logs)

	return c.JSON(logs)
}

func DeleteLogs(c *fiber.Ctx) error {
	projectID := c.Query("projectId")

	query := database.DB
	if projectID != "" {
		query = query.Where("\"projectId\" = ?", projectID)
	}
	query.Delete(&database.Log{})

	return c.JSON(fiber.Map{"message": "Logs cleared"})
}
