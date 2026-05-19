package controllers

import (
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/middleware"
)

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
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Check existing user
	var existing database.User
	if err := database.DB.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{"error": "Email already exists"})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	user := database.User{
		Email:    input.Email,
		Password: string(hashed),
		Name:     &input.Name,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user"})
	}

	token, _ := middleware.GenerateToken(user.ID)

	return c.Status(201).JSON(fiber.Map{
		"user": fiber.Map{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
		"token": token,
	})
}

func Login(c *fiber.Ctx) error {
	var input LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	var user database.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	token, _ := middleware.GenerateToken(user.ID)

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
		"token": token,
	})
}

func GetMe(c *fiber.Ctx) error {
	userID := c.Locals("userId").(string)

	var user database.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(fiber.Map{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
	})
}
