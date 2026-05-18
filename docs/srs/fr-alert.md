# Functional Requirements: Alerts & Notifications

## 1. UI Feedback & Toast Notifications
- Setiap interaksi form (sukses menyimpan proyek, gagal memuat data) harus memberikan balasan/notifikasi (Toasts) yang jelas pada antarmuka. (Library: `react-hot-toast`).
- Toast harus berwarna merah untuk galat (*Error*), hijau untuk keberhasilan (*Success*), dan kuning untuk sekadar informasi.

## 2. Peringatan Kegagalan Transmisi (End-to-End)
- Jika mesin simulasi (*SimulationManager*) tidak mampu menjangkau *host* target akibat *Connection Refused*, sistem harus segera mencetak status `error` tanpa mengulangi pemanggilan koneksi yang menyumbat *thread* utama (mencegah Node.js *Memory Leak*).
- Panel khusus (blok UI **Server Response**) akan tersembunyi hingga server tujuan mengembalikan pesan valid atau menolak koneksi. Saat ada tolakan seperti Status 4xx (422 Unprocessable Entity) atau 5xx, pesan respons (*body* balasan) wajib dimunculkan dengan blok merah untuk memudahkan *developer* me-*debug* apa yang salah dari *payload* tersebut.
