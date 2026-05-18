# IoTKit-Studio

Platform simulasi IoT berbasis dashboard untuk membuat, mengelola, dan mengirim payload sensor IoT tanpa coding.

## 🚀 Fitur Utama

- **Project Management**: Buat dan kelola multiple project IoT
- **Multi-Protocol Support**: HTTP/HTTPS, MQTT/MQTTS, WebSocket/WSS
- **Visual Payload Builder**: Buat struktur payload JSON secara visual tanpa coding
- **Real-time Simulation**: Jalankan simulasi data sensor secara realtime
- **Swarm Mode (Load Testing)**: Mesin uji beban ala *k6* dengan *Virtual Users* & *Stages* terintegrasi
- **Monitoring & Logs**: Pantau semua aktivitas dan log secara realtime
- **Modern UI**: Dark mode, responsive, dan user-friendly
- **Authentication**: JWT-based authentication system
- **Database**: PostgreSQL with Prisma ORM

## 📋 Tech Stack

### Frontend

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand (State Management)
- Socket.IO Client

### Backend

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL Database
- Socket.IO
- MQTT.js, WebSocket
- JWT Authentication

## 🚀 Quick Start

> **🛠️ Development**: Lihat [docs/GET_STARTED.md](docs/GET_STARTED.md) untuk panduan lengkap!

### Prerequisites

- Node.js 18+
- Docker Desktop
- npm atau yarn

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd iotkit-studio

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Setup environment
cd backend && cp .env.example .env
cd ../frontend && cp .env.local.example .env.local

# 4. Start PostgreSQL
cd ..
docker-compose up -d postgres

# 5. Setup database
cd backend
npm run prisma:generate
npm run prisma:migrate

# 6. Start development
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### Access

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## 📖 Documentation

### Getting Started

- **[docs/GET_STARTED.md](docs/GET_STARTED.md)** - Getting started guide
- **[docs/START_DEV.md](docs/START_DEV.md)** - Quick start (5 menit)
- **[docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** - Quick reference

### User Manual
- **[docs/user-manual/LOAD_TESTING.md](docs/user-manual/LOAD_TESTING.md)** - Panduan Uji Beban (Swarm Mode)

### Development

- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Full development guide
- **[docs/DEV_SUMMARY.md](docs/DEV_SUMMARY.md)** - Development summary
- **[docs/POSTGRES_SETUP.md](docs/POSTGRES_SETUP.md)** - PostgreSQL setup

### API & Contributing

- **[docs/API.md](docs/API.md)** - API documentation
- **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Contribution guidelines

## 🗄️ Database

PostgreSQL configuration (development):

```
Host: localhost
Port: 5432
Database: iotkit_studio
Username: iotkit
Password: iotkit123
```

### Database Commands

```bash
cd backend

# View database (GUI)
npm run prisma:studio

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

## 🔌 Protocol Support

- **HTTP/HTTPS**: REST API calls, custom headers, authentication
- **MQTT/MQTTS**: Publish/Subscribe, QoS levels, SSL/TLS
- **WebSocket/WSS**: Real-time bidirectional communication

## 🛠️ Development

### Backend

```bash
cd backend
npm run dev              # Start dev server
npm run build            # Build
npm run prisma:studio    # Database GUI
```

### Frontend

```bash
cd frontend
npm run dev              # Start dev server
npm run build            # Build
npm run lint             # Lint code
```

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

## 📁 Project Structure

```
iotkit-studio/
├── backend/              # Express API
├── frontend/             # Next.js App
├── docs/                 # Documentation
├── docker-compose.yml    # Docker config
└── README.md            # This file
```

## 📝 License

MIT

## 👥 Contributing

Contributions welcome! See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

**Happy Coding! 🚀**

Made with ❤️ for IoT developers
