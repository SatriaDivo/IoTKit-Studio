# Testing Guide - IoTKit-Studio Hybrid Emulator

## 🚀 Quick Start

### 1. Start Backend

```bash
cd backend
npm run dev
```

Backend akan berjalan di: `http://localhost:4000`

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend akan berjalan di: `http://localhost:3000`

### 3. Start PostgreSQL (Docker)

```bash
docker-compose up -d postgres
```

---

## 🧪 Testing Backend Services

### Test 1: Health Check

```bash
curl http://localhost:4000/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-05-11T14:00:00.000Z"
}
```

---

### Test 2: Register User

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Expected Response:**

```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token** untuk request selanjutnya!

---

### Test 3: Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

### Test 4: Create Project

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "HERA Water Quality",
    "description": "Water quality monitoring project",
    "protocol": "MQTT",
    "host": "127.0.0.1",
    "port": 1883,
    "topic": "hera/telemetry/citarum_alpha"
  }'
```

**Expected Response:**

```json
{
  "id": "...",
  "name": "HERA Water Quality",
  "protocol": "MQTT",
  "status": "inactive",
  ...
}
```

**Save the project ID** untuk testing job!

---

## 🎯 Testing Module Services

### Test 5: Preview HERA Payload (Random)

```bash
curl -X POST http://localhost:4000/api/jobs/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "module_name": "hera",
    "payload_kind": "sensor",
    "payload_options": {
      "location": "citarum_node_alpha",
      "source_preference": "random"
    }
  }'
```

**Expected Response:**

```json
{
  "location": "citarum_node_alpha",
  "tegangan": 3.85,
  "suhu_air": 26.8,
  "suhu_lingkungan": 28.5,
  "kelembapan": 73.2,
  "tds": 520,
  "ec": 710,
  "ph": 7.1,
  "status": "normal",
  "timestamp": "2026-05-11T14:00:00.000Z"
}
```

---

### Test 6: Preview DRONE Payload (Navigation)

```bash
curl -X POST http://localhost:4000/api/jobs/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "module_name": "drone",
    "payload_kind": "navigation"
  }'
```

**Expected Response:**

```json
{
  "kondisi": {
    "command_code": "DRN010",
    "command_label": "hover",
    "heading": 180.5,
    "gps": {
      "lat": -6.914744,
      "lon": 107.60981,
      "alt": 100.0
    },
    "imu": { ... },
    "velocity": { ... },
    "obstacle": { ... },
    "mission_status": "in_progress",
    "timestamp": "2026-05-11T14:00:00.000Z"
  }
}
```

---

### Test 7: Preview Carbon Payload

```bash
curl -X POST http://localhost:4000/api/jobs/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "module_name": "carbon",
    "payload_kind": "agrisense",
    "payload_options": {
      "device_id": "AGRISENSE-CC-001"
    }
  }'
```

**Expected Response:**

```json
{
  "device_id": "AGRISENSE-CC-001",
  "message_id": "...",
  "location": { ... },
  "carbon_data": {
    "co2_ppm": 850,
    "tvoc_ppb": 120
  },
  "environment": { ... },
  "soil_7in1": { ... },
  "power": { ... },
  "communication": { ... },
  "status": { ... },
  "timestamp": "2026-05-11T14:00:00.000Z"
}
```

---

## 🔥 Testing Job Execution

### Test 8: Start HERA Job (MQTT)

**Setup MQTT Broker** (optional, untuk testing penuh):

```bash
docker run -d --name mosquitto -p 1883:1883 eclipse-mosquitto
```

**Start Job:**

```bash
curl -X POST http://localhost:4000/api/jobs/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "module_name": "hera",
    "endpoint": "mqtt://127.0.0.1:1883/hera/telemetry/citarum_alpha",
    "mode": "interval",
    "interval": 5,
    "target_count": 10,
    "payload_options": {
      "location": "citarum_node_alpha",
      "source_preference": "random"
    },
    "project_id": "YOUR_PROJECT_ID_HERE"
  }'
```

**Expected Response:**

