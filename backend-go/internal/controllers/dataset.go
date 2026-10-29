package controllers

import (
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"iotkit-studio-go/internal/config"
	"iotkit-studio-go/internal/database"
	"iotkit-studio-go/internal/simulation"
)

// MaxDatasetSizeBytes enforces maximum 3MB file size for datasets (3,145,728 bytes).
const MaxDatasetSizeBytes = 3 * 1024 * 1024

func formatFileSize(bytes int64) string {
	if bytes < 1024 {
		return fmt.Sprintf("%d B", bytes)
	} else if bytes < 1024*1024 {
		return fmt.Sprintf("%.2f KB", float64(bytes)/1024.0)
	}
	return fmt.Sprintf("%.2f MB", float64(bytes)/(1024.0*1024.0))
}

// findAuthorizedDataset checks ownership of dataset; allows admin or creator (F-03)
func findAuthorizedDataset(c *fiber.Ctx, datasetID string) (*database.Dataset, error) {
	userID, ok := c.Locals("userId").(string)
	if !ok || userID == "" {
		return nil, fiber.NewError(fiber.StatusUnauthorized, "Autentikasi diperlukan")
	}

	role, _ := c.Locals("userRole").(string)
	isAdmin := role == "admin"
	if !isAdmin {
		var user database.User
		if err := database.DB.Select("role").First(&user, "id = ?", userID).Error; err == nil && user.Role == "admin" {
			isAdmin = true
		}
	}

	var dataset database.Dataset
	query := database.DB.Where("id = ?", datasetID)
	if !isAdmin {
		query = query.Where("\"userId\" = ?", userID)
	}

	if err := query.First(&dataset).Error; err != nil {
		return nil, fiber.NewError(fiber.StatusNotFound, "Dataset tidak ditemukan")
	}

	return &dataset, nil
}

func GetDatasets(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(string)
	if !ok || userID == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Autentikasi diperlukan"})
	}

	role, _ := c.Locals("userRole").(string)
	isAdmin := role == "admin"
	if !isAdmin {
		var user database.User
		if err := database.DB.Select("role").First(&user, "id = ?", userID).Error; err == nil && user.Role == "admin" {
			isAdmin = true
		}
	}

	var datasets []database.Dataset
	query := database.DB.Order("\"createdAt\" DESC")
	if !isAdmin {
		query = query.Where("\"userId\" = ?", userID)
	}
	query.Find(&datasets)
	return c.JSON(fiber.Map{"datasets": datasets})
}

