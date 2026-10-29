package controllers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"iotkit-studio-go/internal/database"
)

func GetLogs(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	sortOrder := c.Query("sort", "desc")
	projectID := c.Query("projectId")
	logType := c.Query("type")

	query := database.DB.Model(&database.Log{}).
		Joins("JOIN \"Project\" ON \"Log\".\"projectId\" = \"Project\".\"id\"").
		Where("\"Project\".\"userId\" = ?", userID)

	if projectID != "" {
		query = query.Where("\"Log\".\"projectId\" = ?", projectID)
	}
	if logType != "" {
		query = query.Where("\"Log\".\"type\" = ?", logType)
	}

	if sortOrder == "asc" {
		query = query.Order("\"Log\".\"timestamp\" ASC")
	} else {
		query = query.Order("\"Log\".\"timestamp\" DESC")
	}

	var logs []database.Log
	query.Preload("Project", func(db *gorm.DB) *gorm.DB {
		return db.Select("\"id\", \"name\", \"protocol\"")
	}).Limit(limit).Find(&logs)

	return c.JSON(logs)
}

func GetLogsByProject(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	logType := c.Query("type")

	query := database.DB.Model(&database.Log{}).
		Joins("JOIN \"Project\" ON \"Log\".\"projectId\" = \"Project\".\"id\"").
		Where("\"Log\".\"projectId\" = ? AND \"Project\".\"userId\" = ?", projectID, userID)
	if logType != "" {
		query = query.Where("\"Log\".\"type\" = ?", logType)
	}

	var logs []database.Log
	query.Preload("Project", func(db *gorm.DB) *gorm.DB {
		return db.Select("\"id\", \"name\", \"protocol\"")
	}).Order("\"Log\".\"timestamp\" DESC").Limit(limit).Find(&logs)

	return c.JSON(logs)
}

func DeleteLogs(c *fiber.Ctx) error {
	projectID := c.Query("projectId")
	userID := c.Locals("userId").(string)

	if projectID != "" {
		var project database.Project
		if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
		}
		database.DB.Where("\"projectId\" = ?", projectID).Delete(&database.Log{})
	} else {
		// Only delete logs belonging to user's projects
		var userProjectIDs []string
		database.DB.Model(&database.Project{}).Where("\"userId\" = ?", userID).Pluck("id", &userProjectIDs)
		if len(userProjectIDs) > 0 {
			database.DB.Where("\"projectId\" IN ?", userProjectIDs).Delete(&database.Log{})
		}
	}

	return c.JSON(fiber.Map{"message": "Logs cleared"})
}

func ClearLogsByProject(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	if err := database.DB.Where("\"projectId\" = ?", projectID).Delete(&database.Log{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to clear logs"})
	}

	return c.JSON(fiber.Map{"message": "Project logs cleared successfully"})
}
