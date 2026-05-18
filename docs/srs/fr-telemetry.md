# Functional Requirements: Telemetry & Payload Simulation

## 1. Visual Payload Builder
- Sistem harus menyediakan antarmuka pembuat kerangka JSON (*Visual JSON Builder*).
- Pengguna dapat menambahkan struktur parameter data (misal: "temperature", "humidity", "status") tanpa mengetik baris kode apa pun.
- Setiap *field* (parameter) harus bisa dikonfigurasi tipe *data generation*-nya:
  - **Static Value:** Nilai teks/angka tetap.
  - **Random Value:** Angka acak berdasarkan parameter Min dan Max (untuk sensor lingkungan seperti suhu).
  - **Boolean:** Penentuan nilai *True/False* secara acak atau kondisi tertentu.
- Saat JSON digeneralisasi untuk dikirim, nilainya di-*render* dinamis berdasarkan *rule* yang disetel.

## 2. Simulasi Data (Interval & Batch)
- Pengguna dapat menyetel seberapa cepat data dikirimkan (*Interval* dalam *milliseconds*, misalnya 1000ms = 1 detik).
- Engine (*Backend SimulationManager*) akan mulai melempar *payload* JSON secara *loop* hingga dihentikan (Stop) secara eksplisit oleh klien.
- Engine dapat mengirim kumpulan data sekaligus (*Batch Size*) dalam satu interaksi.

## 3. Komunikasi Transport
- Engine wajib dapat membangun koneksi TCP (*socket*) langsung ke MQTT Broker (via `mqtt.js`), membuat *long-lived HTTP connection* (via `axios`), atau WebSocket (via native `ws`).
- Setiap koneksi harus mengakomodir kegagalan jaringan dengan mekanisme perlindungan: batas waktu *timeout*, *reconnection strategy*, dan pendeteksian *invalid host*.
