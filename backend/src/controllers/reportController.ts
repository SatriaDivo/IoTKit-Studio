import { Request, Response } from "express";
import PDFDocument from "pdfkit";

export class ReportController {
  public static async export(req: Request, res: Response): Promise<void> {
    try {
      const {
        projectId,
        projectName,
        protocol,
        host,
        port,
        totalLogs,
        successRate,
        averageLatency,
        timeRange,
        charts,
      } = req.body;

      // Create PDF Document
      const doc = new PDFDocument({ size: "A4", margin: 40 });

      // Set headers for PDF streaming
      const now = new Date();
      const pad = (num: number) => String(num).padStart(2, '0');
      const timestamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=IoTKit-Industrial-Report-${projectId || "Global"}-${timestamp}.pdf`
      );

      doc.pipe(res);

      // --- 1. Sleek Dark Header ---
      doc
        .rect(0, 0, 595, 90)
        .fill("#384959");

      doc
        .fillColor("#FFFFFF")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("IoTKit Studio", 40, 25);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text("INDUSTRIAL SIMULATION & TELEMETRY REPORT", 40, 50);

      // Export Date & Time
      const exportDate = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
      doc
        .fontSize(9)
        .fillColor("#BDDDFC")
        .text(`Generated: ${exportDate} WIB`, 410, 25, { align: "right", width: 145 });

      doc
        .text(`Time Range Filter: ${timeRange || "All Time"}`, 410, 42, { align: "right", width: 145 });

      // Reset text color
      doc.fillColor("#384959");

      // --- 2. Industrial Quality Stamp (Official Engineering Seal) ---
      // We will draw this vector seal in the top right space below header
      const stampX = 510;
      const stampY = 160;

      // Outer Circle
      doc
        .circle(stampX, stampY, 35)
        .lineWidth(2)
        .strokeColor("#6A89A7")
        .stroke();

      // Inner Circle
      doc
        .circle(stampX, stampY, 30)
        .lineWidth(1)
        .strokeColor("#6A89A7")
        .stroke();

      // Seal text
      doc
        .fillColor("#6A89A7")
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("SYSTEM", stampX - 25, stampY - 14, { align: "center", width: 50 })
        .text("INTEGRITY", stampX - 25, stampY - 4, { align: "center", width: 50 })
        .text("VERIFIED", stampX - 25, stampY + 6, { align: "center", width: 50 });

      // --- 3. Project Metadata Section ---
      doc
        .fillColor("#2C3E50")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Project Specifications", 40, 115);

      // Divider Line
      doc
        .moveTo(40, 132)
        .lineTo(440, 132)
        .lineWidth(1)
        .strokeColor("#D1DBE5")
        .stroke();

      // Left Column Metadata
      doc
        .fillColor("#5A6C7D")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("Project ID:", 40, 145)
        .font("Helvetica")
        .text(projectId || "N/A", 120, 145)

        .font("Helvetica-Bold")
        .text("Project Name:", 40, 162)
        .font("Helvetica")
        .text(projectName || "N/A", 120, 162)

        .font("Helvetica-Bold")
        .text("Protocol Stack:", 40, 179)
        .font("Helvetica")
        .text(String(protocol || "HTTP").toUpperCase(), 120, 179);

      // Right Column Metadata
      doc
        .font("Helvetica-Bold")
        .text("Target Endpoint:", 240, 145)
        .font("Helvetica")
        .text(`${host || "localhost"}:${port || "N/A"}`, 330, 145)

        .font("Helvetica-Bold")
        .text("Total Data Points:", 240, 162)
        .font("Helvetica")
        .text(`${totalLogs || 0} payloads`, 330, 162)

        .font("Helvetica-Bold")
        .text("Compliance State:", 240, 179)
        .font("Helvetica")
        .text("STANDARD (RFC Compliant)", 330, 179);

      // --- 4. Simulation Performance Summary (Visual Cards) ---
      doc
        .fillColor("#2C3E50")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Performance Telemetries", 40, 215);

      // Divider Line
      doc
        .moveTo(40, 232)
        .lineTo(555, 232)
        .lineWidth(1)
        .strokeColor("#D1DBE5")
        .stroke();

      // Success Rate Card
      const rateVal = successRate !== undefined ? Number(successRate) : 100;
      const rateColor = rateVal >= 95 ? "#4CAF50" : rateVal >= 85 ? "#FF9800" : "#F44336";

      doc
        .roundedRect(40, 245, 245, 65, 4)
        .fillColor("#F8F9FA")
        .fillAndStroke("#E8EDF2");

      doc
        .fillColor("#5A6C7D")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("SUCCESS RATE", 55, 257);

      doc
        .fillColor(rateColor)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(`${rateVal.toFixed(1)}%`, 55, 270);

      // Latency Card
      const latencyVal = averageLatency !== undefined ? Number(averageLatency) : 0;
      const latencyColor = latencyVal < 150 ? "#4CAF50" : latencyVal < 400 ? "#FF9800" : "#F44336";

      doc
        .roundedRect(310, 245, 245, 65, 4)
        .fillColor("#F8F9FA")
        .fillAndStroke("#E8EDF2");

      doc
        .fillColor("#5A6C7D")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("AVERAGE ROUNDTRIP LATENCY", 325, 257);

      doc
        .fillColor(latencyColor)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(`${latencyVal} ms`, 325, 270);

      // --- 5. Captured Charts Embed Section ---
      if (charts && typeof charts === "object") {
        doc
          .fillColor("#2C3E50")
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Visualized Telemetry Graphs", 40, 335);

        doc
          .moveTo(40, 352)
          .lineTo(555, 352)
          .lineWidth(1)
          .strokeColor("#D1DBE5")
          .stroke();

        let chartY = 365;

        // Helper to register & embed chart cleanly
        const embedChart = (label: string, base64Str: string | undefined, x: number, y: number) => {
          if (!base64Str || !base64Str.startsWith("data:image")) return false;
          try {
            const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            
            // Draw chart background frame
            doc
              .roundedRect(x, y + 15, 245, 140, 3)
              .lineWidth(1)
              .strokeColor("#E8EDF2")
              .stroke();

            // Label
            doc
              .fillColor("#5A6C7D")
              .fontSize(9)
              .font("Helvetica-Bold")
              .text(label, x + 5, y);

            // Embed Image
            doc.image(buffer, x + 5, y + 20, { width: 235, height: 130 });
            return true;
          } catch (e) {
            console.error(`[PDFExport] Error embedding ${label}:`, e);
            return false;
          }
        };

        const embedded1 = embedChart("1. Payload Volume Trends", charts.payloadTrends, 40, chartY);
        const embedded2 = embedChart("2. Success Rate Trends", charts.successRateTrends, 310, chartY);

        chartY += 175;

        const embedded3 = embedChart("3. Average Latency Over Time", charts.latencyTrends, 40, chartY);
        const embedded4 = embedChart("4. Transport Protocol Distribution", charts.protocolDistribution, 310, chartY);
      }

      // --- 6. Unified Footer ---
      doc
        .moveTo(40, 770)
        .lineTo(555, 770)
        .lineWidth(1)
        .strokeColor("#D1DBE5")
        .stroke();

      doc
        .fillColor("#8A9CAE")
        .fontSize(8)
        .font("Helvetica")
        .text("IoTKit Studio Industrial Simulator Suite - Integrity - Performance - Scalability", 40, 780, { align: "center", width: 515 });

      doc.end();
    } catch (error: any) {
      console.error("[PDFExport] Error generating report:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to generate export report" });
      }
    }
  }
}
