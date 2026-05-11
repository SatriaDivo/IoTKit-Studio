# IoTKit-Studio Backend

RESTful API server untuk IoT simulation platform.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM
- **SQLite** - Database
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **MQTT.js** - MQTT client
- **ws** - WebSocket client
- **Axios** - HTTP client

## Project Structure

```
src/
├── routes/              # API routes
│   ├── auth.ts
│   ├── projects.ts
│   ├── payloads.ts
│   ├── simulations.ts
│   └── logs.ts
│
├── controllers/         # Route controllers
│   ├── authController.ts
│   ├── projectController.ts
│   ├── payloadController.ts
│   ├── simulationController.ts
│   └── logController.ts
│
├── services/           # Business logic
│   └── (future)
│
├── protocols/          # Protocol implementations
│   ├── http/
│   │   └── httpClient.ts
│   ├── mqtt/
│   │   └── mqttClient.ts
│   └── websocket/
│       └── wsClient.ts
│
├── simulation/         # Simulation engine
│   └── simulationManager.ts
│
├── middleware/         # Express middleware
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── rateLimiter.ts
│
├── utils/             # Utilities
│   ├── logger.ts
│   ├── jwt.ts
│   └── payloadGenerator.ts
│
├── types/             # TypeScript types
│   └── index.ts
│
└── index.ts           # Entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

Server will run at `http://localhost:4000`

### Environment Variables

Create `.env`:

```env
NODE_ENV=development
PORT=4000
HOST=localhost
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server with nodemon

# Production
npm run build            # Compile TypeScript
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio

# Code Quality
npm run lint             # Run ESLint
```

## API Endpoints

### Authentication

```
POST   /api/auth/register    # Register new user
POST   /api/auth/login       # Login user
GET    /api/auth/me          # Get current user
```

### Projects

```
GET    /api/projects              # Get all projects
GET    /api/projects/:id          # Get project by ID
POST   /api/projects              # Create project
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
POST   /api/projects/:id/test-connection  # Test connection
```

### Payloads

```
GET    /api/payloads/project/:projectId  # Get payloads
POST   /api/payloads                     # Create payload
PUT    /api/payloads/:id                 # Update payload
DELETE /api/payloads/:id                 # Delete payload
POST   /api/payloads/generate            # Generate payload
```

### Simulations

```
POST   /api/simulations/start              # Start simulation
POST   /api/simulations/stop               # Stop simulation
GET    /api/simulations/:projectId/status  # Get status
GET    /api/simulations/:projectId/stats   # Get statistics
```

### Logs

```
GET    /api/logs/project/:projectId        # Get logs
DELETE /api/logs/:id                       # Delete log
DELETE /api/logs/project/:projectId/clear  # Clear logs
```

## Database Schema

Using Prisma ORM with SQLite:

### Models

- **User** - User accounts
- **Project** - IoT projects
- **Payload** - Payload structures
- **Simulation** - Simulation records
- **Log** - Activity logs

### Migrations

```bash
# Create migration
npm run prisma:migrate

# Reset database
npx prisma migrate reset

# View database
npm run prisma:studio
```

## Protocol Clients

### HTTP Client

```typescript
import { HttpClient } from "./protocols/http/httpClient";

const client = new HttpClient(project);
const result = await client.send(payload, "POST");
```

### MQTT Client

```typescript
import { MqttClient } from "./protocols/mqtt/mqttClient";

const client = new MqttClient(project);
await client.connect();
await client.publish(payload);
```

### WebSocket Client

```typescript
import { WsClient } from "./protocols/websocket/wsClient";

const client = new WsClient(project);
await client.connect();
await client.send(payload);
```

## Simulation Engine

Manages real-time payload sending:

```typescript
import { SimulationManager } from "./simulation/simulationManager";

const manager = new SimulationManager();

// Start simulation
await manager.startSimulation(config, project);

// Stop simulation
manager.stopSimulation(projectId);

// Get stats
const stats = manager.getStats(projectId);
```

## Middleware

### Authentication

```typescript
import { authMiddleware } from "./middleware/auth";

router.get("/protected", authMiddleware, handler);
```

### Rate Limiting

Automatic rate limiting on all routes:

- 100 requests per 15 minutes per IP

### Error Handling

Global error handler catches all errors:

```typescript
throw new Error("Something went wrong");
// Returns: { error: 'Something went wrong' }
```

## Real-time Events

Using Socket.IO:

```typescript
io.on("connection", (socket) => {
  socket.on("subscribe", (projectId) => {
    socket.join(`project:${projectId}`);
  });
});

// Emit to project room
io.to(`project:${projectId}`).emit("payloadSent", data);
```

## Security

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS configuration
- Input validation
- SQL injection prevention (Prisma)

## Logging

Custom logger utility:

```typescript
import { Logger } from "./utils/logger";

Logger.info("Message");
Logger.error("Error message");
Logger.warn("Warning");
Logger.debug("Debug info");
```

## Testing

### Manual Testing

Use tools like:

- Postman
- Insomnia
- Thunder Client
- curl

### Example Requests

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create Project
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test","protocol":"HTTP","host":"localhost"}'
```

## Troubleshooting

### Port Already in Use

Change PORT in `.env`:

```env
PORT=5000
```

### Database Locked

```bash
rm prisma/dev.db
npm run prisma:migrate
```

### Module Not Found

```bash
rm -rf node_modules
npm install
```

## Performance

- Async/await for non-blocking operations
- Connection pooling
- Efficient database queries
- Event-driven architecture

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment

Set `NODE_ENV=production` in production.

### Database

For production, consider using PostgreSQL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/iotkit"
```

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT
