# 🚀 Start Development - Quick Guide

Panduan super cepat untuk mulai development IoTKit-Studio.

## ⚡ Super Quick Start (5 menit)

```bash
# 1. Clone & masuk ke folder
git clone <repository-url>
cd iotkit-studio

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Setup environment
cd ../backend
cp .env.example .env
cd ../frontend
cp .env.local.example .env.local

# 4. Start PostgreSQL
cd ..
docker-compose up -d postgres

# 5. Setup database
cd backend
npm run prisma:generate
npm run prisma:migrate

# 6. Start backend (Terminal 1)
npm run dev

# 7. Start frontend (Terminal 2 - buka terminal baru)
cd ../frontend
npm run dev
```

**Done! 🎉**

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## 📋 Daily Development

Setiap hari mulai development:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

PostgreSQL akan otomatis running (Docker).

## 🛑 Stop Development

```bash
# Ctrl+C di kedua terminal (backend & frontend)

# Stop PostgreSQL (optional)
docker-compose stop postgres
```

## 🔧 Useful Commands

### Backend

```bash
cd backend

# Development
npm run dev              # Start dev server

# Database
npm run prisma:studio    # Open database GUI
npm run prisma:migrate   # Run migrations
npm run prisma:generate  # Generate Prisma client

# Build
npm run build           # Build for production
npm start               # Start production server
```

### Frontend

```bash
cd frontend

# Development
npm run dev             # Start dev server

# Build
npm run build          # Build for production
npm start              # Start production server

# Lint
npm run lint           # Check code quality
```

### Docker

```bash
# PostgreSQL
docker-compose up -d postgres      # Start
docker-compose stop postgres       # Stop
docker-compose restart postgres    # Restart
docker logs iotkit-postgres        # View logs

# All services
docker-compose up -d              # Start all
docker-compose down               # Stop all
docker-compose logs -f            # View all logs
```

## 🎯 First Time Setup

### 1. Create Account

1. Buka http://localhost:3000
2. Klik "Register"
3. Isi email & password
4. Login

### 2. Create First Project

1. Klik "Projects" di sidebar
2. Klik "New Project"
3. Isi form:
   - Name: "Test Project"
   - Protocol: HTTP
   - Host: "httpbin.org"
   - Port: 80
   - Endpoint: "/post"
4. Klik "Create Project"

### 3. Test Connection

1. Buka project yang dibuat
2. Klik "Test Connection"
3. Lihat hasilnya

## 🐛 Quick Troubleshooting

### Backend tidak start

```bash
# Check PostgreSQL
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker logs iotkit-postgres
```

### Frontend error

```bash
cd frontend

# Clear cache
rm -rf .next node_modules
npm install
npm run dev
```

### Database error

```bash
cd backend

# Reset database
npx prisma migrate reset

# Regenerate
npm run prisma:generate
npm run prisma:migrate
```

### Port sudah digunakan

**Backend (4000):**

```bash
# Edit backend/.env
PORT=5000

# Restart
npm run dev
```

**Frontend (3000):**

```bash
# Run on different port
PORT=3001 npm run dev
```

## 📊 View Database

```bash
cd backend
npm run prisma:studio
```

Buka: http://localhost:5555

## 🧪 Test API

```bash
# Health check
curl http://localhost:4000/health

# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

## 📁 File Structure

```
iotkit-studio/
├── backend/
│   ├── src/              # Backend code
│   ├── prisma/           # Database schema
│   └── .env              # Backend config
│
├── frontend/
│   ├── src/              # Frontend code
│   └── .env.local        # Frontend config
│
└── docker-compose.yml    # Docker config
```

## 🎨 Development Tips

1. **Auto Reload**: Kedua server auto-reload saat file berubah
2. **Console Logs**: Check terminal untuk errors
3. **Browser DevTools**: F12 untuk debug frontend
4. **Prisma Studio**: GUI untuk manage database
5. **Git Commits**: Commit sering dengan message jelas

## 📚 Next Steps

- Read [DEVELOPMENT.md](DEVELOPMENT.md) untuk detail lengkap
- Check [API.md](API.md) untuk API documentation
- See [README.md](README.md) untuk overview

## 🆘 Need Help?

1. Check terminal logs
2. Check browser console (F12)
3. Read [DEVELOPMENT.md](DEVELOPMENT.md)
4. Check [Troubleshooting](#-quick-troubleshooting)

## ✅ Development Checklist

Sebelum mulai coding:

- [ ] PostgreSQL running
- [ ] Backend running (port 4000)
- [ ] Frontend running (port 3000)
- [ ] No errors di terminal
- [ ] Browser bisa akses localhost:3000

## 🎉 You're Ready!

Sekarang Anda siap untuk development! 🚀

**Happy Coding!** 💻✨
