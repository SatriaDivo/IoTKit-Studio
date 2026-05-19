# Project Scope

Dokumen ini mendefinisikan batasan fitur apa saja yang termasuk (*in-scope*) dan tidak termasuk (*out-of-scope*) dalam pengembangan platform **IoTKit Studio**.

## In-Scope (Termasuk dalam Cakupan Proyek)

1. **Authentication & Authorization:** Sistem manajemen pengguna, registrasi, dan perlindungan *route* menggunakan JWT.
2. **Project & Node Management:** Pembuatan proyek simulasi dengan konfigurasi *host*, *port*, protokol, otentikasi (Token/Basic Auth), dan *endpoint/topic*.
3. **Visual Payload Builder:** Pembuatan *template* JSON dinamis secara antarmuka grafis yang mendukung berbagai tipe nilai (teks statis, angka *random*, rentang min-max, *boolean*, dll).
4. **High-Performance Go Simulation Engine:** [*NEW*] *Backend simulation engine* berbasis **Golang (Go Fiber + GORM)** yang memanfaatkan *goroutines* untuk eksekusi pengiriman *payload* secara konstan/interval dengan konsumsi memori minimal (hanya ~2-4KB per Virtual User).
5. **Multi-Protocol Client Support:** Mendukung HTTP/HTTPS, MQTT/MQTTS (menggunakan Eclipse Paho MQTT), dan WS/WSS (menggunakan Gorilla WebSocket).
6. **Dataset Replay (Playback Data Historis):** [*NEW*] Fitur mengunggah berkas CSV riil dan memutarnya kembali baris-demi-baris dengan streaming memory-efficient serta dukungan filtrasi `device_id` statis.
7. **Swarm Mode (Load Testing):** [*NEW*] Mensimulasikan ratusan hingga ribuan perangkat secara simultan dengan pembagian Virtual User (VUs) dan konfigurasi target bertahap (*ramp-up/ramp-down stages*).
8. **Real-time Monitoring & Logs:** Fitur melihat arus data (*payload* terkirim, status, respon dari server, kode *error*, latensi) secara *real-time* menggunakan koneksi *WebSocket Hub* Go Fiber yang sangat ringan.
9. **Analytics Dashboard:** Dasbor visual (menggunakan grafik *Recharts*) untuk merangkum tren keberhasilan *payload*, penggunaan protokol, dan distribusi *error*.
10. **AI Agent (Gemini):** *Chatbot* asisten cerdas yang didukung fitur untuk membantu perancangan *payload* dan eksekusi pembuatan proyek berbasis perintah natural (*Natural Language*).
11. **Chaos Engineering (Anomaly Injector):** Fitur menyuntikkan anomali data (lonjakan ekstrem & boolean flipping) secara terjadwal/probabilistik guna menguji ketangguhan alert system server pelanggan.
12. **Webhook Ingestion Engine:** Bertindak sebagai **penerima data eksternal** (Server/Receiver) melalui endpoint webhook publik dinamis per-proyek dengan real-time logging.

## Out-of-Scope (Di Luar Cakupan Proyek)

1. **Simulasi Hardware Fisik:** Platform tidak menyediakan integrasi langsung ke sirkuit GPIO atau papan mikrokontroler fisik seperti Arduino/Raspberry Pi.
2. **Hosting Broker MQTT Internal:** Platform bertindak sebagai **klien** (*Client/Publisher*) untuk MQTT dan **tidak** memfasilitasi hosting broker MQTT internal secara mandiri.
3. **Firmware Generation:** Platform tidak mendukung *export payload* menjadi kode C++/Python/MicroPython yang dapat langsung di-*flash* ke dalam perangkat IoT.

