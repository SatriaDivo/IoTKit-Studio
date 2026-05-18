# Stakeholders

Platform **IoTKit Studio** dikembangkan untuk memberikan nilai yang signifikan bagi beberapa kelompok pemangku kepentingan (*stakeholders*) yang terlibat dalam ekosistem pengembangan Internet of Things (IoT).

| Stakeholder Role | Deskripsi | Kepentingan Utama (Goals) |
| --- | --- | --- |
| **IoT System Architect / Engineer** | Insinyur yang mendesain arsitektur komunikasi data IoT dari *node* ke *server*. | Membutuhkan alat (*tool*) untuk melakukan verifikasi infrastruktur server dan *message broker* sebelum perangkat fisik (sensor) di lapangan siap diimplementasikan. |
| **Backend / API Developer** | Pengembang perangkat lunak yang bertugas menangkap (*ingest*) data sensor. | Membutuhkan pasokan data (*payload*) secara kontinu dengan format JSON yang bervariasi untuk menguji logika REST API, penguraian (*parsing*), dan beban sistem. |
| **Quality Assurance (QA) / Tester** | Tim yang menguji ketahanan aplikasi dan manajemen *error* (misal: validasi skema, respons 4xx/5xx). | Ingin mensimulasikan skenario *edge-case*, seperti pengiriman data yang salah format, nilai ekstrim (*out-of-bounds*), atau pengujian beban (*load testing*). |
| **Project Manager / Product Owner** | Pemimpin proyek yang bertanggung jawab atas pengiriman produk akhir tepat waktu. | Mengharapkan agar fase *development* berjalan lebih singkat tanpa tertunda oleh belum tersedianya *hardware* fisik. |
| **System Administrator** | Administrator yang mengelola infrastruktur *server* dan keandalan sistem jaringan. | Melakukan pengujian latensi jaringan, penanganan koneksi WebSocket/MQTT, dan simulasi auto-reconnect perangkat IoT. |
