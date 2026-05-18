# Functional Requirements: Chaos Engineering & Anomaly Injector

Sistem simulasi **IoTKit-Studio** dilengkapi dengan modul **Chaos / Anomaly Injector** untuk mensimulasikan kegagalan perangkat keras, anomali sensor, dan ketahanan backend target (edge-case testing) secara sengaja.

---

## 🌪️ Spesifikasi Fungsional Anomali

### 1. Visual Control Panel (Frontend Control)
*   **Toggle Switch:** Pengguna dapat mengaktifkan atau menonaktifkan suntikan anomali (*Chaos Mode*) kapan saja secara visual.
*   **Probability Slider:** Slider interaktif untuk menentukan probabilitas terjadinya anomali, berkisar dari **1% hingga 100%** (misal: 10% berarti rata-rata 1 dari 10 payload yang dikirim simulator akan dimanipulasi).

### 2. Anomaly Generation Rules (Backend Payload Modification)
Ketika *Chaos Mode* aktif, generator payload akan memproses field data sensor numerik dan boolean berdasarkan aturan berikut:
*   **Spike Anomaly (Outlier Numerik):** 
    *   Setiap field angka (*random, incremental,* atau *static*) memiliki peluang diacak nilainya hingga **10x lipat di atas batas maksimum** yang telah ditentukan.
    *   Sistem juga dapat membalikkan nilai menjadi ekstrem negatif (misalnya mengalikan angka dengan `-10` secara acak).
*   **Inverted Boolean:**
    *   Setiap field bertipe *boolean* (`true`/`false`) memiliki peluang dibalik nilainya secara tidak terduga (`true` menjadi `false` atau sebaliknya) untuk mensimulasikan status kegagalan sakelar.
*   **Timestamp Integrity:**
    *   Injeksi anomali **tidak merusak** struktur penanggalan (*timestamp*) JSON agar pesan tetap dianggap sah secara protokol oleh server penerima data.

### 3. Log Flagging & Visuals
*   Payload yang mengalami suntikan anomali akan direkam dalam log pengiriman dengan status atau indikasi khusus agar pengguna dapat membedakan data anomali dengan data simulasi normal di dashboard analitik.
