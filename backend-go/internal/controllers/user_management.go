package controllers

import (
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"iotkit-studio-go/internal/database"
)

var userEmailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

type UserResponseDTO struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         *string   `json:"name"`
	Role         string    `json:"role"`
	ProjectCount int64     `json:"projectCount"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CreateUserInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"` // "admin" or "operator"
}

type UpdateUserInput struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"` // "admin" or "operator"
}

type ResetPasswordInput struct {
	NewPassword string `json:"newPassword"`
}

// GetUsers returns all users in the system with their project counts (Admin only)
func GetUsers(c *fiber.Ctx) error {
	var users []database.User
	if err := database.DB.Order("\"createdAt\" desc").Find(&users).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user list"})
	}

	result := make([]UserResponseDTO, len(users))
	for i, u := range users {
		var pCount int64
		database.DB.Model(&database.Project{}).Where("\"userId\" = ?", u.ID).Count(&pCount)

		role := u.Role
		if role == "" {
			role = "operator"
		}

		result[i] = UserResponseDTO{
			ID:           u.ID,
			Email:        u.Email,
			Name:         u.Name,
			Role:         role,
			ProjectCount: pCount,
			CreatedAt:    u.CreatedAt,
			UpdatedAt:    u.UpdatedAt,
		}
	}

	return c.JSON(result)
}

// CreateUser provisions a new operator or admin account (Admin only)
func CreateUser(c *fiber.Ctx) error {
	var input CreateUserInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload format"})
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	password := strings.TrimSpace(input.Password)
	name := strings.TrimSpace(input.Name)
	role := strings.ToLower(strings.TrimSpace(input.Role))

	if email == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Email is required"})
	}
	if !userEmailRegex.MatchString(email) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid email address format"})
	}
	if len(password) < 6 {
		return c.Status(400).JSON(fiber.Map{"error": "Password must be at least 6 characters long"})
	}

	if role != "admin" && role != "operator" {
		role = "operator"
	}

	// Check email uniqueness
	var existing database.User
	if err := database.DB.Where("LOWER(email) = ?", email).First(&existing).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{"error": "An account with this email address already exists"})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to encrypt password"})
	}

	var namePtr *string
	if name != "" {
		namePtr = &name
	}

	now := time.Now()
	newUser := database.User{
		Email:     email,
		Password:  string(hashed),
		Name:      namePtr,
		Role:      role,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user record"})
	}

	return c.Status(201).JSON(UserResponseDTO{
		ID:           newUser.ID,
		Email:        newUser.Email,
		Name:         newUser.Name,
		Role:         newUser.Role,
		ProjectCount: 0,
		CreatedAt:    newUser.CreatedAt,
		UpdatedAt:    newUser.UpdatedAt,
	})
}

// UpdateUser modifies an existing user's name, email, or role (Admin only)
func UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	currentAdminID := c.Locals("userId").(string)

	var user database.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	var input UpdateUserInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload format"})
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	name := strings.TrimSpace(input.Name)
	role := strings.ToLower(strings.TrimSpace(input.Role))

	if email != "" && !userEmailRegex.MatchString(email) {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid email address format"})
	}

	// Check email collision if email is changed
	if email != "" && strings.ToLower(user.Email) != email {
		var check database.User
		if err := database.DB.Where("LOWER(email) = ? AND id != ?", email, id).First(&check).Error; err == nil {
			return c.Status(400).JSON(fiber.Map{"error": "Another account already uses this email"})
		}
		user.Email = email
	}

	if name != "" {
		user.Name = &name
	}

	// Safety check when altering roles
	if role == "admin" || role == "operator" {
		if user.Role == "admin" && role != "admin" {
			// Check if this is the last admin
			var adminCount int64
			database.DB.Model(&database.User{}).Where("role = ?", "admin").Count(&adminCount)
			if adminCount <= 1 {
				return c.Status(400).JSON(fiber.Map{"error": "Cannot demote the sole remaining administrator"})
			}
			if id == currentAdminID {
				return c.Status(400).JSON(fiber.Map{"error": "Cannot remove your own administrator privileges"})
			}
		}
		user.Role = role
	}

	user.UpdatedAt = time.Now()
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update user record"})
	}

	var pCount int64
	database.DB.Model(&database.Project{}).Where("\"userId\" = ?", user.ID).Count(&pCount)

	return c.JSON(UserResponseDTO{
		ID:           user.ID,
		Email:        user.Email,
		Name:         user.Name,
		Role:         user.Role,
		ProjectCount: pCount,
		CreatedAt:    user.CreatedAt,
		UpdatedAt:    user.UpdatedAt,
	})
}

// ResetUserPassword overrides password for any operator/user (Admin only)
func ResetUserPassword(c *fiber.Ctx) error {
	id := c.Params("id")

	var user database.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	var input ResetPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload format"})
	}

	newPassword := strings.TrimSpace(input.NewPassword)
	if len(newPassword) < 6 {
		return c.Status(400).JSON(fiber.Map{"error": "Password must be at least 6 characters long"})
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), 10)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to encrypt password"})
	}

	user.Password = string(hashed)
	user.UpdatedAt = time.Now()
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to reset password"})
	}

	return c.JSON(fiber.Map{
		"message": "Password successfully reset for " + user.Email,
	})
}

// DeleteUser removes a user account and their associated resources (Admin only)
func DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	currentAdminID := c.Locals("userId").(string)

	if id == currentAdminID {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot delete your own active administrator account"})
	}

	var user database.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	if user.Role == "admin" {
		var adminCount int64
		database.DB.Model(&database.User{}).Where("role = ?", "admin").Count(&adminCount)
		if adminCount <= 1 {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot delete the sole remaining administrator"})
		}
	}

	// Clean up user's projects and related records
	var projects []database.Project
	database.DB.Where("\"userId\" = ?", id).Find(&projects)
	for _, p := range projects {
		database.DB.Where("\"projectId\" = ?", p.ID).Delete(&database.Payload{})
		database.DB.Where("\"projectId\" = ?", p.ID).Delete(&database.Log{})
		database.DB.Where("\"projectId\" = ?", p.ID).Delete(&database.Simulation{})
		database.DB.Where("\"projectId\" = ?", p.ID).Delete(&database.AlertRule{})
		database.DB.Where("\"projectId\" = ?", p.ID).Delete(&database.AlertLog{})
		database.DB.Where("\"projectId\" = ?", p.ID).Delete(&database.WebhookMap{})
		database.DB.Delete(&p)
	}

	// Delete chat sessions
	var sessions []database.ChatSession
	database.DB.Where("\"userId\" = ?", id).Find(&sessions)
	for _, s := range sessions {
		database.DB.Where("\"sessionId\" = ?", s.ID).Delete(&database.ChatMessage{})
		database.DB.Delete(&s)
	}

	// Delete user
	if err := database.DB.Delete(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to remove user account"})
	}

	return c.JSON(fiber.Map{
		"message": "User account and associated resources successfully deleted",
	})
}
