# ⚡ Quick Reference - IoTKit-Studio

Referensi cepat untuk development sehari-hari.

## 🚀 Start Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## 🔗 URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Prisma Studio: http://localhost:5555

## 🗄️ Database

```bash
# View database
cd backend && npm run prisma:studio

# Run migrations
npm run prisma:migrate

# Generate client
npm run prisma:generate

# Reset database
npx prisma migrate reset
```

## 🐳 Docker

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Stop PostgreSQL
docker-compose stop postgres

# View logs
docker logs iotkit-postgres

# Restart
docker-compose restart postgres
```

## 🔧 Common Commands

### Backend

```bash
cd backend
npm run dev              # Dev server
npm run build            # Build
npm start                # Production
npm run lint             # Lint
```

### Frontend

```bash
cd frontend
npm run dev              # Dev server
npm run build            # Build
npm start                # Production
npm run lint             # Lint
```

## 🐛 Quick Fixes

### PostgreSQL not running

```bash
docker-compose up -d postgres
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

### Port in use

```bash
# Backend
PORT=5000 npm run dev

# Frontend
PORT=3001 npm run dev
```

## 📁 File Structure

```
backend/src/
├── routes/          # API routes
├── controllers/     # Controllers
├── protocols/       # HTTP, MQTT, WS
├── simulation/      # Simulation engine
├── middleware/      # Auth, errors
└── utils/           # Utilities

frontend/src/
├── app/             # Pages
├── components/      # Components
├── store/           # State
└── lib/             # Utils
```

## 🔑 Default Config

### PostgreSQL

```
Host: localhost
Port: 5432
Database: iotkit_studio
Username: iotkit
Password: iotkit123
```

### Environment

```env
# backend/.env
DATABASE_URL="postgresql://iotkit:iotkit123@localhost:5432/iotkit_studio?schema=public"
PORT=4000
JWT_SECRET=dev-secret-key

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:4000/health

# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

## 📚 Documentation

- [GET_STARTED.md](GET_STARTED.md) - Getting started
- [START_DEV.md](START_DEV.md) - Quick start
- [DEVELOPMENT.md](DEVELOPMENT.md) - Full guide
- [API.md](API.md) - API docs
- [POSTGRES_SETUP.md](POSTGRES_SETUP.md) - Database

## 💡 Tips

- Auto-reload aktif di backend & frontend
- Check console untuk errors
- Use Prisma Studio untuk view database
- Commit sering dengan message jelas

## ✅ Daily Checklist

- [ ] PostgreSQL running
- [ ] Backend running
- [ ] Frontend running
- [ ] No console errors

---

**Quick help**: Check [DEVELOPMENT.md](DEVELOPMENT.md) untuk detail lengkap
