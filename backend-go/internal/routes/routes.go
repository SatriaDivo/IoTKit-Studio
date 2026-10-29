package routes

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"

	"iotkit-studio-go/internal/controllers"
	"iotkit-studio-go/internal/middleware"
)

func Setup(app *fiber.App) {
	api := app.Group("/api")

	// Rate Limiters (F-05, F-06)
	loginLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Terlalu banyak percobaan login. Silakan coba lagi setelah 1 menit.",
			})
		},
	})

	registerLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 15 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Terlalu banyak percobaan pendaftaran akun. Silakan coba lagi nanti.",
			})
		},
	})

	aiChatLimiter := limiter.New(limiter.Config{
		Max:        25,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			if userID, ok := c.Locals("userId").(string); ok && userID != "" {
				return userID
			}
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Batas frekuensi permintaan AI chat tercapai (maks 25 req/menit). Silakan tunggu sebentar.",
			})
		},
	})

	webhookLimiter := limiter.New(limiter.Config{
		Max:        60,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.Params("token") + "_" + c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Batas panggilan webhook tercapai (maks 60 req/menit per token).",
			})
		},
	})

	// Auth (public)
	auth := api.Group("/auth")
	auth.Post("/register", registerLimiter, controllers.Register)
	auth.Post("/login", loginLimiter, controllers.Login)
	auth.Get("/me", middleware.AuthMiddleware, controllers.GetMe)
	auth.Get("/profile", middleware.AuthMiddleware, controllers.GetProfile)
	auth.Put("/profile", middleware.AuthMiddleware, controllers.UpdateProfile)

	// Public webhook receiver (no auth, rate limited + size limited)
	api.All("/webhook/:token", webhookLimiter, controllers.WebhookReceive)

	// Protected routes
	protected := api.Use(middleware.AuthMiddleware)

	// Projects
	projects := protected.Group("/projects")
	projects.Get("/", controllers.GetProjects)
	projects.Get("/:id", controllers.GetProject)
	projects.Post("/", controllers.CreateProject)
	projects.Put("/:id", controllers.UpdateProject)
	projects.Delete("/:id", controllers.DeleteProject)

	// Payloads
	payloads := protected.Group("/payloads")
	payloads.Get("/project/:projectId", controllers.GetPayloadsByProject)
	payloads.Post("/", controllers.CreatePayload)
	payloads.Put("/:id", controllers.UpdatePayload)
	payloads.Delete("/:id", controllers.DeletePayload)

	// Datasets
	datasets := protected.Group("/datasets")
	datasets.Get("/", controllers.GetDatasets)
	datasets.Post("/upload", controllers.UploadDataset)
	datasets.Post("/generate", controllers.GenerateDataset)
	datasets.Get("/:id/preview", controllers.GetDatasetPreview)
	datasets.Get("/:id/download", controllers.DownloadDataset)
	datasets.Put("/:id/name", controllers.UpdateDatasetName)
	datasets.Delete("/:id", controllers.DeleteDataset)

	// Logs
	logs := protected.Group("/logs")
	logs.Get("/", controllers.GetLogs)
	logs.Get("/project/:projectId", controllers.GetLogsByProject)
	logs.Delete("/", controllers.DeleteLogs)
	logs.Delete("/project/:projectId/clear", controllers.ClearLogsByProject)

	// Simulations
	simulations := protected.Group("/simulations")
	simulations.Post("/start", controllers.StartSimulation)
	simulations.Post("/stop", controllers.StopSimulation)
	simulations.Get("/status/:projectId", controllers.GetSimulationStatus)
	simulations.Get("/stats", controllers.GetSimulationStats)

	// Alerts (auth required)
	alerts := protected.Group("/alerts")
	alerts.Get("/rules/project/:projectId", controllers.GetAlertRulesByProject)
	alerts.Post("/rules", controllers.CreateAlertRule)
	alerts.Put("/rules/:id", controllers.UpdateAlertRule)
	alerts.Delete("/rules/:id", controllers.DeleteAlertRule)
	alerts.Get("/history/project/:projectId", controllers.GetAlertHistoryByProject)
	alerts.Post("/history/clear/:projectId", controllers.ClearAlertHistoryByProject)

	// Settings (auth required)
	settings := protected.Group("/settings")
	settings.Get("/notifications", controllers.GetNotificationSettings)
	settings.Put("/notifications", controllers.UpdateNotificationSettings)
	settings.Get("/api-keys", controllers.GetApiKeys)
	settings.Post("/api-keys", controllers.CreateApiKey)
	settings.Delete("/api-keys/:id", controllers.DeleteApiKey)

	// Webhook Management (auth required)
	webhookManage := protected.Group("/webhook-manage")
	webhookManage.Post("/generate/:projectId", controllers.WebhookGenerate)
	webhookManage.Delete("/clear/:projectId", controllers.WebhookClear)
	webhookManage.Get("/history/:projectId", controllers.WebhookGetHistory)
	webhookManage.Get("/info/:projectId", controllers.WebhookGetInfo)
	webhookManage.Get("/mapping/:projectId", controllers.WebhookGetMapping)
	webhookManage.Post("/mapping/:projectId", controllers.WebhookSaveMapping)
	webhookManage.Delete("/mapping/:projectId", controllers.WebhookDeleteMapping)

	// AI Agent (auth required)
	aiAgent := protected.Group("/ai-agent")
	aiAgent.Get("/sessions", controllers.GetSessions)
	aiAgent.Get("/sessions/current", controllers.GetCurrentSession)
	aiAgent.Get("/sessions/:id", controllers.GetSessionByID)
	aiAgent.Post("/sessions", controllers.CreateSession)
	aiAgent.Delete("/sessions/:id", controllers.DeleteSession)
	aiAgent.Post("/chat", aiChatLimiter, controllers.Chat)
	aiAgent.Post("/execute", controllers.ExecuteAction)
	aiAgent.Get("/models", controllers.GetModels)
	aiAgent.Get("/usage", controllers.GetUsage)

	// PDF Reports (auth required)
	protected.Post("/reports/export", controllers.ExportPDFReport)

	// User Management (Admin only)
	users := protected.Group("/users", middleware.RequireAdmin)
	users.Get("/", controllers.GetUsers)
	users.Post("/", controllers.CreateUser)
	users.Put("/:id", controllers.UpdateUser)
	users.Post("/:id/reset-password", controllers.ResetUserPassword)
	users.Delete("/:id", controllers.DeleteUser)
}
