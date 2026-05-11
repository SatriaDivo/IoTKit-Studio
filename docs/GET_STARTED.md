# 🚀 Get Started - IoTKit-Studio Development

Selamat datang di IoTKit-Studio! Panduan ini akan membantu Anda mulai development dalam 5 menit.

## ✨ Apa itu IoTKit-Studio?

Platform simulasi IoT berbasis web untuk:

- 📡 Simulasi sensor IoT tanpa hardware
- 🔌 Support multi-protocol (HTTP, MQTT, WebSocket)
- 📊 Monitoring realtime
- 🎨 Visual payload builder (no coding!)

## 🎯 Quick Start (5 Menit)

### 1. Clone & Install

```bash
git clone <repository-url>
cd iotkit-studio

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Setup Environment

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd ../frontend
cp .env.local.example .env.local
```

### 3. Start PostgreSQL

```bash
cd ..
docker-compose up -d postgres
```

### 4. Setup Database

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 5. Start Development

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### 6. Open Browser

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## 🎉 Done!

Sekarang Anda bisa:

1. Register account di http://localhost:3000/register
2. Create project pertama
3. Mulai development!

## 📚 Next Steps

### Baca Documentation

- **[START_DEV.md](START_DEV.md)** - Quick reference
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Full development guide
- **[API.md](API.md)** - API documentation

### Explore Codebase

```
iotkit-studio/
├── backend/          # Express API
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── controllers/ # Controllers
│   │   └── protocols/   # HTTP, MQTT, WS clients
│   └── prisma/          # Database schema
│
└── frontend/         # Next.js App
    └── src/
        ├── app/         # Pages
        ├── components/  # React components
        └── store/       # State management
```

### Try Features

1. **Create Project**
   - Go to Projects page
   - Click "New Project"
   - Choose protocol (HTTP/MQTT/WebSocket)
   - Test connection

2. **View Database**

   ```bash
   cd backend
   npm run prisma:studio
   ```

   Open: http://localhost:5555

3. **Test API**
   ```bash
   curl http://localhost:4000/health
   ```

## 🛠️ Development Workflow

### Daily Routine

```bash
# Morning - Start development
docker-compose up -d postgres  # Start PostgreSQL
cd backend && npm run dev      # Terminal 1
cd frontend && npm run dev     # Terminal 2

# Coding... (auto-reload aktif!)

# Evening - Stop
# Ctrl+C di kedua terminal
```

### Making Changes

1. **Edit code** di `backend/src/` atau `frontend/src/`
2. **Auto-reload** akan restart server
3. **Check browser** untuk lihat perubahan
4. **Commit** perubahan Anda

### Database Changes

```bash
cd backend

# Edit schema
nano prisma/schema.prisma

# Create migration
npm run prisma:migrate

# View changes
npm run prisma:studio
```

## 🔧 Useful Commands

### Backend

```bash
cd backend
npm run dev              # Start dev server
npm run prisma:studio    # Database GUI
npm run prisma:migrate   # Run migrations
```

### Frontend

```bash
cd frontend
npm run dev              # Start dev server
npm run build            # Build
npm run lint             # Lint code
```

### Docker

```bash
docker-compose up -d postgres      # Start PostgreSQL
docker-compose stop postgres       # Stop PostgreSQL
docker logs iotkit-postgres        # View logs
```

## 🐛 Troubleshooting

### PostgreSQL tidak start

```bash
docker ps | grep postgres
docker-compose restart postgres
```

### Backend error

```bash
cd backend
rm -rf node_modules
npm install
npm run dev
```

### Frontend error

```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Port sudah digunakan

```bash
# Backend - edit .env
PORT=5000

# Frontend
PORT=3001 npm run dev
```

## 📖 Learn More

### Documentation

- [START_DEV.md](START_DEV.md) - Quick reference
- [DEVELOPMENT.md](DEVELOPMENT.md) - Full guide
- [DEV_SUMMARY.md](DEV_SUMMARY.md) - Overview
- [POSTGRES_SETUP.md](POSTGRES_SETUP.md) - Database setup
- [API.md](API.md) - API docs

### Tech Stack

**Frontend:**

- Next.js 14 + TypeScript
- Tailwind CSS
- Zustand (state)
- Framer Motion (animations)

**Backend:**

- Express + TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO (realtime)

## 🎯 What to Build

### Already Built ✅

- Authentication system
- Project management
- Protocol clients (HTTP, MQTT, WebSocket)
- Simulation engine
- Database schema

### Your Tasks 🚀

- [ ] Payload Builder page
- [ ] Simulation control page
- [ ] Logs & monitoring page
- [ ] Settings page
- [ ] Charts & analytics
- [ ] Export/import features

## 💡 Tips

1. **Commit often** - Small, frequent commits
2. **Test manually** - Test setiap perubahan
3. **Check console** - Monitor errors
4. **Use Prisma Studio** - View database
5. **Read docs** - Check documentation

## 🆘 Need Help?

1. Check terminal logs
2. Check browser console (F12)
3. Read [DEVELOPMENT.md](DEVELOPMENT.md)
4. Check troubleshooting section
5. Ask questions!

## ✅ Checklist

Sebelum mulai coding:

- [ ] PostgreSQL running
- [ ] Backend running (port 4000)
- [ ] Frontend running (port 3000)
- [ ] No errors di terminal
- [ ] Browser bisa akses localhost:3000

## 🎉 You're Ready!

Selamat! Anda siap untuk development IoTKit-Studio! 🚀

**Happy Coding!** 💻✨

---

Made with ❤️ for IoT developers
