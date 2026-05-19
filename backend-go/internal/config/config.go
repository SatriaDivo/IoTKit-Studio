package config

import (
	"os"
	"strconv"

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
	godotenv.Load()

	AppConfig = Config{
		Port:            getEnv("PORT", "4000"),
		Host:            getEnv("HOST", "localhost"),
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		JWTSecret:       getEnv("JWT_SECRET", "secret"),
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
