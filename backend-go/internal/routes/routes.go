package routes

import (
	"github.com/gofiber/fiber/v2"

	"iotkit-studio-go/internal/controllers"
	"iotkit-studio-go/internal/middleware"
)

func Setup(app *fiber.App) {
	api := app.Group("/api")

	// Auth (public)
	auth := api.Group("/auth")
	auth.Post("/register", controllers.Register)
	auth.Post("/login", controllers.Login)
	auth.Get("/me", middleware.AuthMiddleware, controllers.GetMe)

	// Public webhook receiver (no auth)
	api.All("/webhook/:token", controllers.WebhookReceive)

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
	datasets.Get("/:id/preview", controllers.GetDatasetPreview)
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

	// Webhook Management (auth required)
	webhookManage := protected.Group("/webhook-manage")
	webhookManage.Post("/generate/:projectId", controllers.WebhookGenerate)
	webhookManage.Delete("/clear/:projectId", controllers.WebhookClear)
	webhookManage.Get("/history/:projectId", controllers.WebhookGetHistory)
	webhookManage.Get("/info/:projectId", controllers.WebhookGetInfo)

	// AI Agent (auth required)
	aiAgent := protected.Group("/ai-agent")
	aiAgent.Get("/sessions", controllers.GetSessions)
	aiAgent.Get("/sessions/current", controllers.GetCurrentSession)
	aiAgent.Post("/sessions", controllers.CreateSession)
	aiAgent.Delete("/sessions/:id", controllers.DeleteSession)
	aiAgent.Post("/chat", controllers.Chat)
	aiAgent.Post("/execute", controllers.ExecuteAction)
	aiAgent.Get("/models", controllers.GetModels)
	aiAgent.Get("/usage", controllers.GetUsage)
}
