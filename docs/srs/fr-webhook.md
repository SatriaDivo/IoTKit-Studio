# Functional Requirements: Webhook Ingestion

Platform **IoTKit-Studio** mendukung penangkapan data luar (*Ingestion*) secara dua arah melalui **Webhook Listener**. Fitur ini memungkinkan perangkat keras IoT riil (seperti ESP32 / ESP8266) atau platform cloud pihak ketiga mengirim data payload secara langsung ke studio.

---

## 🛠️ Alur Fitur & Spesifikasi Teknis

### 1. Webhook Lifecycle Management (Dasbor Internal)
*   **Generate Endpoint:** Pengguna dapat men-generate URL unik per-proyek secara aman. Sistem akan menghasilkan UUID acak yang bertindak sebagai *public token*.
*   **Regenerate Token (Pembaruan Seketika):** Tombol **Regenerate Token** akan *selalu* men-generate token UUID baru yang segar dan menggantikan token lama di database secara instan. URL webhook yang lama langsung ditolak dengan status *404 Not Found* demi alasan keamanan jika terjadi kebocoran token.
*   **Disable Webhook (Tanpa Kehilangan Data):** Menonaktifkan webhook akan menghapus token aktif dari database (mematikan URL cURL), tetapi **tidak akan menghapus riwayat log masuk** (logs bertipe `"webhook"`) agar pengguna tetap dapat menganalisis data historis sebelumnya di layar.
*   **Clear Logs (Pembersihan Permanen):** Tombol **Clear** di panel *Incoming Requests* memicu pembersihan permanen khusus data log bertipe `"webhook"` milik proyek tersebut dari database PostgreSQL melalui endpoint `DELETE /api/logs/project/:projectId/clear`.
*   **Security Model:** Endpoint publik dapat diakses tanpa JWT auth, namun dilindungi oleh token UUID acak yang panjang dan aman.

### 2. Public Endpoint Ingestion (`POST /api/webhook/:token`)
*   Menerima HTTP request dengan method `POST` (dan method relevan lainnya) tanpa membutuhkan session/cookie.
*   **Data Parsing:** Mengurai parameter kueri, header HTTP, dan payload body JSON.
*   **Persistence:** Setiap request dicatat di tabel `Log` dengan tipe `"webhook"`, merekam alamat IP pengirim, timestamp, ukuran payload, header, dan isi body JSON.
*   **Real-time Streaming via Intelligent Polling:** Karena adanya migrasi ke backend Go berkecepatan tinggi dengan native WebSocket, frontend menyinkronkan daftar request webhook yang masuk menggunakan mekanisme **Polling HTTP Cerdas** berdurasi dipercepat (**1 detik**) ke endpoint `GET /api/webhook-manage/history/:projectId`. Hal ini memberikan efek pembaruan antarmuka instan (*near real-time*) sekaligus menghindari ketidakcocokan protokol library Socket.IO client dengan native Go WebSocket.

### 3. Visual Instruction Selector (Client Guide)
Dasbor menyediakan panduan pengiriman data cepat yang interaktif dengan tiga opsi tab bahasa:
1.  **PowerShell:** Menggunakan tanda grave-accent (`` ` ``) untuk menyambung baris teks multi-line yang kompatibel dengan terminal Windows.
2.  **cURL (Bash):** Menggunakan tanda backslash (`\`) standar.
3.  **Python:** Contoh script menggunakan library `requests` untuk pengiriman JSON.

### 4. Robust Clipboard Copy (Penyalinan Tangguh)
Sistem penyalinan template perintah di frontend dilengkapi mekanisme ganda:
*   Mencoba menggunakan API modern `navigator.clipboard.writeText`.
*   Jika gagal (karena browser berjalan pada jaringan lokal non-HTTPS / HTTP biasa), sistem beralih menggunakan *legacy element-creation & document execution* (`document.execCommand('copy')`) agar penyalinan di sisi pengguna dijamin 100% berhasil.
