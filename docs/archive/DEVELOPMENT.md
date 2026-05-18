# 🛠️ Development Guide - IoTKit-Studio

Panduan lengkap untuk development IoTKit-Studio di local environment.

## 🎯 Development Setup

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **Git** ([Download](https://git-scm.com/))
- **Code Editor** (VS Code recommended)

### VS Code Extensions (Recommended)

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

## 🚀 Quick Start Development

### 1. Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd iotkit-studio

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup Environment

**Backend:**

```bash
cd backend
cp .env.example .env
```

File `backend/.env` sudah berisi konfigurasi development:

```env
NODE_ENV=development
PORT=4000
HOST=localhost
DATABASE_URL="postgresql://iotkit:iotkit123@localhost:5432/iotkit_studio?schema=public"
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend:**

```bash
cd frontend
cp .env.local.example .env.local
```

File `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Start PostgreSQL

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify running
docker ps | grep postgres
```

### 4. Setup Database

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations (create tables)
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### 5. Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

Output:

```
🚀 IoTKit-Studio Backend running on port 4000
Environment: development
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

Output:

```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
```

### 6. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Prisma Studio**: http://localhost:5555 (jika running)

## 📁 Project Structure

```
iotkit-studio/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Controllers
│   │   ├── protocols/      # Protocol clients
│   │   ├── simulation/     # Simulation engine
│   │   ├── middleware/     # Middleware
│   │   ├── utils/          # Utilities
│   │   └── index.ts        # Entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
│
├── frontend/               # Frontend App
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities
│   │   ├── store/         # State management
│   │   └── types/         # TypeScript types
│   └── package.json
│
└── docker-compose.yml     # Docker services
```

## 🔧 Development Workflow

### Daily Development

```bash
# 1. Start PostgreSQL (if not running)
docker-compose up -d postgres

# 2. Start backend (Terminal 1)
cd backend
npm run dev

# 3. Start frontend (Terminal 2)
cd frontend
npm run dev

# 4. Start coding! 🎉
```

### Making Changes

#### Backend Changes

1. **Edit code** in `backend/src/`
2. **Server auto-restarts** (nodemon)
3. **Test API** dengan Postman/curl

#### Frontend Changes

1. **Edit code** in `frontend/src/`
2. **Hot reload** otomatis
3. **View changes** di browser

#### Database Changes

1. **Edit schema** di `backend/prisma/schema.prisma`
2. **Create migration**:
   ```bash
   cd backend
   npm run prisma:migrate
   ```
3. **Regenerate client**:
   ```bash
   npm run prisma:generate
   ```

## 🧪 Testing

### Manual Testing

**Test Backend API:**

```bash
# Health check
curl http://localhost:4000/health

# Register user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"test123"}'
```

**Test Frontend:**

1. Open http://localhost:3000
2. Register account
3. Create project
4. Test features

### Database Testing

```bash
# Open Prisma Studio
cd backend
npm run prisma:studio

# View/edit data in browser
# http://localhost:5555
```

## 🗄️ Database Management

### Common Commands

```bash
cd backend

# View database
npm run prisma:studio

# Create migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma Client
npm run prisma:generate
```

### Direct PostgreSQL Access

```bash
# Connect to database
docker exec -it iotkit-postgres psql -U iotkit -d iotkit_studio

# List tables
\dt

# View table structure
\d "User"

# Query data
SELECT * FROM "User";

# Exit
\q
```

### Backup & Restore

```bash
# Backup
docker exec iotkit-postgres pg_dump -U iotkit iotkit_studio > backup.sql

# Restore
docker exec -i iotkit-postgres psql -U iotkit iotkit_studio < backup.sql
```

## 🐛 Debugging

### Backend Debugging

**Console Logs:**

```typescript
import { Logger } from "./utils/logger";

Logger.info("Debug message");
Logger.error("Error message");
Logger.debug("Debug info");
```

**VS Code Debugger:**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

### Frontend Debugging

**Browser DevTools:**

- F12 untuk open DevTools
- Console tab untuk logs
- Network tab untuk API calls
- React DevTools extension

**Console Logs:**

```typescript
console.log("Debug:", data);
console.error("Error:", error);
```

### Database Debugging

```bash
# View logs
docker logs iotkit-postgres

# Check connections
docker exec -it iotkit-postgres psql -U iotkit -d iotkit_studio -c "SELECT * FROM pg_stat_activity;"
```

## 🔄 Git Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

### Commit Messages

Format: `type(scope): message`

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

Examples:

```bash
git commit -m "feat(backend): add MQTT reconnect logic"
git commit -m "fix(frontend): resolve login redirect issue"
git commit -m "docs(readme): update setup instructions"
```

## 📦 Adding Dependencies

### Backend

```bash
cd backend

# Install package
npm install package-name

# Install dev dependency
npm install -D package-name

# Update package.json
```

### Frontend

```bash
cd frontend

# Install package
npm install package-name

# Install dev dependency
npm install -D package-name
```

## 🎨 Code Style

### TypeScript

```typescript
// Use interfaces for objects
interface User {
  id: string;
  email: string;
  name?: string;
}

// Use types for unions/primitives
type Status = "active" | "inactive";

// Use async/await
async function fetchData() {
  try {
    const data = await api.get("/data");
    return data;
  } catch (error) {
    console.error(error);
  }
}
```

### React Components

```typescript
'use client' // If using hooks

import { useState } from 'react'

interface Props {
  title: string
  onSubmit: () => void
}

export default function MyComponent({ title, onSubmit }: Props) {
  const [state, setState] = useState('')

  return (
    <div>
      <h1>{title}</h1>
    </div>
  )
}
```

## 🚨 Common Issues

### Port Already in Use

**Backend (4000):**

```bash
# Find process
lsof -i :4000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=5000
```

**Frontend (3000):**

```bash
# Run on different port
PORT=3001 npm run dev
```

**PostgreSQL (5432):**

```bash
# Stop other PostgreSQL
sudo systemctl stop postgresql

# Or use different port in docker-compose.yml
```

### Database Connection Error

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker logs iotkit-postgres
```

### Module Not Found

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json .next
npm install
```

### Prisma Client Error

```bash
cd backend

# Regenerate client
npm run prisma:generate

# Reset if needed
npx prisma migrate reset
```

## 📊 Performance Tips

### Backend

- Use database indexes
- Implement caching
- Optimize queries
- Use connection pooling

### Frontend

- Use React.memo for expensive components
- Implement lazy loading
- Optimize images
- Use proper state management

## 🔐 Security (Development)

**Safe for Development:**

- Default PostgreSQL credentials
- Simple JWT secret
- CORS open to localhost
- Rate limiting relaxed

**DO NOT use in production!**

## 📚 Resources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express Docs](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Tools

- [Postman](https://www.postman.com/) - API testing
- [Prisma Studio](https://www.prisma.io/studio) - Database GUI
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL GUI

## ✅ Development Checklist

Daily:

- [ ] PostgreSQL running
- [ ] Backend running
- [ ] Frontend running
- [ ] No console errors
- [ ] Git commits regular

Before Commit:

- [ ] Code formatted
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Test manually
- [ ] Meaningful commit message

## 🎉 Happy Coding!

Sekarang Anda siap untuk development IoTKit-Studio! 🚀

**Tips:**

- Commit often
- Test frequently
- Ask questions
- Have fun! 😊
