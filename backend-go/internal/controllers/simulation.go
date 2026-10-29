package controllers

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/security"
	"iotkit-studio-go/internal/simulation"
)

func StartSimulation(c *fiber.Ctx) error {
	var body struct {
		ProjectID        string                    `json:"projectId"`
		Interval         int                       `json:"interval"`
		BatchSize        int                       `json:"batchSize"`
		PayloadStructure []simulation.PayloadField `json:"payloadStructure"`
		SwarmMode        bool                      `json:"swarmMode"`
		SwarmCount       int                       `json:"swarmCount"`
		Stages           []simulation.LoadTestStage `json:"stages"`
		ChaosMode        bool                      `json:"chaosMode"`
		ChaosProbability float64                   `json:"chaosProbability"`
		ChaosFields      []string                  `json:"chaosFields"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	userID := c.Locals("userId").(string)

	// Fetch project with ownership verification
	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", body.ProjectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	// SSRF check on target host (F-07)
	if err := security.ValidateTargetHost(project.Host); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Simulasi ditolak karena host tujuan diblokir untuk keamanan: " + err.Error(),
		})
	}

	if body.Interval == 0 {
		body.Interval = 5000
	}
	if body.BatchSize == 0 {
		body.BatchSize = 1
	}

	cfg := simulation.SimulationConfig{
		ProjectID:        body.ProjectID,
		Interval:         body.Interval,
		BatchSize:        body.BatchSize,
		PayloadStructure: body.PayloadStructure,
		SwarmMode:        body.SwarmMode,
		SwarmCount:       body.SwarmCount,
		Stages:           body.Stages,
		ChaosMode:        body.ChaosMode,
		ChaosProbability: body.ChaosProbability,
		ChaosFields:      body.ChaosFields,
	}

	if err := simulation.Manager.Start(cfg, &project); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	// Update simulation record in DB
	now := time.Now()
	stagesJSON, _ := json.Marshal(body.Stages)
	stagesStr := string(stagesJSON)

	var sim database.Simulation
	result := database.DB.Where("\"projectId\" = ?", body.ProjectID).First(&sim)
	if result.Error != nil {
		sim = database.Simulation{
			ProjectID: body.ProjectID,
			Status:    "running",
			Interval:  body.Interval,
			BatchSize: body.BatchSize,
			SwarmMode: body.SwarmMode,
			SwarmCount: body.SwarmCount,
			Stages:    &stagesStr,
			StartedAt: &now,
		}
		database.DB.Create(&sim)
	} else {
		database.DB.Model(&sim).Updates(map[string]interface{}{
			"status":     "running",
			"interval":   body.Interval,
			"batchSize":  body.BatchSize,
			"swarmMode":  body.SwarmMode,
			"swarmCount": body.SwarmCount,
			"stages":     &stagesStr,
			"startedAt":  &now,
		})
	}

	return c.JSON(fiber.Map{"message": "Simulation started"})
}

func StopSimulation(c *fiber.Ctx) error {
	var body struct {
		ProjectID string `json:"projectId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	userID := c.Locals("userId").(string)
	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", body.ProjectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	finalStats := simulation.Manager.GetStats(body.ProjectID)
	simulation.Manager.Stop(body.ProjectID)

	now := time.Now()
	updates := map[string]interface{}{
		"status":    "idle",
		"stoppedAt": &now,
	}
	if finalStats != nil {
		updates["totalSent"] = gorm.Expr("\"totalSent\" + ?", finalStats.TotalSent)
		updates["successCount"] = gorm.Expr("\"successCount\" + ?", finalStats.SuccessCount)
		updates["errorCount"] = gorm.Expr("\"errorCount\" + ?", finalStats.ErrorCount)
	}

	database.DB.Model(&database.Simulation{}).
		Where("\"projectId\" = ?", body.ProjectID).
		Updates(updates)

	return c.JSON(fiber.Map{"message": "Simulation stopped"})
}

func GetSimulationStatus(c *fiber.Ctx) error {
	projectID := c.Params("projectId")
	userID := c.Locals("userId").(string)

	var project database.Project
	if err := database.DB.Where("id = ? AND \"userId\" = ?", projectID, userID).First(&project).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Project not found"})
	}

	running := simulation.Manager.IsRunning(projectID)
	stats := simulation.Manager.GetStats(projectID)

	var sim database.Simulation
	database.DB.Where("\"projectId\" = ?", projectID).First(&sim)

	status := "idle"
	if running {
		status = "running"
	}

	effectiveStats := stats
	if effectiveStats == nil {
		effectiveTotal := int64(sim.TotalSent)
		effectiveSuccess := int64(sim.SuccessCount)
		effectiveError := int64(sim.ErrorCount)

		// Fallback to logged counts if simulation table hasn't accumulated numbers
		if effectiveTotal == 0 {
			var logCount int64
			database.DB.Model(&database.Log{}).Where("\"projectId\" = ?", projectID).Count(&logCount)
			if logCount > 0 {
				var errCount int64
				database.DB.Model(&database.Log{}).Where("\"projectId\" = ? AND (type = ? OR \"statusCode\" >= 400)", projectID, "error").Count(&errCount)
				effectiveTotal = logCount
				effectiveError = errCount
				effectiveSuccess = logCount - errCount
			}
		}

		effectiveStats = &simulation.SimulationStats{
			TotalSent:    effectiveTotal,
			SuccessCount: effectiveSuccess,
			ErrorCount:   effectiveError,
		}
	}

	return c.JSON(fiber.Map{
		"status":    status,
		"running":   running,
		"isRunning": running,
		"stats":     effectiveStats,
		"simulation": fiber.Map{
			"totalSent":    sim.TotalSent,
			"successCount": sim.SuccessCount,
			"errorCount":   sim.ErrorCount,
		},
	})
}

