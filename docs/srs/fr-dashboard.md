# Functional Requirements: Dashboard & UI

## 1. Desain Industrial & Navigasi Utama
- Antarmuka (UI) wajib menggunakan pedoman tata letak *Stormy Morning Design System* dengan skema warna industrial (*Slate Blue*, *Dark Slate*). Tidak diperbolehkan menggunakan desain *chatbot* standar yang umum digunakan di platform AI biasa.
- Sistem harus memiliki *Sidebar* navigasi yang intuitif untuk perpindahan cepat antar rute utama: `Dashboard`, `Projects`, `Analytics`, `AI Agent`, dan `Logs`.

## 2. Rangkuman Metrik (Dashboard Overview)
- Halaman *Overview* (beranda dasbor) harus mengambil dan merangkum metrik pengiriman data:
  1.  **Total Payload Sent**: Agregat jumlah pesan yang telah dikirim seluruh proyek.
  2.  **Success Rate**: Persentase *payload* yang direspons sukses (200 OK) vs error.
  3.  **Average Latency**: Rata-rata waktu tempuh transmisi (*milliseconds*).
- Visualisasi ini harus didukung oleh pustaka `Recharts` menggunakan diagram *Area*, *Line*, *Pie*, atau *Bar*. Semua metrik ini harus berdasarkan **data historis nyata** dari *database*, bukan *dummy data*.

## 3. Form Manajemen Dinamis
- Semua form input (*host*, *port*, *protocol*) harus memiliki *state validation*.
- Input form secara proaktif mengisi *port default* (`443` untuk HTTPS, `1883` untuk MQTT) saat opsi protokol diubah.
- URL yang di-*paste* oleh pengguna ke dalam kolom *Host* harus secara otomatis dipisahkan (di-*parse*) menjadi *Protocol*, *Host*, *Port*, dan *Path* yang benar.
