# Functional Requirements: Webhook Ingestion

Platform **IoTKit-Studio** mendukung penangkapan data luar (*Ingestion*) secara dua arah melalui **Webhook Listener**. Fitur ini memungkinkan perangkat keras IoT riil (seperti ESP32 / ESP8266) atau platform cloud pihak ketiga mengirim data payload secara langsung ke studio.

---

## 🛠️ Alur Fitur & Spesifikasi Teknis

### 1. Webhook Lifecycle Management (Dasbor Internal)
*   **Generate Endpoint:** Pengguna dapat men-generate URL unik per-proyek secara aman. Sistem akan menghasilkan UUID acak yang bertindak sebagai *public token*.
*   **Disable/Clear Endpoint:** Pengguna dapat mematikan endpoint kapan saja. Sistem akan menghapus token dari database, sehingga request berikutnya ke URL tersebut akan ditolak (404 Not Found).
*   **Security Model:** Endpoint publik dapat diakses tanpa JWT auth, namun dilindungi oleh token UUID acak yang panjang dan aman.

### 2. Public Endpoint Ingestion (`POST /api/webhook/:token`)
*   Menerima HTTP request dengan method `POST` (dan method relevan lainnya) tanpa membutuhkan session/cookie.
*   **Data Parsing:** Mengurai parameter kueri, header HTTP, dan payload body JSON.
*   **Persistence:** Setiap request dicatat di tabel `Log` dengan tipe `"webhook"`, merekam alamat IP pengirim, timestamp, ukuran payload, header, dan isi body JSON.
*   **Real-time Streaming:** Backend memancarkan data masuk via Socket.IO ke room `webhook:${token}` dan `project:${projectId}` agar halaman log ter-update seketika tanpa refresh.

### 3. Visual Instruction Selector (Client Guide)
Dasbor menyediakan panduan pengiriman data cepat yang interaktif dengan tiga opsi tab bahasa:
1.  **PowerShell:** Menggunakan tanda grave-accent (`` ` ``) untuk menyambung baris teks multi-line yang kompatibel dengan terminal Windows.
2.  **cURL (Bash):** Menggunakan tanda backslash (`\`) standar.
3.  **Python:** Contoh script menggunakan library `requests` untuk pengiriman JSON.

### 4. Robust Clipboard Copy (Penyalinan Tangguh)
Sistem penyalinan template perintah di frontend dilengkapi mekanisme ganda:
*   Mencoba menggunakan API modern `navigator.clipboard.writeText`.
*   Jika gagal (karena browser berjalan pada jaringan lokal non-HTTPS / HTTP biasa), sistem beralih menggunakan *legacy element-creation & document execution* (`document.execCommand('copy')`) agar penyalinan di sisi pengguna dijamin 100% berhasil.
