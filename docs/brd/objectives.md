# Business Objectives

Tujuan utama dari pengembangan **IoTKit Studio** adalah sebagai berikut:

## 1. Memangkas Waktu Pengujian (*Time-to-Market*)
Meniadakan kebutuhan pengembangan *hardware* fisik atau skrip *dummy* secara manual hanya untuk menguji kapasitas server atau integrasi *endpoint* (MQTT/HTTP). Pengguna dapat langsung merancang dan mensimulasikan ratusan skenario pengiriman *payload* dalam hitungan menit melalui *Dashboard*.

## 2. Platform Agnostik & Multi-Protokol
Memastikan platform dapat diintegrasikan dengan infrastruktur IoT manapun berkat dukungan penuh pada protokol standar industri:
- **HTTP / HTTPS** untuk RESTful API.
- **MQTT / MQTTS** untuk ekosistem *broker* data (misal: EMQX, HiveMQ, Mosquitto).
- **WebSocket (WS/WSS)** untuk komunikasi *real-time* dua arah.

## 3. Kemudahan Akses Tanpa Kode (*No-Code Experience*)
Memberdayakan pengguna non-programmer (seperti analis, manajer proyek, atau siswa) untuk mengonfigurasi skenario uji *payload* sensor dengan Visual Payload Builder dan **AI Agent Assistant**.

## 4. Pemantauan Real-Time dan Analitik Data
Menyediakan fitur *Monitoring* (Log) dan *Analytics Dashboard* agar setiap keberhasilan, kegagalan (seperti *Error 422* atau koneksi *Timeout*), serta pengukuran performa latensi (*latency*) dapat langsung divisualisasikan dalam bentuk grafik waktu nyata.