func UploadDataset(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(string)
	if !ok || userID == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Autentikasi diperlukan"})
	}

	// Frontend sends JSON body: { fileName, moduleName, content, name }
	var body struct {
		FileName   string `json:"fileName"`
		ModuleName string `json:"moduleName"`
		Content    string `json:"content"`
		Name       string `json:"name"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if body.FileName == "" || body.ModuleName == "" || body.Content == "" {
		return c.Status(400).JSON(fiber.Map{"error": "fileName, moduleName, and content are required"})
	}

	fileSizeBytes := int64(len(body.Content))
	if fileSizeBytes > MaxDatasetSizeBytes {
		return c.Status(400).JSON(fiber.Map{
			"error": fmt.Sprintf("Ukuran file (%s) melebihi batas maksimal 3MB (3,145,728 bytes)", formatFileSize(fileSizeBytes)),
		})
	}

	finalName := body.FileName
	if body.Name != "" && strings.TrimSpace(body.Name) != "" {
		finalName = strings.TrimSpace(body.Name)
	}

	// Calculate SHA256 checksum
	h := sha256.New()
	h.Write([]byte(body.Content))
	checksum := fmt.Sprintf("%x", h.Sum(nil))

	// Count rows (lines minus header)
	lines := strings.Split(body.Content, "\n")
	nonEmpty := 0
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			nonEmpty++
		}
	}
	loadedRows := 0
	if nonEmpty > 1 {
		loadedRows = nonEmpty - 1 // subtract header
	}

	// Write file to disk
	fileID := uuid.New().String()
	uploadDir := config.AppConfig.UploadDir
	os.MkdirAll(uploadDir, 0755)
	destPath := filepath.Join(uploadDir, fileID+".csv")

	if err := os.WriteFile(destPath, []byte(body.Content), 0644); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save file"})
	}

	relPath := fmt.Sprintf("uploads/datasets/%s.csv", fileID)

	var existing database.Dataset
	if err := database.DB.Where("\"userId\" = ? AND \"moduleName\" = ? AND \"fileName\" = ?", userID, body.ModuleName, body.FileName).First(&existing).Error; err == nil {
		os.Remove(existing.FilePath)
		existing.Name = finalName
		existing.FilePath = destPath
		existing.FilePathRelative = &relPath
		existing.FileSizeBytes = fileSizeBytes
		existing.ChecksumSha256 = checksum
		existing.LoadedRows = loadedRows
		existing.UpdatedAt = time.Now()
		if err := database.DB.Save(&existing).Error; err != nil {
			os.Remove(destPath)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update dataset record"})
		}
		return c.Status(200).JSON(fiber.Map{
			"dataset": existing,
			"message": "Dataset uploaded successfully",
		})
	}

	dataset := database.Dataset{
		Name:             finalName,
		ModuleName:       body.ModuleName,
		FileName:         body.FileName,
		FilePath:         destPath,
		FilePathRelative: &relPath,
		FileSizeBytes:    fileSizeBytes,
		ChecksumSha256:   checksum,
		LoadedRows:       loadedRows,
		IsActive:         true,
		UserID:           &userID,
	}

	if err := database.DB.Create(&dataset).Error; err != nil {
		os.Remove(destPath)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save dataset record"})
	}

	return c.Status(201).JSON(fiber.Map{
		"dataset": dataset,
		"message": "Dataset uploaded successfully",
	})
}

func DeleteDataset(c *fiber.Ctx) error {
	id := c.Params("id")

	dataset, err := findAuthorizedDataset(c, id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataset tidak ditemukan"})
	}

	os.Remove(dataset.FilePath)
	database.DB.Delete(dataset)

	return c.JSON(fiber.Map{"message": "Dataset deleted successfully"})
}

func UpdateDatasetName(c *fiber.Ctx) error {
	id := c.Params("id")

	var body struct {
		Name string `json:"name"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	if body.Name == "" || strings.TrimSpace(body.Name) == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}

	dataset, err := findAuthorizedDataset(c, id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataset tidak ditemukan"})
	}

	database.DB.Model(dataset).Update("name", strings.TrimSpace(body.Name))

	return c.JSON(fiber.Map{
		"dataset": dataset,
		"message": "Dataset renamed successfully",
	})
}

func GetDatasetPreview(c *fiber.Ctx) error {
	id := c.Params("id")
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	dataset, err := findAuthorizedDataset(c, id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataset tidak ditemukan"})
	}

	data, err := os.ReadFile(dataset.FilePath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}

	allLines := strings.Split(string(data), "\n")
	maxLines := limit + 1 // include header
	if maxLines > len(allLines) {
		maxLines = len(allLines)
	}

	lines := allLines[:maxLines]

	return c.JSON(fiber.Map{
		"rows":      lines,
		"totalRows": dataset.LoadedRows,
	})
}

// DownloadDataset allows downloading a CSV dataset file directly from disk.
func DownloadDataset(c *fiber.Ctx) error {
	id := c.Params("id")

	dataset, err := findAuthorizedDataset(c, id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataset tidak ditemukan"})
	}

	if _, err := os.Stat(dataset.FilePath); os.IsNotExist(err) {
		return c.Status(404).JSON(fiber.Map{"error": "File dataset tidak ditemukan di server"})
	}

	downloadName := dataset.FileName
	if !strings.HasSuffix(strings.ToLower(downloadName), ".csv") {
		downloadName += ".csv"
	}

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", downloadName))
	return c.Download(dataset.FilePath, downloadName)
}