```json
{
  "job_id": "hera-...",
  "module_name": "hera",
  "status": "running",
  "interval": 5,
  "endpoint": "mqtt://127.0.0.1:1883/hera/telemetry/citarum_alpha",
  "total_sent": 0,
  "success_count": 0,
  "failure_count": 0,
  ...
}
```

---

### Test 9: Get All Jobs

```bash
curl http://localhost:4000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**

```json
[
  {
    "job_id": "hera-...",
    "module_name": "hera",
    "status": "running",
    "total_sent": 3,
    "success_count": 3,
    "failure_count": 0,
    "last_run_at": "2026-05-11T14:00:15.000Z",
    ...
  }
]
```

---

### Test 10: Get Job Detail

```bash
curl http://localhost:4000/api/jobs/hera-YOUR-JOB-ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Test 11: Update Job

```bash
curl -X POST http://localhost:4000/api/jobs/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "job_id": "hera-YOUR-JOB-ID",
    "interval": 10,
    "target_count": 20
  }'
```

---

### Test 12: Stop Job

```bash
curl -X POST http://localhost:4000/api/jobs/stop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "job_id": "hera-YOUR-JOB-ID"
  }'
```

---

## 📁 Testing Dataset Management

### Test 13: Upload HERA Dataset

**Create test CSV file** (`test_hera.csv`):

```csv
tegangan,suhu_air,suhu_lingkungan,kelembapan,tds,ec,ph
3.8,26.5,28.3,72.5,450,680,7.2
3.9,27.1,29.0,75.0,520,720,7.1
4.0,26.8,28.7,73.2,480,700,7.3
```

**Upload:**

```bash
curl -X POST http://localhost:4000/api/datasets/hera/import-file \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@test_hera.csv"
```

**Expected Response:**

```json
{
  "success": true,
  "fileName": "1234567890-test_hera.csv",
  "metadata": {
    "filePath": "...",
    "fileSizeBytes": 256,
    "checksumSha256": "...",
    "delimiter": ",",
    "rowCount": 3,
    "headers": ["tegangan", "suhu_air", ...]
  }
}
```

---

### Test 14: Get Dataset Status

```bash
curl http://localhost:4000/api/datasets/hera/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "module": "hera",
  "activeDataset": {
    "fileName": "1234567890-test_hera.csv",
    "loadedRows": 3,
    "isActive": true,
    ...
  },
  "availableDatasets": [...]
}
```

---

### Test 15: Set Active Dataset

```bash
curl -X POST http://localhost:4000/api/datasets/hera/set-active \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "fileName": "1234567890-test_hera.csv"
  }'
```

---

### Test 16: Start Job with Dataset

```bash
curl -X POST http://localhost:4000/api/jobs/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "module_name": "hera",
    "endpoint": "http://127.0.0.1:9000/hera",
    "mode": "interval",
    "interval": 5,
    "target_count": 10,
    "payload_options": {
      "location": "citarum_node_alpha",
      "source_preference": "dataset"
    },
    "project_id": "YOUR_PROJECT_ID_HERE"
  }'
```

---

## 🎭 Testing Different Scenarios

### Scenario 1: DRONE Telemetry to HTTP

```bash
curl -X POST http://localhost:4000/api/jobs/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "module_name": "drone",
    "endpoint": "http://127.0.0.1:9000/drone/telemetry",
    "mode": "interval",
    "interval": 2,
    "target_count": 50,
    "payload_kind": "telemetry",
    "payload_options": {
      "drone_id": "DRONE-001",
      "mission_id": "MISSION-2026-001"
    }
  }'
```

---

### Scenario 2: Carbon to HTTP

```bash
curl -X POST http://localhost:4000/api/jobs/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "module_name": "carbon",
    "endpoint": "http://127.0.0.1:9000/carbon",
    "mode": "interval",
    "interval": 10,
    "target_count": 100,
    "payload_options": {
      "device_id": "AGRISENSE-CC-001"
    }
  }'
```

---

### Scenario 3: DRONE Scenario Mode (Multiple Payload Types)

