package controllers

import (
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

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

	var userCount int64
	database.DB.Model(&database.User{}).Count(&userCount)
	role := "operator"
	if userCount == 0 {
		role = "admin"
	}

	now := time.Now()
	user := database.User{
		Email:     email,
		Password:  string(hashed),
		Name:      namePtr,
		Role:      role,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := database.DB.Create(&user).Error; err != nil {
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
	userID := c.Locals("userId").(string)

	var input struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	var user database.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	// Update fields
	user.Name = &input.Name
	user.Email = input.Email

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	return c.JSON(fiber.Map{
		"message": "Profile updated successfully",
		"user": fiber.Map{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
	})
}
