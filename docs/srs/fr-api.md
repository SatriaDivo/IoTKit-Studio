# Functional Requirements: API & Backend

IoTKit Studio mengadopsi arsitektur *RESTful API* menggunakan Node.js dan Express, ditambah dengan Socket.IO untuk pembaruan *real-time*.

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
- `POST /:projectId`: Menyimpan desain hierarki JSON ke tabel `Payload` berdasarkan ID proyek.

### 4. Simulation Service (`/api/simulations`)
- `POST /start/:projectId`: Mengaktifkan *worker thread* / interval pengiriman data ke target host.
- `POST /stop/:projectId`: Menghentikan proses pengiriman *payload*.
- `GET /status/:projectId`: *Polling endpoint* untuk mengecek status mesin dan statistik (`totalSent`, `successCount`, `errorCount`).

### 5. Log & Analytics Service (`/api/logs`)
- `GET /`: Mengambil *history logs* proyek (dilengkapi filter limit, protocol, dan rentang waktu).
- *Analytics Endpoint:* Menyediakan data agregrasi (grafik) untuk *Dashboard*.

### 6. AI Agent Service (`/api/ai-agent`)
- `GET /chat`: Menampilkan daftar sesi *chat* sebelumnya.
- `POST /chat`: Berkomunikasi dengan *LLM Agent* menggunakan pesan teks. Agent dapat membaca *tool metadata* untuk melangsungkan aksi administratif di backend.

## Real-Time Protocol (Socket.IO)
Backend wajib mengekspos *Event Listener* di *root endpoint*:
- `Event: subscribe`: *Client* mendaftar ke kanal (`project:id`) untuk memantau status secara langsung.
- `Event: payloadSent`: Di-*emit* oleh backend ke kanal proyek yang bersangkutan setiap kali *payload* berhasil dilontarkan.
- `Event: payloadError`: Di-*emit* jika terjadi *timeout*, respons 4xx/5xx, atau *host unreachable*.
