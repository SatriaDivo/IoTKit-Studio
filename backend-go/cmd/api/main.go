package main

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"iotkit-studio-go/internal/config"
	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/routes"
	"iotkit-studio-go/internal/services"
	ws "iotkit-studio-go/internal/websocket"
)

func main() {
	// Load configuration
	config.Load()

	// Connect to database
	database.Connect()

	// Start Dynamic Token Refresh Worker
	services.StartTokenRefreshWorker()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		BodyLimit:    50 * 1024 * 1024, // 50MB
		ServerHeader: "IoTKit-Studio-Go",
		AppName:      "IoTKit Studio Backend (Go)",
	})

	// Middleware
	app.Use(recover.New())
	app.Use(fiberlogger.New(fiberlogger.Config{
		Format: "${method} ${path} ${status} ${latency} - ${bytesSent}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: config.AppConfig.CORSOrigin,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
	}))

	// Setup WebSocket hub for real-time updates
	ws.SetupWebSocket(app)

	// Setup REST API routes
	routes.Setup(app)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"engine":  "Go/Fiber",
			"version": "1.0.0",
		})
	})

	// Start server
	addr := fmt.Sprintf(":%s", config.AppConfig.Port)
	log.Printf("🚀 IoTKit Studio Go Backend running on http://localhost%s", addr)
	log.Printf("📡 WebSocket available at ws://localhost%s/ws", addr)
	log.Fatal(app.Listen(addr))
}