```bash
curl -X POST http://localhost:4000/api/jobs/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "module_name": "drone",
    "endpoint": "http://127.0.0.1:9000/drone",
    "mode": "scenario",
    "interval": 3,
    "scenario": [
      {
        "payload_kind": "navigation"
      },
      {
        "payload_kind": "telemetry"
      },
      {
        "payload_kind": "camera"
      }
    ]
  }'
```

---

## 🔍 Monitoring & Debugging

### Check Logs

```bash
curl http://localhost:4000/api/logs?limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Check Running Jobs

```bash
curl http://localhost:4000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | jq '.[] | select(.status == "running")'
```

### Check Job Stats

```bash
curl http://localhost:4000/api/jobs/YOUR-JOB-ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  | jq '{
    job_id,
    status,
    total_sent,
    success_count,
    failure_count,
    last_error
  }'
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Module not found"

**Solution:** Pastikan module sudah diregister di `index.ts`:

```typescript
jobManager.registerModule("hera", heraService);
jobManager.registerModule("drone", droneService);
jobManager.registerModule("carbon", carbonService);
```

### Issue 2: "Endpoint validation failed"

**Solution:** Pastikan format endpoint benar:

- HTTP: `http://host:port/path`
- MQTT: `mqtt://host:port/topic`
- WebSocket: `ws://host:port/path`

### Issue 3: "Dataset not found"

**Solution:** Upload dataset terlebih dahulu dan set sebagai active.

### Issue 4: "Job not starting"

**Solution:** Check scheduler status:

```bash
curl http://localhost:4000/health
```

### Issue 5: "MQTT connection failed"

**Solution:** Pastikan MQTT broker running:

```bash
docker ps | grep mosquitto
```

---

## 📊 Performance Testing

### Load Test: Multiple Jobs

```bash
# Start 3 jobs simultaneously
for i in {1..3}; do
  curl -X POST http://localhost:4000/api/jobs/start \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN_HERE" \
    -d "{
      \"module_name\": \"hera\",
      \"endpoint\": \"http://127.0.0.1:9000/hera-$i\",
      \"mode\": \"interval\",
      \"interval\": 5,
      \"target_count\": 100
    }" &
done
wait
```

### Monitor System Resources

```bash
# Watch job count
watch -n 1 'curl -s http://localhost:4000/api/jobs -H "Authorization: Bearer TOKEN" | jq "length"'

# Watch running jobs
watch -n 1 'curl -s http://localhost:4000/api/jobs -H "Authorization: Bearer TOKEN" | jq "[.[] | select(.status == \"running\")] | length"'
```

---

## ✅ Testing Checklist

### Backend Core

- [ ] Health check responds
- [ ] Scheduler starts successfully
- [ ] Modules registered (HERA, DRONE, Carbon)
- [ ] Database connection works

### Authentication

- [ ] User registration works
- [ ] User login works
- [ ] Token authentication works
- [ ] Protected routes require auth

### Job Management

- [ ] Preview payload works (all modules)
- [ ] Start job works
- [ ] Job executes at interval
- [ ] Job stats update correctly
- [ ] Update job works
- [ ] Stop job works
- [ ] Auto-stop on target count

### Dataset Management

- [ ] Upload CSV works
- [ ] Dataset metadata saved
- [ ] Set active dataset works
- [ ] Job uses dataset correctly
- [ ] Dataset reload works

### Transport Protocols

- [ ] HTTP POST works
- [ ] MQTT publish works
- [ ] WebSocket send works
- [ ] Retry on failure works
- [ ] Latency tracking works

### Modules

- [ ] HERA generates valid payload
- [ ] DRONE generates all payload types
- [ ] Carbon generates valid payload
- [ ] Validation works for all modules

---

## 🎓 Next Steps

1. **Create Mock Endpoints** untuk testing tanpa external services
2. **Setup MQTT Broker** untuk testing MQTT protocol
3. **Create Frontend Tests** untuk UI components
4. **Add Integration Tests** dengan Jest/Vitest
5. **Setup CI/CD** untuk automated testing

---

**Happy Testing! 🚀**
