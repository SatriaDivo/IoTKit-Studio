# Non-Functional Requirements (NFR)

## 1. Performa dan Skalabilitas (Performance)
- **Rendah Latensi:** Respon antar-muka Dashboard untuk *Real-Time Update* tidak boleh tertunda lebih dari 500ms akibat mekanisme rendering *React* (*bottlenecking*).
- **Efisiensi Beban Prosesor:** Layanan pengiriman latar belakang (*background worker*) untuk simulasi harus dibatasi jumlah pengeksekusian maksimalnya (*concurrency limit*) per-interval demi mencegah Node.js *Event Loop Blocking* jika pengguna mengatur pengiriman per 50ms ke *host* yang memakan latensi lama.

## 2. Ketersediaan (Availability)
- Layanan *Backend* tidak boleh mengalami *Crash* (mati tiba-tiba). Sistem peringatan dini (*Error Boundary* dan penanganan *Exception Handling* di *Controller* maupun *Express Global Handler*) harus diterapkan sepenuhnya.

## 3. Desain Visual (Aesthetic Constraints)
- **Tema Keseluruhan:** Menggunakan *Stormy Morning Design System* dengan *palette* dominan *Slate Blue* (`#6A89A7`).
- Desain antarmuka *wajib* menampilkan kesan *Industrial Control Panel* (panel kendali pabrik IoT) dengan sudut tegas (*border radius* standar) dan bukan seperti aplikasi hiburan (bukan model *chatbot bubble/avatar* cerah).

## 4. Keamanan
- Tidak menyimpan kata sandi (Password / Auth Token server eksternal pengguna) dalam bentuk *plain-text* jika memungkinkan, atau sekurang-kurangnya hanya diakses melalui rute API berautentikasi (JWT + *Same-Origin* CORS Policy).
- Mengamankan komunikasi *AI Agent* dengan tidak mem-bocorkan rahasia sistem (*system keys*) atau struktur internal *server* ke *frontend*.
