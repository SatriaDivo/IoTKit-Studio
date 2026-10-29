package middleware

import (
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"

	"iotkit-studio-go/internal/config"
	"iotkit-studio-go/internal/database"
)

const TokenIssuer = "iotkit-studio"

var (
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrInvalidClaims      = errors.New("invalid token claims")
	ErrInvalidIssuer      = errors.New("invalid token issuer")
	ErrInvalidAlgorithm   = errors.New("unexpected signing algorithm")
)

// VerifyTokenWithRole validates a JWT token string and extracts userID and user role.
// Enforces HMAC-SHA256 method, issuer check, and expiration check.
func VerifyTokenWithRole(tokenStr string) (string, string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidAlgorithm
		}
		return []byte(config.AppConfig.JWTSecret), nil
	}, jwt.WithValidMethods([]string{"HS256"}))

	if err != nil || !token.Valid {
		return "", "", ErrInvalidToken
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", ErrInvalidClaims
	}

	// Validate issuer if present in claims
	if iss, exists := claims["iss"]; exists && iss != TokenIssuer {
		return "", "", ErrInvalidIssuer
	}

	userID, ok := claims["userId"].(string)
	if !ok || userID == "" {
		return "", "", ErrInvalidClaims
	}

	role, _ := claims["role"].(string)
	if role == "" {
		// Fallback to database lookup if role was not in token claims
		var user database.User
		if err := database.DB.Select("role").First(&user, "id = ?", userID).Error; err == nil {
			role = user.Role
		} else {
			role = "operator"
		}
	}

	return userID, role, nil
}

func AuthMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(401).JSON(fiber.Map{"error": "No token provided"})
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenStr == authHeader || strings.TrimSpace(tokenStr) == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid token format"})
	}

	userID, role, err := VerifyTokenWithRole(tokenStr)
	if err != nil || userID == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid or expired token"})
	}

	c.Locals("userId", userID)
	c.Locals("userRole", role)
	return c.Next()
}

func RequireAdmin(c *fiber.Ctx) error {
	role, _ := c.Locals("userRole").(string)
	if role == "admin" {
		return c.Next()
	}

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

	c.Locals("userRole", user.Role)
	return c.Next()
}

func GenerateToken(userID string) (string, error) {
	var user database.User
	role := "operator"
	if err := database.DB.Select("role").First(&user, "id = ?", userID).Error; err == nil && user.Role != "" {
		role = user.Role
	}

	claims := jwt.MapClaims{
		"userId": userID,
		"role":   role,
		"iss":    TokenIssuer,
		"iat":    time.Now().Unix(),
		"exp":    time.Now().Add(time.Duration(config.AppConfig.JWTExpiresHours) * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}
