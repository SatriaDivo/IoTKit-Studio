# Functional Requirements: AI Agent

Fitur Asisten AI (berbasis Gemini) merupakan nilai jual utama (*core feature*) IoTKit Studio yang dirancang untuk mempercepat produktivitas dan mempermudah pengguna.

## 1. Natural Language Interface
- Antarmuka AI Agent berada di halaman `/ai-agent` dan terintegrasi ke dalam UI dasbor *Stormy Morning*.
- Pengguna dapat mengetikkan perintah menggunakan bahasa natural (Bahasa Indonesia atau Inggris).

## 2. Autonomous Project Creation
- AI Agent dilengkapi dengan akses terhadap kapabilitas *backend* (menggunakan arsitektur *Function Calling* / *Tools*).
- Jika pengguna mengetik, misalnya: *"Buatkan saya project MQTT ke broker.hivemq.com port 1883 dengan nama Sensor Suhu"*, AI Agent harus bisa secara otonom memanggil fungsi backend untuk membuatkan data proyek tersebut di *database*.
- Setelah proyek selesai dibuat oleh AI, Agent memberikan konfirmasi beserta tautan menuju proyek tersebut di dalam antarmuka percakapan.

## 3. Persistent Chat History
- Seluruh riwayat percakapan (`ChatSession` dan `ChatMessage`) harus disimpan di dalam *database* PostgreSQL.
- Riwayat *chat* dimuat kembali ketika *user* masuk ulang, sehingga konteks pembicaraan tidak hilang (*persistent context*).

## 4. Auto-Cleanup Scheduler
- Untuk mencegah penumpukan data *chat* di server, terdapat fungsi penjadwal (*CRON Job / Scheduler*) yang berjalan di *backend* (setiap pukul 00:00).
- Penjadwal ini bertugas menghapus sesi *chat* lama yang sudah tidak relevan (*auto-delete*).
