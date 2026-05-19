# Functional Requirements: API & Backend

IoTKit Studio mengadopsi arsitektur **Dual-Backend** yang dirancang untuk performa dan keandalan tinggi:
1. **Legacy Node.js & Express Backend (`/backend`)**: Mengelola modul administratif, orkestrasi sistem, autentikasi sekunder, dan *AI Agent (Gemini)*.
2. **Golang & Go Fiber Backend (`/backend-go`)**: Engine simulasi utama berkecepatan tinggi, *Webhook Ingestion*, *Database Persistence* via **GORM**, dan *WebSocket Real-Time Hub* untuk komunikasi dua arah yang super ringan.

## API Endpoints Utama

### 1. Auth Service (`/api/auth`)
- `POST /register`: Pendaftaran pengguna baru.
- `POST /login`: Autentikasi untuk mendapatkan *JSON Web Token* (JWT).
- `GET /me`: Pengambilan profil *user* yang sedang aktif.

### 2. Project Service (`/api/projects`)
- `GET /`: Menampilkan daftar semua proyek IoT milik *user*.
- `POST /`: Membuat konfigurasi proyek/Node IoT baru (Host, Port, Protokol).
- `GET /:id`: Mengambil detail proyek spesifik beserta status relasionalnya.
- `PUT /:id` & `DELETE /:id`: Ubah/hapus proyek.

### 3. Payload Service (`/api/payloads`)
- `POST /`: Menyimpan desain hierarki JSON ke database.
- `GET /project/:projectId`: Mengambil payload builder berdasarkan ID proyek.
- `PUT /:id` & `DELETE /:id`: Ubah/hapus payload builder field.

### 4. Simulation Service (`/api/simulations`)
- `POST /start`: Mengaktifkan *Go Goroutines* / interval pengiriman data ke target host (HTTP, MQTT, atau WS).
- `POST /stop`: Menghentikan proses simulasi proyek.
- `GET /status/:projectId`: Polling endpoint untuk mengecek status mesin dan statistik (`totalSent`, `successCount`, `errorCount`).

### 5. Log & Analytics Service (`/api/logs`)
- `GET /`: Mengambil *history logs* proyek (dilengkapi filter limit dan pencarian).
- `DELETE /`: Menghapus seluruh log proyek.

### 6. AI Agent Service (`/api/ai-agent`)
- `GET /chat`: Menampilkan daftar sesi *chat* sebelumnya.
- `POST /chat`: Berkomunikasi dengan *LLM Agent* menggunakan pesan teks. Agent dapat membaca *tool metadata* untuk melangsungkan aksi administratif di backend.

### 7. Webhook & Ingestion Service (`/api/webhook-manage` & `/api/webhook`)
- `GET /webhook-manage/info/:projectId` (Auth required): Mengambil detail konfigurasi webhook aktif dan token proyek.
- `POST /webhook-manage/generate/:projectId` (Auth required): Menghasilkan token UUID baru acak untuk mengaktifkan listener webhook unik proyek.
- `DELETE /webhook-manage/clear/:projectId` (Auth required): Menghapus token dan menonaktifkan endpoint listener webhook proyek.
- `GET /webhook-manage/history/:projectId` (Auth required): Mengambil riwayat log request webhook masuk khusus untuk proyek terkait.
- `ALL /api/webhook/:token` (PUBLIC, Tanpa Auth): Endpoint publik tempat perangkat fisik IoT atau client eksternal mengirim payload data secara real-time.

## Real-Time Protocol (Go WebSocket Hub - `/ws`)
Backend Go menyediakan koneksi WebSocket persisten di endpoint `/ws` menggunakan `gofiber/contrib/websocket`:
- **Room Subscription:** Client dapat bergabung atau keluar dari kamar real-time dengan mengirim pesan JSON:
  - `{ "action": "subscribe", "room": "project:id" }`
  - `{ "action": "unsubscribe", "room": "project:id" }`
- **Pesan Siaran (Broadcast Events):**
  - `Event: payloadSent`: Dikirimkan oleh backend ke room proyek bersangkutan setiap kali payload berhasil terkirim via HTTP, MQTT, atau WebSocket target.
  - `Event: webhookReceived`: Dikirimkan ke room proyek (`project:id`) atau room webhook (`webhook:token`) setiap kali ada request webhook luar yang masuk.