func GetSimulationStats(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var stats struct {
		TotalSent    int64 `json:"totalSent" gorm:"column:totalSent"`
		SuccessCount int64 `json:"successCount" gorm:"column:successCount"`
		ErrorCount   int64 `json:"errorCount" gorm:"column:errorCount"`
	}

	// Query sum from database filtered by user's projects
	query := database.DB.Model(&database.Simulation{}).
		Joins("JOIN \"Project\" ON \"Simulation\".\"projectId\" = \"Project\".\"id\"").
		Where("\"Project\".\"userId\" = ?", userID)

	err := query.Select("COALESCE(SUM(\"Simulation\".\"totalSent\"), 0) as \"totalSent\", COALESCE(SUM(\"Simulation\".\"successCount\"), 0) as \"successCount\", COALESCE(SUM(\"Simulation\".\"errorCount\"), 0) as \"errorCount\"").
		Scan(&stats).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Also add stats of currently running in-memory simulations for this user's projects
	var userProjects []database.Project
	database.DB.Where("\"userId\" = ?", userID).Find(&userProjects)
	for _, p := range userProjects {
		if s := simulation.Manager.GetStats(p.ID); s != nil {
			stats.TotalSent += s.TotalSent
			stats.SuccessCount += s.SuccessCount
			stats.ErrorCount += s.ErrorCount
		}
	}

	// If totalSent is 0, fallback to counting actual telemetry logs for user's projects
	if stats.TotalSent == 0 {
		var logCount int64
		database.DB.Model(&database.Log{}).
			Joins("JOIN \"Project\" ON \"Log\".\"projectId\" = \"Project\".\"id\"").
			Where("\"Project\".\"userId\" = ?", userID).
			Count(&logCount)
		if logCount > 0 {
			var errLogCount int64
			database.DB.Model(&database.Log{}).
				Joins("JOIN \"Project\" ON \"Log\".\"projectId\" = \"Project\".\"id\"").
				Where("\"Project\".\"userId\" = ? AND (\"Log\".\"type\" = ? OR \"Log\".\"statusCode\" >= 400)", userID, "error").
				Count(&errLogCount)

			stats.TotalSent = logCount
			stats.ErrorCount = errLogCount
			stats.SuccessCount = logCount - errLogCount
		}
	}

	return c.JSON(stats)
}
