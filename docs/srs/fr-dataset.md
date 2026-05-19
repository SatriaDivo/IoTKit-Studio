# Functional Requirements: Dataset Module

Sebagai pelengkap dari fitur pembuatan data *random* (acak) melalui Visual Payload Builder, IoTKit Studio menyediakan pemutaran simulasi dari rekaman data dunia nyata (*Dataset Playback*) untuk ekosistem perangkat khusus.

## 1. Integrasi Modul Spesifik
- Sistem mendukung injeksi data terstruktur (CSV/JSON) yang diklasifikasikan ke dalam **Module Name** khusus:
  - **HERA**
  - **Drone**
  - **Carbon**

## 2. Dataset Management
- **JSON-based Ingestion API:** Pengunggahan file dataset tidak menggunakan form-data biner, melainkan melalui endpoint `POST /api/datasets/upload` berbasis JSON string body mentah yang berisi data file (`content`), nama file asli (`name`), nama file sistem (`fileName`), dan kategori modul (`moduleName`). Hal ini meminimalkan overhead transmisi data.
- **SHA256 & Metadata Generator:** Begitu file JSON teks diterima, backend Go secara dinamis memproduksi nilai *SHA256 Checksum* yang unik, mengkalkulasi ukuran file dalam bytes, serta memproses baris CSV untuk menghitung jumlah baris valid (*Loaded Rows*) vs baris rusak (*Skipped Rows*) secara instan sebelum melakukan penyimpanan file fisik di server.
- **Dataset Rename API:** Menyediakan antarmuka visual terintegrasi dengan endpoint `PUT /api/datasets/:id/name` agar pengguna dapat mengubah nama tampilan kustom berkas dataset yang terdaftar di sistem.

## 3. Data-Driven Simulation
- Saat Engine (*Simulation Manager*) dihidupkan dalam mode spesifik modul (`mode: scenario`), *backend* akan membaca Dataset CSV secara berurutan (*stream*) baris demi baris, lalu mengirimkannya sebagai *payload* JSON ke server target (*host*).
- Setiap *batch size* pengiriman dapat disesuaikan kecepatannya berdasarkan parameter `interval`.
