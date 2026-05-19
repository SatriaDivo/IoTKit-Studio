# Functional Requirements: Telemetry & Payload Simulation

## 1. Visual Payload Builder
- Sistem harus menyediakan antarmuka pembuat kerangka JSON (*Visual JSON Builder*).
- Pengguna dapat menambahkan struktur parameter data (misal: "temperature", "humidity", "status") tanpa mengetik baris kode apa pun.
- Setiap *field* (parameter) harus bisa dikonfigurasi tipe *data generation*-nya:
  - **Static Value:** Nilai teks/angka tetap.
  - **Random Value:** Angka acak berdasarkan parameter Min dan Max (untuk sensor lingkungan seperti suhu).
  - **Boolean:** Penentuan nilai *True/False* secara acak atau kondisi tertentu.
  - **Timestamp / Incremental:** Injeksi tanggal waktu terkini (RFC3339) atau Unix timestamp milidetik secara dinamis.
- Saat JSON digeneralisasi untuk dikirim, nilainya di-*render* dinamis berdasarkan *rule* yang disetel.

## 2. Simulasi Data (Interval & Batch)
- **Konfigurasi Interval (Seconds):** Pengguna menyetel seberapa cepat data dikirimkan menggunakan satuan **Detik (Seconds)** secara default (bukan milidetik) untuk kemudahan pembacaan (misal: 15s). Unit detik ini dikonversi secara otomatis di tingkat backend menjadi milidetik (ms).
- **Countdown Timer UI:** Antarmuka detail proyek menyediakan indikator waktu mundur (*countdown timer*) visual (misal: dari 15s turun ke 0s) dengan tingkat penyegaran resolusi tinggi (100ms) untuk memberikan umpan balik pergerakan jarum detik yang mulus sebelum data berikutnya dikirimkan.
- **State Persistence & Resume:** Status timer mundur dan konfigurasi simulasi disimpan per proyek di browser menggunakan `localStorage`. Hal ini menjamin bahwa jika pengguna tidak sengaja me-refresh halaman atau berpindah menu dan kembali lagi, simulasi yang sedang berjalan akan otomatis melanjutkan (*resume*) status countdown-nya tanpa terputus.
- **Project List Simulation Synchronization:** Pemicuan simulasi dari luar proyek (tombol Start di halaman daftar proyek) disinkronkan sepenuhnya dengan membaca preferensi `useDataset`, `selectedDatasetId`, dan `simSettings` dari `localStorage` proyek bersangkutan agar menghasilkan perilaku yang konsisten dengan halaman detail proyek.
- Engine (**Golang Simulation Manager**) akan mulai melempar *payload* JSON secara *loop* asinkron melalui *Goroutines* hingga dihentikan (Stop) secara eksplisit oleh klien.
- Engine dapat mengirim kumpulan data sekaligus (*Batch Size*) dalam satu interaksi per-goroutine.

## 3. Komunikasi Transport (Multi-Protocol)
- Engine Go wajib dapat membangun koneksi TCP (*socket*) langsung ke MQTT Broker (via library `paho.mqtt`), HTTP / HTTPS REST endpoints kustom, dan WebSocket target (via Gorilla `websocket`).
- Setiap koneksi harus mengakomodir kegagalan jaringan dengan mekanisme perlindungan: batas waktu *timeout*, *reconnection strategy* otomatis, dan penanganan status respons non-200.

## 4. Dataset Replay (Playback Data Historis)
- Platform menyediakan fitur untuk mengunggah berkas **CSV Dataset**.
- Engine Go akan membaca berkas tersebut secara asinkron, memetakan data kolom flat menjadi struktur nested JSON, dan mengirimkannya baris-demi-baris sesuai dengan interval yang ditentukan.
- Menyediakan penyaringan otomatis berdasarkan `device_id` atau `deviceId` statis yang diatur oleh pengguna, memastikan payload yang terkirim konsisten.

## 5. Swarm Mode (Stress Testing)
- Pengguna dapat mensimulasikan beban tinggi dari banyak Virtual Users (VUs) paralel.
- Mendukung konfigurasi bertahap (**Load Test Stages**) yang mengatur durasi dan target VUs secara dinamis (*ramp-up* dan *ramp-down*).
- Secara otomatis menyuntikkan ID perangkat unik kustom per-VU (misal: `DEVICE-ID-VU-1`, `DEVICE-ID-VU-2`) untuk mensimulasikan swarm IoT riil.

## 6. Chaos Engineering (Anomaly Injector)
- Memungkinkan penyuntikan anomali data telemetry kustom (misal: lonjakan nilai numerik ekstrem atau pembalikan boolean) berdasarkan probabilitas kustom yang ditentukan (0% - 100%).

