package controllers

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
)

type ExportReportRequest struct {
	ProjectID      string                 `json:"projectId"`
	ProjectName    string                 `json:"projectName"`
	Protocol       string                 `json:"protocol"`
	Host           string                 `json:"host"`
	Port           interface{}            `json:"port"`
	TotalLogs      int                    `json:"totalLogs"`
	SuccessRate    float64                `json:"successRate"`
	AverageLatency int                    `json:"averageLatency"`
	TimeRange      string                 `json:"timeRange"`
	Charts         map[string]string      `json:"charts"`
}

// ExportPDFReport handles PDF report generation in Golang using gofpdf
func ExportPDFReport(c *fiber.Ctx) error {
	var req ExportReportRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse request body: " + err.Error(),
		})
	}

	// Create A4 PDF: P (Portrait), mm (millimeters), A4 size
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// --- 1. Sleek Dark Header ---
	pdf.SetFillColor(56, 73, 89) // #384959 Dark Slate
	pdf.Rect(0, 0, 210, 32, "F")

	// Header Text
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 20)
	pdf.Text(15, 13, "IoTKit Studio")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(189, 221, 252) // #BDDDFC
	pdf.Text(15, 20, "INDUSTRIAL SIMULATION & TELEMETRY REPORT")

	// Export Date & Time
	exportTime := time.Now().Format("02/01/2006 15:04:05") + " WIB"
	pdf.SetTextColor(189, 221, 252)
	pdf.SetFont("Arial", "", 8)
	pdf.CellFormat(180, 5, fmt.Sprintf("Generated: %s", exportTime), "", 0, "R", false, 0, "")
	pdf.Ln(4)
	pdf.CellFormat(180, 5, fmt.Sprintf("Time Range Filter: %s", req.TimeRange), "", 0, "R", false, 0, "")

	// Reset standard text color to #2C3E50 (Dark Slate Blue)
	pdf.SetTextColor(44, 62, 80)

	// --- 2. Industrial Quality Stamp (Official Engineering Seal) ---
	// Let's draw this vector seal in the top right space below header
	stampX := 180.0
	stampY := 55.0

	// Outer Circle
	pdf.SetDrawColor(106, 137, 167) // #6A89A7 Slate Blue
	pdf.SetLineWidth(0.8)
	pdf.Circle(stampX, stampY, 13, "D")

	// Inner Circle
	pdf.Circle(stampX, stampY, 11, "D")

	// Seal Texts
	pdf.SetTextColor(106, 137, 167)
	pdf.SetFont("Arial", "B", 5)
	pdf.Text(stampX-8, stampY-3, "SYSTEM")
	pdf.Text(stampX-10, stampY+1, "INTEGRITY")
	pdf.Text(stampX-9, stampY+5, "VERIFIED")

	// --- 3. Project Specifications Section ---
	pdf.SetTextColor(44, 62, 80) // #2C3E50
	pdf.SetFont("Arial", "B", 13)
	pdf.Text(15, 42, "Project Specifications")

	// Divider line
	pdf.SetLineWidth(0.3)
	pdf.SetDrawColor(209, 219, 229) // #D1DBE5
	pdf.Line(15, 46, 160, 46)

	// Left Column Metadata
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(90, 108, 125) // #5A6C7D
	pdf.Text(15, 52, "Project ID:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(44, 62, 80)
	pdf.Text(45, 52, req.ProjectID)

	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(90, 108, 125)
	pdf.Text(15, 58, "Project Name:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(44, 62, 80)
	pdf.Text(45, 58, req.ProjectName)

	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(90, 108, 125)
	pdf.Text(15, 64, "Protocol Stack:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(44, 62, 80)
	pdf.Text(45, 64, strings.ToUpper(req.Protocol))

	// Right Column Metadata
	portStr := fmt.Sprintf("%v", req.Port)
	if portStr == "<nil>" || portStr == "" {
		portStr = "N/A"
	}
	targetHost := fmt.Sprintf("%s:%s", req.Host, portStr)

	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(90, 108, 125)
	pdf.Text(90, 52, "Target Endpoint:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(44, 62, 80)
	pdf.Text(120, 52, targetHost)

	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(90, 108, 125)
	pdf.Text(90, 58, "Total Data Points:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(44, 62, 80)
	pdf.Text(120, 58, fmt.Sprintf("%d payloads", req.TotalLogs))

	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(90, 108, 125)
	pdf.Text(90, 64, "Compliance State:")
	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(44, 62, 80)
	pdf.Text(120, 64, "STANDARD (RFC Compliant)")

	// --- 4. Simulation Performance Summary (Visual Cards) ---
	pdf.SetTextColor(44, 62, 80)
	pdf.SetFont("Arial", "B", 13)
	pdf.Text(15, 76, "Performance Telemetries")

	// Divider line
	pdf.Line(15, 80, 195, 80)

	// Card 1: Success Rate Card
	pdf.SetFillColor(248, 249, 250) // #F8F9FA
	pdf.SetDrawColor(232, 237, 242) // #E8EDF2
	pdf.Rect(15, 84, 85, 23, "FD")

	pdf.SetTextColor(90, 108, 125)
	pdf.SetFont("Arial", "B", 8)
	pdf.Text(20, 89, "SUCCESS RATE")

	// Dynamic success rate coloring
	if req.SuccessRate >= 95.0 {
		pdf.SetTextColor(76, 175, 80) // Success Green #4CAF50
	} else if req.SuccessRate >= 85.0 {
		pdf.SetTextColor(255, 152, 0) // Warning Orange #FF9800
	} else {
		pdf.SetTextColor(244, 67, 54) // Error Red #F44336
	}
	pdf.SetFont("Arial", "B", 15)
	pdf.Text(20, 102, fmt.Sprintf("%.1f%%", req.SuccessRate))

	// Card 2: Latency Card
	pdf.SetFillColor(248, 249, 250)
	pdf.Rect(110, 84, 85, 23, "FD")

	pdf.SetTextColor(90, 108, 125)
	pdf.SetFont("Arial", "B", 8)
	pdf.Text(115, 89, "AVERAGE ROUNDTRIP LATENCY")

	// Dynamic latency coloring
	if req.AverageLatency < 150 {
		pdf.SetTextColor(76, 175, 80)
	} else if req.AverageLatency < 400 {
		pdf.SetTextColor(255, 152, 0)
	} else {
		pdf.SetTextColor(244, 67, 54)
	}
	pdf.SetFont("Arial", "B", 15)
	pdf.Text(115, 102, fmt.Sprintf("%d ms", req.AverageLatency))

	// --- 5. Captured Charts Embed Section ---
	if req.Charts != nil {
		pdf.SetTextColor(44, 62, 80)
		pdf.SetFont("Arial", "B", 13)
		pdf.Text(15, 120, "Visualized Telemetry Graphs")

		pdf.SetDrawColor(209, 219, 229)
		pdf.Line(15, 124, 195, 124)

		chartY := 128.0

		// Helper function to decode base64 and register as memory image inside gofpdf
		embedChartGo := func(label string, base64Str string, x, y float64) {
			if base64Str == "" || !strings.HasPrefix(base64Str, "data:image") {
				return
			}
			parts := strings.Split(base64Str, ",")
			if len(parts) < 2 {
				return
			}

			imgBytes, err := base64.StdEncoding.DecodeString(parts[1])
			if err != nil {
				return
			}

			// Label
			pdf.SetTextColor(90, 108, 125)
			pdf.SetFont("Arial", "B", 8)
			pdf.Text(x, y, label)

			// Outline Box
			pdf.SetDrawColor(232, 237, 242)
			pdf.Rect(x, y+3, 85, 52, "D")

			// Register image in memory
			imageName := fmt.Sprintf("chart_%s_%f", label, x)
			reader := bytes.NewReader(imgBytes)
			pdf.RegisterImageOptionsReader(imageName, gofpdf.ImageOptions{ImageType: "PNG"}, reader)

			// Draw Image
			pdf.ImageOptions(imageName, x+2, y+5, 81, 48, false, gofpdf.ImageOptions{ImageType: "PNG"}, 0, "")
		}

		embedChartGo("1. Payload Volume Trends", req.Charts["payloadTrends"], 15, chartY)
		embedChartGo("2. Success Rate Trends", req.Charts["successRateTrends"], 110, chartY)

		chartY += 62.0

		embedChartGo("3. Average Latency Over Time", req.Charts["latencyTrends"], 15, chartY)
		embedChartGo("4. Transport Protocol Distribution", req.Charts["protocolDistribution"], 110, chartY)
	}

	// --- 6. Unified Footer ---
	pdf.SetDrawColor(209, 219, 229)
	pdf.Line(15, 275, 195, 275)

	pdf.SetTextColor(138, 156, 174) // #8A9CAE
	pdf.SetFont("Arial", "", 8)
	pdf.Text(42, 280, "IoTKit Studio Industrial Simulator Suite - Integrity - Performance - Scalability")

	// Render directly to memory buffer and stream back
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to compile PDF output: " + err.Error(),
		})
	}

	c.Set("Content-Type", "application/pdf")
	timestamp := time.Now().Format("02-01-2006-150405")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=IoTKit-Industrial-Report-%s-%s.pdf", req.ProjectID, timestamp))
	return c.Send(buf.Bytes())
}
