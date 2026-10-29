# Functional Requirements: AI Agent

Fitur Asisten AI (berbasis Gemini) merupakan nilai jual utama (*core feature*) IoTKit Studio yang dirancang untuk mempercepat produktivitas dan mempermudah pengguna.

## 1. Natural Language Interface
- Antarmuka AI Agent berada di halaman `/ai-agent` dan terintegrasi ke dalam UI dasbor *Stormy Morning*.
- Pengguna dapat mengetikkan perintah menggunakan bahasa natural (Bahasa Indonesia atau Inggris).

## 2. Autonomous Project Creation
- AI Agent dilengkapi dengan akses terhadap kapabilitas *backend* (menggunakan arsitektur *Function Calling* / *Tools*).
- Jika pengguna mengetik, misalnya: *"Buatkan saya project MQTT ke broker.hivemq.com port 1883 dengan nama Sensor Suhu"*, AI Agent harus bisa secara otonom memanggil fungsi backend untuk membuatkan data proyek tersebut di *database*.
- Setelah proyek selesai dibuat oleh AI, Agent memberikan konfirmasi beserta tautan menuju proyek tersebut di dalam antarmuka percakapan.

## 3. Persistent Chat History & Context Sliding Window
- Seluruh riwayat percakapan (`ChatSession` dan `ChatMessage`) disimpan persisten di dalam *database* PostgreSQL.
- Riwayat *chat* dimuat kembali ketika *user* membuka kembali sesi percakapan (*persistent context*).
- Sistem menerapkan mekanisme **Context Sliding Window (maksimal 15 pesan percakapan terakhir)** saat meneruskan konteks ke LLM via OpenRouter, guna mencegah lonjakan konsumsi token (*token explosion*), menjaga latensi tetap rendah, dan menghindari galat *context length exceeded* pada percakapan panjang.

## 4. Unlimited Prompts & Session Management
- Sistem beroperasi dalam mode **Unlimited**, tanpa pembatasan kuota prompt harian.
- Pengguna dapat membuat sesi baru atau menghapus riwayat sesi lama secara manual melalui antarmuka (*Purge Session*).
