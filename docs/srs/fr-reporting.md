# Functional Requirements: Reporting & Logging

## 1. Pencatatan Aktivitas Transmisi
- Setiap kali mesin (*Engine*) berhasil maupun gagal mengeksekusi operasi pengiriman (*send/publish*), data transaksi tersebut wajib di-rekam ke dalam tabel `Log`.
- Data yang dicatat meliputi:
  - **Type**: Apakah transaksi merupakan Request keluar, Response masuk, atau *System Error*.
  - **Payload Body**: Data spesifik (JSON) yang terkirim pada iterasi waktu tersebut.
  - **Timestamp**: Waktu tepat (milidetik).
  - **Latency**: Durasi pulang-pergi paket (dari *request* dikirim hingga *response* diterima).

## 2. Live Socket.io Reporting
- Selama simulasi berjalan (klien berada di halaman Dashboard/Projek), setiap log baru harus diekstraksi nilainya dan segera dipancarkan kembali (*emitted*) melalui WebSocket ke grup pengguna (`room`) agar UI memutakhirkan tampilan *Live Stats* tanpa memerlukan *refresh* (AJAX *polling* setiap sekian milidetik).

## 3. Halaman Analytics (Logs History)
- Pengguna harus disediakan daftar (*Grid/Table View*) untuk merekapitulasi seluruh pengiriman dan status respon server.
- Fitur *Filter* & *Search* harus disediakan (misal: mencari log berdasarkan tipe protokol "HTTP" atau status code "404").
