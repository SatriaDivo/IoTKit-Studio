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

	// AutoMigrate new AlertRule, AlertLog, WebhookMap, User, and Dataset schema
	err = DB.AutoMigrate(&AlertRule{}, &AlertLog{}, &WebhookMap{}, &User{}, &Dataset{})
	if err != nil {
		log.Printf("Failed to run GORM auto-migration: %v", err)
	}

	// Update Dataset unique index for multi-tenancy
	DB.Exec("ALTER TABLE \"Dataset\" DROP CONSTRAINT IF EXISTS \"Dataset_moduleName_fileName_key\"")
	DB.Exec("DROP INDEX IF EXISTS \"Dataset_moduleName_fileName_key\"")
	DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS \"Dataset_userId_moduleName_fileName_idx\" ON \"Dataset\" (\"userId\", \"moduleName\", \"fileName\")")

	// Ensure any legacy users without a role receive 'operator'
	DB.Model(&User{}).Where("role IS NULL OR role = ''").Update("role", "operator")

	// If no admin user exists, automatically promote the primary/first user to admin
	var adminCount int64
	DB.Model(&User{}).Where("role = ?", "admin").Count(&adminCount)
	if adminCount == 0 {
		var firstUser User
		if err := DB.Order("\"createdAt\" asc").First(&firstUser).Error; err == nil {
			DB.Model(&firstUser).Update("role", "admin")
			log.Printf("[DB] Automatically designated first user '%s' as admin", firstUser.Email)
		}
	}

	sqlDB, _ := DB.DB()
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("[DB] Connected to PostgreSQL with camelCase column naming")
}
