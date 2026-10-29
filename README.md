# IoTKit-Studio

Platform simulasi IoT berbasis dashboard untuk membuat, mengelola, dan mengirim payload sensor IoT tanpa coding, kini dilengkapi dengan kemampuan penangkap data luar (*Ingestion*) dan suntikan anomali (*Chaos Engineering*).

## 🚀 Fitur Utama

- **Project Management**: Buat dan kelola multiple project IoT secara modular.
- **Multi-Protocol Support**: HTTP/HTTPS, MQTT/MQTTS, WebSocket/WSS.
- **Visual Payload Builder**: Buat struktur payload JSON secara visual tanpa perlu menyentuh baris kode.
- **Real-time Simulation**: Jalankan simulasi data sensor secara real-time dengan interval kustom.
- **Chaos Engineering (Anomaly Injector)**: Mensimulasikan kegagalan data atau sensor dengan menyuntikkan lonjakan angka ekstrim (10x lipat) dan membalikkan status boolean acak guna menguji ketahanan backend/alert target.
- **Webhook Ingestion Engine**: Menyediakan URL endpoint publik unik per-proyek untuk menangkap request data dari luar (ESP32/ESP8266, cURL, Postman) lengkap dengan log interaktif dan salin instruksi multi-shell (PowerShell, cURL, Python).
- **Interactive Notification Tray**: Lonceng notifikasi header interaktif terintegrasi Socket.IO secara real-time, mendukung klik-navigasi instan ke halaman target sekaligus membersihkan log notifikasi otomatis.
- **AI Agent Chat**: Buat dan konfigurasi proyek secara otomatis menggunakan percakapan bahasa alami (didukung model LLM cerdas).

## 📋 Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand (State Management)
- Socket.IO Client / HTTP Polling

### Backend (Node.js Edition)
Branch ini secara spesifik dikonfigurasi untuk **Node.js + Express Backend (`/backend`)**:
- Node.js & Express
- TypeScript
- Prisma ORM
- Socket.IO Engine
- MQTT.js & WS Client

---

## 📖 Dokumentasi Teknis (Docs Index)

Seluruh dokumentasi arsitektur sistem disimpan rapi dalam direktori `docs/`:

### 📌 Business Requirements
*   **[docs/BRD.md](docs/BRD.md)** - Daftar isi Business Requirements Document
*   [Executive Summary](docs/brd/executive-summary.md) - Ringkasan Eksekutif IoTKit-Studio
*   [Objectives](docs/brd/objectives.md) - Tujuan bisnis dan target pasar
*   [Scope](docs/brd/scope.md) - Ruang lingkup fitur simulator
*   [Future Features](docs/brd/future-features.md) - Rencana pengembangan fitur masa depan (Roadmap)

### ⚙️ Software Requirements Specification (SRS)
*   **[docs/SRS.md](docs/SRS.md)** - Daftar isi Software Requirements Specification
*   [Database Schema](docs/srs/database_schema.md) - Konseptual skema PostgreSQL & GORM/Prisma
*   [API & Backend Router](docs/srs/fr-api.md) - Daftar lengkap REST API & WebSocket Hub
*   [FR Webhook Ingestion](docs/srs/fr-webhook.md) - Spesifikasi fungsionalitas penangkap data luar (Webhook)
*   [FR Chaos Engineering](docs/srs/fr-chaos.md) - Logika dan mekanisme suntikan anomali
*   [FR AI Agent](docs/srs/fr-ai-agent.md) - Spesifikasi agen asisten kecerdasan buatan

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (Untuk Frontend & Node Backend)
- Go 1.20+ (Untuk Go Backend)
- Docker Desktop
- npm atau yarn

### Installation & Run

```bash
# 1. Clone repository
git clone <repository-url>
cd iotkit-studio

# 2. Start PostgreSQL (Docker)
docker-compose up -d postgres

# 3. Setup & Run Frontend
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### 4. Menjalankan Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate dev
npm run dev
```

### Access URL
- **Frontend App**: http://localhost:3000
- **Backend API**: http://localhost:4000

---

## 🗄️ PostgreSQL Database Configuration

Konfigurasi database bawaan untuk lingkungan pengembangan lokal:
```ini
Host: localhost
Port: 5432
Database: iotkit_studio
Username: iotkit
Password: iotkit123
```

### Prisma Commands
```bash
cd backend

# View database (GUI Studio)
npm run prisma:studio

# Run migrations
npm run prisma:migrate dev

# Generate Prisma client
npm run prisma:generate
```

---

## 📝 License
Distribusi ini berada di bawah lisensi **MIT**.

**Happy Coding! 🚀**
