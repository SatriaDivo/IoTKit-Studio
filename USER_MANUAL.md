# 🐝 Panduan Penggunaan Swarm Mode (Load Testing)

Fitur **Swarm Mode** di IoTKit-Studio merupakan mesin uji beban (*load testing*) canggih yang dirancang persis seperti **Grafana k6**. Fitur ini memanfaatkan sistem *Virtual Users (VUs)* secara asinkron (menggunakan Node.js) tanpa membebani performa komputer Anda, serta secara *native* mendukung protokol **HTTP**, **WebSocket**, maupun **MQTT** (tanpa perlu melakukan *compile* ulang seperti pada *k6*).

---

## 1. Konsep Dasar "Virtual Users (VUs) & Stages"

Alih-alih menembakkan 1.000 data sekaligus (*spike traffic*) yang tidak realistis, *Swarm Mode* menggunakan konsep **Stages** (*Tahapan*) dan **Virtual Users (VUs)**.

*   **Virtual User (VU)**: Satu entitas virtual yang mewakili satu buah perangkat (sensor). VU ini akan masuk dalam perulangan (*loop*): Mengirim pesan ➡️ Istirahat (*Interval*) ➡️ Mengirim pesan ➡️ Istirahat, dan seterusnya.
*   **Stages**: Konfigurasi bertahap untuk menaikkan (*ramp-up*), menahan (*hold*), dan menurunkan (*ramp-down*) jumlah VUs. Hal ini berguna agar *Broker/Server* Anda tidak kaget dengan lonjakan langsung, melainkan menerima *traffic* secara perlahan.

---

## 2. Cara Konfigurasi di Dashboard

1. Buka halaman proyek (*Project Details*) Anda.
2. Gulir ke bawah hingga bagian **Simulation Settings**.
3. Atur parameter dasar terlebih dahulu:
   * **Interval (ms)**: Jeda istirahat untuk setiap VU setelah mengirim satu pesan (Misal: `1000` = 1 detik).
   * **Batch Size**: Jumlah *payload* yang dikirimkan oleh satu VU dalam sekali jalan (biasanya `1`).
4. Aktifkan sakelar (*toggle*) **Swarm Mode**.
5. Anda akan melihat bagian **Virtual Users (VUs) Stages**.
6. Klik tombol **+ Add Stage** untuk menambah tahapan skenario.

### Contoh Skenario Uji Beban (Ramp-up, Hold, Ramp-down)

Misalkan Anda ingin menguji batas server dengan maksimal 500 pengguna secara stabil:

| Stage | Duration (sec) | Target VUs | Fungsi |
| :--- | :--- | :--- | :--- |
| **1** | `30` | `500` | **Ramp-up**: Dalam 30 detik pertama, jumlah perangkat akan naik perlahan dari 0 menuju 500. |
| **2** | `60` | `500` | **Hold**: Menahan 500 perangkat agar terus menyemprotkan data secara konstan selama 1 menit penuh. |
| **3** | `10` | `0` | **Ramp-down**: Menurunkan jumlah perangkat dari 500 menjadi 0 dalam waktu 10 detik. |

**Catatan:** *Limit maksimal Virtual Users dalam IoTKit-Studio dibatasi hingga 1.000 VUs per simulasi.*

---

## 3. Fitur "Smart Device ID Injection"

Ketika Anda menyalakan *Swarm Mode*, sangat penting untuk membedakan identitas setiap perangkat (VU). Sistem IoTKit-Studio memiliki fitur *injection* pintar.

Jika *payload* JSON Anda memiliki atribut (*key*) yang bernama:
*   `device_id`
*   `deviceId`
*   `id`

Maka secara otomatis, nilai asli (*value*) dari *key* tersebut akan dimanipulasi dengan akhiran `-VU-{angka}`.
Contoh, bila data aslinya adalah `"device_id": "SENSOR-A"`, maka data yang terkirim menjadi:
*   VU pertama mengirim: `"device_id": "SENSOR-A-VU-1"`
*   VU kedua mengirim: `"device_id": "SENSOR-A-VU-2"`
*   VU keseratus mengirim: `"device_id": "SENSOR-A-VU-100"`

Ini memastikan platform *dashboard IoT* Anda di ujung sana bisa membaca 100 perangkat yang benar-benar berbeda.

---

## 4. Membaca Laporan (Live Stats)

Setelah simulasi berjalan, panel **Live Stats** akan muncul. Metrik yang kami tampilkan telah disejajarkan dengan standar *report* dari terminal k6.

### Metrik Dasar
*   **Total Requests**: Jumlah keseluruhan *payload* yang berhasil ditembakkan ke target.
*   **Active VUs**: Memantau pergerakan grafik jumlah perangkat aktif (sesuai *stages* yang Anda buat).
*   **Req / Second**: *Throughput* asali atau Kecepatan Tembakan dalam satuan RPS (Berapa data yang masuk ke server Anda dalam satu detik).
*   **Errors**: Data yang gagal terkirim (Timeout, Bad Request, *Connection Lost*, dll).

### Latency Metrics (Persentil)
Bagian terpenting dari alat ukur performa (*Performance Testing*) adalah stabilitas (Latensi jaringan). Semakin kecil nilainya (dalam milidetik / `ms`), semakin hebat server Anda.
*   **Min**: Waktu respons paling cepat.
*   **Max**: Waktu respons paling lambat (Waspada jika nilainya melompat terlalu jauh, ini tanda server melambat).
*   **Avg (Average)**: Rata-rata dari semua kecepatan respons peladen.
*   **Med (Median)**: Angka pertengahan. Lebih akurat dari *Average* karena mengabaikan anomali latensi (*outliers*).
*   **P(90)**: Persentil 90. Artinya, **90%** dari semua perangkat Anda mendapatkan waktu respons di bawah angka ini.
*   **P(95)**: Persentil 95. Standar industri tertinggi. Jika P(95) Anda berada di kisaran hijau (misalnya `80ms`), server IoT Anda sudah berstandar kelas satu (*enterprise-grade*)!
