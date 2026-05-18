# Functional Requirements: Dataset Module

Sebagai pelengkap dari fitur pembuatan data *random* (acak) melalui Visual Payload Builder, IoTKit Studio menyediakan pemutaran simulasi dari rekaman data dunia nyata (*Dataset Playback*) untuk ekosistem perangkat khusus.

## 1. Integrasi Modul Spesifik
- Sistem mendukung injeksi data terstruktur (CSV/JSON) yang diklasifikasikan ke dalam **Module Name** khusus:
  - **HERA**
  - **Drone**
  - **Carbon**

## 2. Dataset Management
- Data *file* (Dataset) yang diunggah pengguna harus dipindai dan disimpan metadatanya ke dalam tabel `Dataset`.
- Parameter metadata mencakup *File Size*, *Checksum SHA256* (untuk integritas file), *Delimiter* pemisah (seperti koma), serta kalkulasi *Loaded Rows* vs *Skipped Rows* (baris rusak).

## 3. Data-Driven Simulation
- Saat Engine (*Simulation Manager*) dihidupkan dalam mode spesifik modul (`mode: scenario`), *backend* akan membaca Dataset CSV secara berurutan (*stream*) baris demi baris, lalu mengirimkannya sebagai *payload* JSON ke server target (*host*).
- Setiap *batch size* pengiriman dapat disesuaikan kecepatannya berdasarkan parameter `interval`.
