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
- Pengguna dapat menyetel seberapa cepat data dikirimkan (*Interval* dalam *milliseconds*, misalnya 1000ms = 1 detik).
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

