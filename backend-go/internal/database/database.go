package database

import (
	"log"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"

	"iotkit-studio-go/internal/config"
)

var DB *gorm.DB

type camelCaseNamer struct {
	schema.NamingStrategy
}

func (c camelCaseNamer) ColumnName(table, column string) string {
	if column == "ID" {
		return "id"
	}
	if strings.HasSuffix(column, "ID") {
		return strings.ToLower(column[:len(column)-2]) + "Id"
	}
	if column == "SSLEnabled" {
		return "sslEnabled"
	}
	if len(column) > 0 {
		return strings.ToLower(column[:1]) + column[1:]
	}
	return column
}

func Connect() {
	var err error
	DB, err = gorm.Open(postgres.Open(config.AppConfig.DatabaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
		NamingStrategy: camelCaseNamer{
			NamingStrategy: schema.NamingStrategy{
				SingularTable: true,
			},
		},
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, _ := DB.DB()
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("[DB] Connected to PostgreSQL with camelCase column naming")
}
