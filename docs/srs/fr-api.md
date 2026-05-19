# Functional Requirements: API & Backend

IoTKit Studio mengadopsi arsitektur **Paralel Dual-Backend (Node.js & Go)** yang memiliki **100% kesamaan fitur (Feature Parity)**. Pengguna dapat memilih untuk menjalankan salah satu dari kedua backend tersebut secara mandiri (*standalone*), karena keduanya berbagi skema database PostgreSQL yang sama:
1. **Node.js & Express Backend (`/backend`)**: Backend berbasis JavaScript/TypeScript (Express + Prisma) lengkap dengan simulasi, ingestor webhook, Socket.IO, dan AI Agent (Gemini/OpenRouter).
2. **Golang & Go Fiber Backend (`/backend-go`)**: Backend berbasis Go (Fiber + GORM) lengkap dengan simulasi berkecepatan tinggi berbasis Goroutine, ingestor webhook berkecepatan tinggi, Go WebSocket Hub, dan AI Agent (OpenRouter) yang sangat hemat memori.

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
- `GET /`: Mengambil *history logs* global (dilengkapi filter limit dan pencarian).
- `GET /project/:projectId`: Mengambil riwayat log aktivitas khusus untuk proyek tertentu (digunakan untuk visualisasi analitik detail proyek).
- `DELETE /`: Menghapus seluruh log global proyek.
- `DELETE /project/:projectId/clear`: Menghapus secara permanen seluruh riwayat log yang terkait dengan proyek tertentu (termasuk log webhook).

### 6. Dataset Service (`/api/datasets`)
- `POST /upload`: Mengunggah file dataset CSV terstruktur berbasis payload JSON mentah.
- `GET /`: Mengambil daftar seluruh dataset yang tersedia di sistem.
- `PUT /:id/name`: Mengubah nama visual/alias dari file dataset terpilih.
- `DELETE /:id`: Menghapus data dataset fisik dan metadatanya dari sistem.

### 7. AI Agent Service (`/api/ai-agent`)
- `GET /chat`: Menampilkan daftar sesi *chat* sebelumnya.
- `POST /chat`: Berkomunikasi dengan *LLM Agent* menggunakan pesan teks. Agent dapat membaca *tool metadata* untuk melangsungkan aksi administratif di backend.

### 8. Webhook & Ingestion Service (`/api/webhook-manage` & `/api/webhook`)
- `GET /webhook-manage/info/:projectId` (Auth required): Mengambil detail konfigurasi webhook aktif dan token proyek.
- `POST /webhook-manage/generate/:projectId` (Auth required): Selalu menghasilkan token UUID baru yang segar (menghapus token lama dari database) untuk mengaktifkan/me-regenerasi listener webhook unik proyek.
- `DELETE /webhook-manage/clear/:projectId` (Auth required): Menonaktifkan endpoint listener webhook proyek (menghapus token aktif), tetapi **tetap mempertahankan** riwayat log masuk yang sudah terekam di database.
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

