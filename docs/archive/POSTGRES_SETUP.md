# PostgreSQL Setup Guide untuk IoTKit-Studio

Panduan lengkap untuk setup PostgreSQL sebagai database IoTKit-Studio.

## 📋 Prerequisites

Pilih salah satu metode instalasi PostgreSQL:

### Option 1: Docker (Recommended)

- Docker Desktop atau Docker Engine
- Docker Compose

### Option 2: Local Installation

- PostgreSQL 15 atau lebih tinggi

## 🐳 Setup dengan Docker (Recommended)

### 1. Start PostgreSQL Container

Gunakan docker-compose yang sudah disediakan:

```bash
# Start hanya PostgreSQL
docker-compose up -d postgres

# Atau start semua services
docker-compose up -d
```

PostgreSQL akan berjalan di:

- **Host**: localhost
- **Port**: 5432
- **Database**: iotkit_studio
- **Username**: iotkit
- **Password**: iotkit123

### 2. Verify PostgreSQL Running

```bash
# Check container status
docker ps | grep postgres

# Check logs
docker logs iotkit-postgres

# Test connection
docker exec -it iotkit-postgres psql -U iotkit -d iotkit_studio
```

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start backend
npm run dev
```

## 💻 Setup dengan Local PostgreSQL

### 1. Install PostgreSQL

**macOS (Homebrew):**

```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download installer dari [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

```bash
# Login sebagai postgres user
sudo -u postgres psql

# Atau di Windows
psql -U postgres
```

Jalankan SQL commands:

```sql
-- Create user
CREATE USER iotkit WITH PASSWORD 'iotkit123';

-- Create database
CREATE DATABASE iotkit_studio;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE iotkit_studio TO iotkit;

-- Connect to database
\c iotkit_studio

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO iotkit;

-- Exit
\q
```

### 3. Update Backend Configuration

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://iotkit:iotkit123@localhost:5432/iotkit_studio?schema=public"
```

### 4. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start backend
npm run dev
```

## 🔧 Database Configuration

### Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
```

**Default:**

```
postgresql://iotkit:iotkit123@localhost:5432/iotkit_studio?schema=public
```

### Environment Variables

**Development (.env):**

```env
DATABASE_URL="postgresql://iotkit:iotkit123@localhost:5432/iotkit_studio?schema=public"
```

**Production:**

```env
DATABASE_URL="postgresql://user:password@your-host:5432/database?schema=public&sslmode=require"
```

## 📊 Database Management

### Prisma Commands

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (GUI)
npm run prisma:studio
```

### Direct PostgreSQL Commands

```bash
# Connect to database
psql -U iotkit -d iotkit_studio

# List databases
\l

# List tables
\dt

# Describe table
\d table_name

# Run SQL query
SELECT * FROM "User";

# Exit
\q
```

## 🔍 Verify Setup

### 1. Check Database Connection

```bash
cd backend
npx prisma db pull
```

Jika berhasil, Prisma akan membaca schema dari database.

### 2. Check Tables

```bash
psql -U iotkit -d iotkit_studio -c "\dt"
```

Anda harus melihat tables:

- User
- Project
- Payload
- Simulation
- Log
- \_prisma_migrations

### 3. Test Backend

```bash
cd backend
npm run dev
```

Check logs untuk memastikan tidak ada error koneksi database.

## 🐛 Troubleshooting

### Connection Refused

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# atau
sudo systemctl status postgresql

# Start PostgreSQL
docker-compose up -d postgres
# atau
sudo systemctl start postgresql
```

### Authentication Failed

**Problem:** `password authentication failed for user "iotkit"`

**Solution:**

1. Verify credentials in `.env`
2. Recreate user:

```sql
DROP USER IF EXISTS iotkit;
CREATE USER iotkit WITH PASSWORD 'iotkit123';
GRANT ALL PRIVILEGES ON DATABASE iotkit_studio TO iotkit;
```

### Database Does Not Exist

**Problem:** `database "iotkit_studio" does not exist`

**Solution:**

```sql
CREATE DATABASE iotkit_studio;
GRANT ALL PRIVILEGES ON DATABASE iotkit_studio TO iotkit;
```

### Migration Failed

**Problem:** Migration errors

**Solution:**

```bash
# Reset migrations
npx prisma migrate reset

# Or manually drop and recreate
psql -U iotkit -d iotkit_studio -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Run migrations again
npm run prisma:migrate
```

### Port Already in Use

**Problem:** Port 5432 already in use

**Solution:**

```bash
# Find process using port
lsof -i :5432
# atau
netstat -ano | findstr :5432

# Kill process or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use different host port
```

## 🔐 Security Best Practices

### Production Setup

1. **Change Default Password:**

```env
DATABASE_URL="postgresql://iotkit:STRONG_PASSWORD_HERE@host:5432/iotkit_studio"
```

2. **Use SSL/TLS:**

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

3. **Restrict Access:**
   Edit `postgresql.conf`:

```
listen_addresses = 'localhost'
```

Edit `pg_hba.conf`:

```
host    iotkit_studio    iotkit    127.0.0.1/32    md5
```

4. **Regular Backups:**

```bash
# Backup
pg_dump -U iotkit iotkit_studio > backup.sql

# Restore
psql -U iotkit iotkit_studio < backup.sql
```

## 📈 Performance Tuning

### Recommended Settings

Edit `postgresql.conf`:

```conf
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connections
max_connections = 100

# Logging
log_statement = 'all'
log_duration = on
```

### Indexes

Prisma automatically creates indexes for:

- Primary keys
- Foreign keys
- Unique constraints

## 🔄 Migration from SQLite

Jika Anda sudah punya data di SQLite:

```bash
# Export data dari SQLite
sqlite3 dev.db .dump > sqlite_dump.sql

# Convert dan import ke PostgreSQL
# (Manual conversion needed for syntax differences)

# Or use Prisma
npx prisma db push
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Docker PostgreSQL](https://hub.docker.com/_/postgres)

## ✅ Checklist

- [ ] PostgreSQL installed/running
- [ ] Database created
- [ ] User created with privileges
- [ ] `.env` configured
- [ ] Prisma client generated
- [ ] Migrations run successfully
- [ ] Backend connects successfully
- [ ] Prisma Studio accessible

## 🎉 Success!

Jika semua langkah berhasil:

✅ PostgreSQL running
✅ Database migrated
✅ Backend connected
✅ Ready for development!

Happy coding! 🚀
