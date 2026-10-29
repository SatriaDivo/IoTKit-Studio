# 📋 IoTKit Studio — Informasi Kredensial Akun

Dokumen ini berisi informasi kredensial akun administrator dan operator untuk mengakses platform **IoTKit Studio Telemetry Suite**.

---

## 🔐 Kredensial Akun Sistem

### 1. Akun Administrator (System Administrator)
Digunakan untuk manajemen sistem, konfigurasi global, pembuatan node simulasi, dan integrasi API.

| Parameter | Keterangan |
| :--- | :--- |
| **Nama** | `System Administrator` |
| **Email** | `admin@iotkit.local` |
| **Password** | `admin123456` |
| **Role** | Administrator |
| **Status** | Aktif (`ACTIVE`) |

---

### 2. Akun Telemetry Operator (Lead Operator)
Akun kerja operasional yang sudah **pre-configured** dengan node telemetri industri aktif (`Turbine_Alpha_01`), riwayat stream, dan data analitik real-time.

| Parameter | Keterangan |
| :--- | :--- |
| **Nama** | `Lead Operator` |
| **Email** | `operator@iotkit.local` |
| **Password** | `admin123456` |
| **Role** | Lead Operator |
| **Node Aktif** | `Turbine_Alpha_01` (ID: `0e17bbdf-7f97-41a5-988c-71b291cbd061`) |
| **Riwayat Telemetri** | 540+ Telemetry Payloads terkirim (100% Success Rate) |
| **Status** | Aktif (`ACTIVE`) |

---

### 3. Akun Pengujian (Test User)
Akun sekunder untuk pengujian multi-user dan isolasi workspace.

| Parameter | Keterangan |
| :--- | :--- |
| **Nama** | `Test User` |
| **Email** | `test@example.com` |
| **Password** | `admin123456` |
| **Role** | Standard User |
| **Status** | Aktif (`ACTIVE`) |

---

## 🌐 Endpoint & URL Akses

| Layanan | URL | Keterangan |
| :--- | :--- | :--- |
| **Web Dashboard** | [http://localhost:3000](http://localhost:3000) | Konsol utama telemetry Next.js |
| **Halaman Login** | [http://localhost:3000/login](http://localhost:3000/login) | Form autentikasi operator & admin |
| **REST API Base** | [http://localhost:4000/api](http://localhost:4000/api) | Go Fiber API Gateway |
| **Health Check** | [http://localhost:4000/health](http://localhost:4000/health) | Status kesehatan backend |
| **WebSocket Hub** | `ws://localhost:4000/ws` | Real-time telemetry stream |

---

## 🚀 Panduan Login & Akses

### Melalui Tampilan Web (Browser)
1. Buka browser dan arahkan ke [http://localhost:3000/login](http://localhost:3000/login).
2. Masukkan **Email** (`admin@iotkit.local` atau `operator@iotkit.local`).
3. Masukkan **Password** (`admin123456`).
4. Klik tombol **AUTHENTICATE_OPERATOR** / **Masuk**.
5. Anda akan langsung dialihkan ke Mission Control Dashboard.

### Melalui REST API (cURL)
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@iotkit.local",
    "password": "admin123456"
  }'
```

**Contoh Response Sukses:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "b5690b57-b8ce-4c6a-bb0a-e8e032f1fee5",
    "name": "System Administrator",
    "email": "admin@iotkit.local"
  }
}
```

---

## 🤖 Konfigurasi AI Provider (9router)

AI Agent terintegrasi dengan gateway AI 9router (OpenAI-compatible) dan model performa tinggi:

| Parameter | Nilai Konfigurasi | Keterangan |
| :--- | :--- | :--- |
| **Provider** | `9router` | Gateway AI berkecepatan tinggi |
| **Base URL** | `https://9router.stdv.biz.id/v1` | Endpoint OpenAI-compatible |
| **API Key** | `sk-84d12d9b527f4129-fv075i-ca4bd20c` | Token autentikasi |
| **Model** | `ag/gemini-3.8-flash-high` | Model multimodal cepat & akurat |
| **Bahasa Respon** | Bahasa Indonesia (Mutlak) | Semua prompt & action plan otomatis diterjemahkan |

Variabel lingkungan telah diset di `backend-go/.env`:
```env
AI_BASE_URL=https://9router.stdv.biz.id/v1
AI_API_KEY=sk-84d12d9b527f4129-fv075i-ca4bd20c
AI_MODEL=ag/gemini-3.8-flash-high
```

---

## ⚙️ Menjalankan Layanan Lokal

Jika layanan belum aktif di background, jalankan dua terminal berikut:

**Terminal 1 — Backend (Go Fiber):**
```bash
cd backend-go
go run ./cmd/api
```

**Terminal 2 — Frontend (Next.js):**
```bash
cd frontend
npm run dev
```
