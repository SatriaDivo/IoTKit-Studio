package controllers

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"iotkit-studio-go/internal/config"
	"iotkit-studio-go/internal/database"
)

func GetDatasets(c *fiber.Ctx) error {
	var datasets []database.Dataset
	database.DB.Order("\"createdAt\" DESC").Find(&datasets)
	return c.JSON(datasets)
}

func UploadDataset(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "No file uploaded"})
	}

	name := c.FormValue("name", file.Filename)
	moduleName := c.FormValue("moduleName", "custom")

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	newFileName := uuid.New().String() + ext
	uploadDir := config.AppConfig.UploadDir
	os.MkdirAll(uploadDir, 0755)
	destPath := filepath.Join(uploadDir, newFileName)

	// Save file
	if err := c.SaveFile(file, destPath); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save file"})
	}

	// Calculate checksum
	f, _ := os.Open(destPath)
	defer f.Close()
	h := sha256.New()
	io.Copy(h, f)
	checksum := fmt.Sprintf("%x", h.Sum(nil))

	// Count rows
	f.Seek(0, 0)
	rowCount := 0
	buf := make([]byte, 32*1024)
	for {
		n, err := f.Read(buf)
		for i := 0; i < n; i++ {
			if buf[i] == '\n' {
				rowCount++
			}
		}
		if err != nil {
			break
		}
	}
	if rowCount > 0 {
		rowCount-- // subtract header
	}

	relPath := filepath.Join("uploads/datasets", newFileName)

	dataset := database.Dataset{
		Name:             name,
		ModuleName:       moduleName,
		FileName:         file.Filename,
		FilePath:         destPath,
		FilePathRelative: &relPath,
		FileSizeBytes:    file.Size,
		ChecksumSha256:   checksum,
		LoadedRows:       rowCount,
	}

	if err := database.DB.Create(&dataset).Error; err != nil {
		os.Remove(destPath)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save dataset record"})
	}

	return c.Status(201).JSON(dataset)
}

func DeleteDataset(c *fiber.Ctx) error {
	id := c.Params("id")

	var dataset database.Dataset
	if err := database.DB.First(&dataset, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataset not found"})
	}

	os.Remove(dataset.FilePath)
	database.DB.Delete(&dataset)

	return c.JSON(fiber.Map{"message": "Dataset deleted"})
}

func GetDatasetPreview(c *fiber.Ctx) error {
	id := c.Params("id")
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	var dataset database.Dataset
	if err := database.DB.First(&dataset, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataset not found"})
	}

	f, err := os.Open(dataset.FilePath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer f.Close()

	// Read limited lines
	var lines []string
	buf := make([]byte, 0, 64*1024)
	remaining := make([]byte, 0)
	readBuf := make([]byte, 4096)
	lineCount := 0

	for lineCount <= limit {
		n, err := f.Read(readBuf)
		if n > 0 {
			remaining = append(remaining, readBuf[:n]...)
			for {
				idx := -1
				for i, b := range remaining {
					if b == '\n' {
						idx = i
						break
					}
				}
				if idx == -1 {
					break
				}
				line := string(remaining[:idx])
				remaining = remaining[idx+1:]
				lines = append(lines, line)
				lineCount++
				if lineCount > limit {
					break
				}
			}
		}
		if err != nil {
			if len(remaining) > 0 {
				lines = append(lines, string(remaining))
			}
			break
		}
	}
	_ = buf

	return c.JSON(fiber.Map{
		"rows":      lines,
		"totalRows": dataset.LoadedRows,
	})
}
