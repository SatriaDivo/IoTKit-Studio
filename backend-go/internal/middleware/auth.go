package middleware

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"iotkit-studio-go/internal/config"
	"iotkit-studio-go/internal/database"
)

func AuthMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(401).JSON(fiber.Map{"error": "No token provided"})
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenStr == authHeader {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid token format"})
	}

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.AppConfig.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid or expired token"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid token claims"})
	}

	c.Locals("userId", claims["userId"])
	return c.Next()
}

func RequireAdmin(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(string)
	if !ok || userID == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var user database.User
	if err := database.DB.Select("role").First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "User record not found"})
	}

	if user.Role != "admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Administrator role required"})
	}

	return c.Next()
}

func GenerateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"userId": userID,
		"exp":    time.Now().Add(time.Duration(config.AppConfig.JWTExpiresHours) * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}