// GenerateDataset creates synthetic CSV telemetry data with option to save to vault or download directly.
// Hard cap: 3MB (3,145,728 bytes).
func GenerateDataset(c *fiber.Ctx) error {
	var input struct {
		Name             string                     `json:"name"`
		ModuleName       string                     `json:"moduleName"`
		RowCount         int                        `json:"rowCount"`
		SaveToDataset    bool                       `json:"saveToDataset"`
		PayloadStructure []simulation.PayloadField `json:"payloadStructure"`
		ChaosMode        bool                       `json:"chaosMode"`
		ChaosProbability float64                    `json:"chaosProbability"`
		ChaosFields      []string                   `json:"chaosFields"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Format input JSON tidak valid"})
	}

	if input.RowCount <= 0 {
		input.RowCount = 100
	}
	if input.RowCount > 50000 {
		return c.Status(400).JSON(fiber.Map{"error": "Jumlah baris maksimal yang diizinkan adalah 50.000"})
	}

	cleanName := strings.TrimSpace(input.Name)
	if cleanName == "" {
		cleanName = fmt.Sprintf("Synthetic_Dataset_%s", time.Now().Format("20060102_150405"))
	}

	cleanModule := strings.TrimSpace(input.ModuleName)
	if cleanModule == "" {
		cleanModule = "telemetry"
	}

	csvBytes, actualRows, err := simulation.GenerateSyntheticCSV(
		input.PayloadStructure,
		input.RowCount,
		input.ChaosMode,
		input.ChaosProbability,
		input.ChaosFields,
		MaxDatasetSizeBytes,
	)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	fileSizeBytes := int64(len(csvBytes))
	if fileSizeBytes > MaxDatasetSizeBytes {
		return c.Status(400).JSON(fiber.Map{
			"error": fmt.Sprintf("Ukuran data (%s) melebihi batas maksimal 3MB (3,145,728 bytes)", formatFileSize(fileSizeBytes)),
		})
	}

	fileName := cleanName
	if !strings.HasSuffix(strings.ToLower(fileName), ".csv") {
		fileName += ".csv"
	}

	// 1. OPSI: JIKA DISIMPAN KE DATASET VAULT
	if input.SaveToDataset {
		userID, _ := c.Locals("userId").(string)
		fileID := uuid.New().String()
		uploadDir := config.AppConfig.UploadDir
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menyiapkan direktori penyimpanan dataset"})
		}
		destPath := filepath.Join(uploadDir, fileID+".csv")

		if err := os.WriteFile(destPath, csvBytes, 0644); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan file dataset ke disk"})
		}

		h := sha256.New()
		h.Write(csvBytes)
		checksum := fmt.Sprintf("%x", h.Sum(nil))

		relPath := fmt.Sprintf("uploads/datasets/%s.csv", fileID)

		dataset := database.Dataset{
			Name:             cleanName,
			ModuleName:       cleanModule,
			FileName:         fileName,
			FilePath:         destPath,
			FilePathRelative: &relPath,
			FileSizeBytes:    fileSizeBytes,
			ChecksumSha256:   checksum,
			LoadedRows:       actualRows,
			IsActive:         true,
			UserID:           &userID,
		}

		if err := database.DB.Create(&dataset).Error; err != nil {
			os.Remove(destPath)
			return c.Status(500).JSON(fiber.Map{"error": "Gagal menyimpan data dataset ke database"})
		}

		return c.Status(201).JSON(fiber.Map{
			"saved":         true,
			"dataset":       dataset,
			"csvContent":    string(csvBytes),
			"fileName":      fileName,
			"fileSizeBytes": fileSizeBytes,
			"rowCount":      actualRows,
			"message":       "Dataset berhasil di-generate, disimpan ke vault, dan siap diunduh",
		})
	}

	// 2. OPSI: JIKA TIDAK DISIMPAN KE DATASET (HANYA DOWNLOAD LANGSUNG)
	return c.JSON(fiber.Map{
		"saved":         false,
		"csvContent":    string(csvBytes),
		"fileName":      fileName,
		"fileSizeBytes": fileSizeBytes,
		"rowCount":      actualRows,
		"message":       "Data berhasil di-generate dan siap diunduh (tidak disimpan ke vault)",
	})
}
