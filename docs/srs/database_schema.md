# Database Schema

Proyek IoTKit Studio menggunakan **PostgreSQL** yang dikelola melalui **Prisma ORM**. Berikut adalah representasi konseptual relasi dan entitas utama dalam sistem.

## 1. User
Tabel utama autentikasi dan kepemilikan data.
- **id** (UUID, PK)
- **email** (String, Unique)
- **password** (String, Hashed)
- **name** (String, Nullable)
- *Relasi:* 1 User -> Many Projects, 1 User -> Many ChatSessions

## 2. Project
Tabel master simulasi *Node* IoT.
- **id** (UUID, PK)
- **name** (String), **description** (String, Nullable)
- **protocol** (String) — Enum-like: HTTP, HTTPS, MQTT, WS, WSS
- **host** (String), **port** (Int, Nullable)
- **endpoint** (String, Nullable) / **topic** (String, Nullable)
- **authToken** / **username** / **password** (Kredensial Autentikasi)
- **status** (String) — active, inactive, error
- **userId** (UUID, FK) -> User
- *Relasi:* 1 Project -> Many Payloads, Many Logs, Many Simulations

## 3. Payload
Penyimpanan format kerangka JSON (Visual Builder) untuk proyek terkait.
- **id** (UUID, PK)
- **name** (String)
- **structure** (String) — Stringified JSON dari tipe data tiap field (number, string, boolean).
- **projectId** (UUID, FK) -> Project

## 4. Simulation
Mencatat status mesin *engine* simulasi dari suatu proyek, termasuk statistik transmisi.
- **id** (UUID, PK)
- **status** (String) — idle, running, stopped, error
- **interval** (Int) — Kecepatan tembakan data dalam ms.
- **totalSent** (Int), **successCount** (Int), **errorCount** (Int)
- **lastPayload**, **lastResponse**, **lastError** (Stringified JSON/Text)
- **projectId** (UUID, FK) -> Project

## 5. Log
Mencatat seluruh rekam jejak (*history*) dari data yang telah dikirim oleh sistem ke *endpoint*.
- **id** (UUID, PK)
- **type** (String) — request, response, error, event
- **protocol** (String)
- **message** (String)
- **payload** (String, Nullable)
- **statusCode** (Int, Nullable), **latency** (Int, Nullable)
- **timestamp** (DateTime)
- **projectId** (UUID, FK) -> Project

## 6. ChatSession & ChatMessage
Sistem *history* untuk asisten **AI Agent**.
- **ChatSession**: **userId**, **title**
- **ChatMessage**: **sessionId**, **role** (user, assistant, system), **content**, **metadata** (untuk aksi/fungsi).

## 7. Dataset
Penyimpanan metadata set data (*file CSV*) yang dapat di-*upload* pengguna untuk memutar simulasi berbasis data historis (Modul HERA, Drone, Carbon).
- **moduleName**, **fileName**, **filePath**, **fileSizeBytes**
- **loadedRows**, **skippedRows**, **isActive**
