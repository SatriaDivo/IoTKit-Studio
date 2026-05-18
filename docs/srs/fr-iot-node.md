# Functional Requirements: Project & IoT Node Management

## 1. Node Creation (Pendaftaran Endpoint)
- Pengguna dapat mendefinisikan *Node* pengirim simulasi dalam bentuk entitas "Project".
- Parameter minimum yang wajib disertakan: **Name**, **Protocol** (HTTP/MQTT/WS), dan **Host**.
- Jika protokol spesifik dipilih, parameter kontekstual tambahan akan muncul:
  - **MQTT**: Opsi pengisian **Topic**.
  - **HTTP/WS**: Opsi pengisian **Endpoint/Path**.
  - Parameter autentikasi opsional: *Username/Password* (untuk MQTT broker) atau *Auth Token* (untuk HTTP Bearer Auth).

## 2. Real-Time Settings & Status
- Sistem harus menampilkan detail konfigurasi pada layar spesifik proyek (`/projects/:id`).
- Tersedia opsi untuk menghapus (Delete) proyek. Aksi penghapusan ini harus men-trigger penghapusan terhubung (*Cascade Delete*) untuk semua riwayat *Logs*, *Payloads*, dan *Simulations* yang ada di database.

## 3. Simulasi Mandiri (Isolation)
- Setiap *Node* proyek harus dapat dihidupkan (Start Simulation) secara independen. Menjalankan *Node* A tidak boleh berdampak pada *thread* atau *socket state* dari *Node* B.
