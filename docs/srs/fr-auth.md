# Functional Requirements: Authentication

## 1. Login & Registrasi
- Sistem harus mengizinkan pengguna untuk mendaftarkan akun menggunakan kombinasi **Email** dan **Password**.
- *Password* harus di-*hash* dengan algoritma kriptografi yang kuat (seperti *Bcrypt*) sebelum disimpan di PostgreSQL.
- Sistem harus mengembalikan *JSON Web Token* (JWT) yang memiliki masa berlaku (*expiry time*) ketika pengguna berhasil masuk (Login).

## 2. Pengelolaan Sesi Berbasis Token
- Sesi pengguna dikelola di sisi klien (*Frontend*) menggunakan *LocalStorage* (atau mekanisme *Cookie* yang aman).
- Token (JWT) harus diselipkan (*injected*) secara otomatis sebagai *Header* `Authorization: Bearer <token>` melalui Axios Interceptor pada setiap *request* yang mengarah ke `/api`.
- Klien (Next.js) harus mem-blok akses (*Route Protection*) ke *path* `/(dashboard)/*` apabila token tidak tersedia atau sudah kedaluwarsa, lalu me-lempar (*redirect*) pengguna kembali ke `/login`.

## 3. Isolasi Data Multi-Tenant
- Semua operasi pembuatan (*Create*), pembacaan (*Read*), pengubahan (*Update*), dan penghapusan (*Delete*) data proyek, simulasi, *payload*, dan *log* wajib difilter berdasarkan `userId` dari token JWT tersebut.
- Pengguna A **tidak boleh** bisa melihat, memulai simulasi, atau mengubah proyek milik Pengguna B dalam kondisi apa pun (pengujian melalui Middleware otorisasi di sisi backend).
