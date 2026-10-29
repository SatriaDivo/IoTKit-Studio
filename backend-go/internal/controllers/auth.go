package controllers

import (
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/middleware"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Register(c *fiber.Ctx) error {
	var input RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Format data tidak valid"})
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	password := strings.TrimSpace(input.Password)
	name := strings.TrimSpace(input.Name)

	if email == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email wajib diisi"})
	}

	if !emailRegex.MatchString(email) {
		return c.Status(400).JSON(fiber.Map{"error": "Format email tidak valid"})
	}

	if len(password) < 8 {
		return c.Status(400).JSON(fiber.Map{"error": "Password minimal 8 karakter"})
	}

	// Check existing user case-insensitively
	var existing database.User
	if err := database.DB.Where("LOWER(email) = ?", email).First(&existing).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{"error": "Email sudah terdaftar. Silakan gunakan email lain atau login."})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengenkripsi password"})
	}

	var namePtr *string
	if name != "" {
		namePtr = &name
	}

	now := time.Now()
	user := database.User{
		Email:     email,
		Password:  string(hashed),
		Name:      namePtr,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Use transaction with advisory lock to eliminate race conditions on first-user admin (F-10)
	txErr := database.DB.Transaction(func(tx *gorm.DB) error {
		tx.Exec("SELECT pg_advisory_xact_lock(7421)")

		var existing database.User
		if err := tx.Where("LOWER(email) = ?", email).First(&existing).Error; err == nil {
			return fiber.NewError(fiber.StatusBadRequest, "Email sudah terdaftar. Silakan gunakan email lain atau login.")
		}

		var userCount int64
		if err := tx.Model(&database.User{}).Count(&userCount).Error; err != nil {
			return err
		}

		role := "operator"
		if userCount == 0 {
			role = "admin"
		}
		user.Role = role

		return tx.Create(&user).Error
	})

	if txErr != nil {
		if fiberErr, ok := txErr.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"error": fiberErr.Message})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mendaftarkan pengguna baru"})
	}

	token, _ := middleware.GenerateToken(user.ID)

	return c.Status(201).JSON(fiber.Map{
		"user": fiber.Map{
			"id":        user.ID,
			"email":     user.Email,
			"name":      user.Name,
			"role":      user.Role,
			"createdAt": user.CreatedAt,
			"updatedAt": user.UpdatedAt,
		},
		"token": token,
	})
}

func Login(c *fiber.Ctx) error {
	var input LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Format data tidak valid"})
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	password := input.Password

	if email == "" || password == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email dan password wajib diisi"})
	}

	var user database.User
	if err := database.DB.Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Email atau password tidak sesuai"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Email atau password tidak sesuai"})
	}

	token, _ := middleware.GenerateToken(user.ID)

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":        user.ID,
			"email":     user.Email,
			"name":      user.Name,
			"role":      user.Role,
			"createdAt": user.CreatedAt,
			"updatedAt": user.UpdatedAt,
		},
		"token": token,
	})
}

func GetMe(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var user database.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Pengguna tidak ditemukan"})
	}

	return c.JSON(fiber.Map{
		"id":        user.ID,
		"email":     user.Email,
		"name":      user.Name,
		"role":      user.Role,
		"createdAt": user.CreatedAt,
		"updatedAt": user.UpdatedAt,
	})
}

func GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var user database.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Pengguna tidak ditemukan"})
	}

	return c.JSON(fiber.Map{
		"id":        user.ID,
		"email":     user.Email,
		"name":      user.Name,
		"role":      user.Role,
		"createdAt": user.CreatedAt,
		"updatedAt": user.UpdatedAt,
	})
}

func UpdateProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(string)
	if !ok || userID == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Autentikasi diperlukan"})
	}

	var input struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Format data tidak valid"})
	}

	var user database.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Pengguna tidak ditemukan"})
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(input.Email))
	cleanName := strings.TrimSpace(input.Name)

	if cleanEmail == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email wajib diisi"})
	}

	if len(cleanEmail) > 255 || !emailRegex.MatchString(cleanEmail) {
		return c.Status(400).JSON(fiber.Map{"error": "Format email tidak valid"})
	}

	// Check case-insensitive collision if email changed (F-08, F-09)
	if cleanEmail != strings.ToLower(user.Email) {
		var existing database.User
		if err := database.DB.Where("LOWER(email) = ? AND id != ?", cleanEmail, userID).First(&existing).Error; err == nil {
			return c.Status(400).JSON(fiber.Map{"error": "Email sudah digunakan oleh akun lain"})
		}
	}

	user.Email = cleanEmail
	if cleanName != "" {
		user.Name = &cleanName
	}
	user.UpdatedAt = time.Now()

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal memperbarui profil pengguna"})
	}

	return c.JSON(fiber.Map{
		"message": "Profil berhasil diperbarui",
		"user": fiber.Map{
			"id":        user.ID,
			"email":     user.Email,
			"name":      user.Name,
			"role":      user.Role,
			"updatedAt": user.UpdatedAt,
		},
	})
}
