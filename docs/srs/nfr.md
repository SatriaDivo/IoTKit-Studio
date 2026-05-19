# Non-Functional Requirements (NFR)

## 1. Performa dan Skalabilitas (Performance)
- **Rendah Latensi:** Respon antar-muka Dashboard untuk *Real-Time Update* tidak boleh tertunda lebih dari 200ms berkat WebSocket Hub berbasis Go yang sangat efisien dan cepat memancarkan data telemetry.
- **Efisiensi Beban Prosesor & Concurrency (Goroutines):** Simulator latar belakang didukung penuh oleh **Go Goroutines** yang bersifat non-blocking. Platform mampu menangani simulasi ribuan Virtual Users (VUs) secara simultan dengan alokasi memori yang sangat hemat (~2-4KB per VU, dibandingkan ~5-10MB pada Node.js).
- **Stream-based Dataset Processing:** Pemutaran kembali dataset CSV riil berukuran besar (misal >6000 baris data) harus dibaca secara stream-based/buffered untuk menjaga keandalan memori server dan menghindari memory leaks.

## 2. Ketersediaan (Availability)
- Layanan *Backend Go* tidak boleh mengalami *Crash* (mati tiba-tiba). Sistem peringatan dini dengan middleware *Recover* Fiber dan penanganan *Exception/Panic Handling* di tingkat goroutine simulator harus diterapkan sepenuhnya.

## 3. Desain Visual (Aesthetic Constraints)
- **Tema Keseluruhan:** Menggunakan *Stormy Morning Design System* dengan *palette* dominan *Slate Blue* (`#6A89A7`).
- Desain antarmuka *wajib* menampilkan kesan *Industrial Control Panel* (panel kendali pabrik IoT) dengan sudut tegas (*border radius* standar) dan bukan seperti aplikasi hiburan (bukan model *chatbot bubble/avatar* cerah).

## 4. Keamanan
- Tidak menyimpan kata sandi (Password / Auth Token server eksternal pengguna) dalam bentuk *plain-text* jika memungkinkan, atau sekurang-kurangnya hanya diakses melalui rute API berautentikasi (JWT + *Same-Origin* CORS Policy).
- Mengamankan komunikasi *AI Agent* dengan tidak mem-bocorkan rahasia sistem (*system keys*) atau struktur internal *server* ke *frontend*.

