package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	Host            string
	DatabaseURL     string
	JWTSecret       string
	JWTExpiresHours int
	CORSOrigin      string
	UploadDir       string
}

var AppConfig Config

func Load() {
	// Try loading .env from current directory, backend-go/.env, or root .env
	for _, envFile := range []string{".env", "backend-go/.env", "../.env"} {
		if err := godotenv.Load(envFile); err == nil {
			break
		}
	}

	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) < 32 || jwtSecret == "secret" || jwtSecret == "your-super-secret-jwt-key-change-this-in-production" {
		log.Fatal("FATAL SECURITY ERROR (F-01): JWT_SECRET must be configured with at least 32 characters of high-entropy secret. Weak defaults and placeholders are strictly prohibited.")
	}

	AppConfig = Config{
		Port:            getEnv("PORT", "4000"),
		Host:            getEnv("HOST", "localhost"),
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		JWTSecret:       jwtSecret,
		JWTExpiresHours: getEnvInt("JWT_EXPIRES_HOURS", 168),
		CORSOrigin:      getEnv("CORS_ORIGIN", "http://localhost:3000"),
		UploadDir:       getEnv("UPLOAD_DIR", "./uploads/datasets"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}
