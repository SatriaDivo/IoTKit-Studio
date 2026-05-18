# Project Scope

Dokumen ini mendefinisikan batasan fitur apa saja yang termasuk (*in-scope*) dan tidak termasuk (*out-of-scope*) dalam pengembangan platform **IoTKit Studio**.

## In-Scope (Termasuk dalam Cakupan Proyek)

1. **Authentication & Authorization:** Sistem manajemen pengguna, registrasi, dan perlindungan *route* menggunakan JWT.
2. **Project & Node Management:** Pembuatan proyek simulasi dengan konfigurasi *host*, *port*, protokol, otentikasi (Token/Basic Auth), dan *endpoint/topic*.
3. **Visual Payload Builder:** Pembuatan *template* JSON dinamis secara antarmuka grafis yang mendukung berbagai tipe nilai (teks statis, angka *random*, rentang min-max, *boolean*, dll).
4. **Real-time Simulation Engine:** *Backend engine* yang mampu mengeksekusi pengiriman *payload* secara konstan/interval, mengelola koneksi (*connect/disconnect/reconnect*), dan menangkap respons dari server tujuan.
5. **Real-time Monitoring & Logs:** Fitur melihat arus data (*payload* terkirim, status, respon dari server, kode *error*, latensi) secara *real-time* menggunakan koneksi *Socket.io*.
6. **Analytics Dashboard:** Dasbor visual (menggunakan grafik *Recharts*) untuk merangkum tren keberhasilan *payload*, penggunaan protokol, dan distribusi *error*.
7. **AI Agent (Gemini):** *Chatbot* asisten cerdas yang didukung fitur untuk membantu perancangan *payload* dan eksekusi pembuatan proyek berbasis perintah natural (*Natural Language*).
8. **Chaos Engineering (Anomaly Injector):** [*NEW*] Fitur menyuntikkan anomali data (lonjakan ekstrem & boolean flipping) secara terjadwal/probabilistik guna menguji ketangguhan alert system server pelanggan.
9. **Webhook Ingestion Engine:** [*NEW*] Bertindak sebagai **penerima data eksternal** (Server/Receiver) melalui endpoint webhook publik dinamis per-proyek dengan real-time logging.

## Out-of-Scope (Di Luar Cakupan Proyek)

1. **Simulasi Hardware Fisik:** Platform tidak menyediakan integrasi langsung ke sirkuit GPIO atau papan mikrokontroler fisik seperti Arduino/Raspberry Pi.
2. **Hosting Broker MQTT Internal:** Platform bertindak sebagai **klien** (*Client/Publisher*) untuk MQTT dan **tidak** memfasilitasi hosting broker MQTT internal secara mandiri.
3. **Firmware Generation:** Platform tidak mendukung *export payload* menjadi kode C++/Python/MicroPython yang dapat langsung di-*flash* ke dalam perangkat IoT.
