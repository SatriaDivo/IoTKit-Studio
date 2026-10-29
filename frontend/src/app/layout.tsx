import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IoTKit-Studio - Industrial IoT Simulation Platform",
  description:
    "High-precision IoT telemetry and simulation studio for HTTP, MQTT, and WebSocket protocols",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-[#F8FAFC] text-[#0F172A] selection:bg-[#2563EB]/15 selection:text-[#2563EB]">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#FFFFFF",
              color: "#0F172A",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px -2px rgba(15, 23, 42, 0.08)",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "6px",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </body>
    </html>
  );
}
