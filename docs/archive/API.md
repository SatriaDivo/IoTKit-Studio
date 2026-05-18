# IoTKit-Studio API Documentation

Complete API documentation for IoTKit-Studio backend.

## Base URL

```
http://localhost:4000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

### Success Response

```json
{
  "data": { ... },
  "message": "Success message"
}
```

### Error Response

```json
{
  "error": "Error message"
}
```

## Endpoints

### Authentication

#### POST /auth/register

Register a new user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token"
}
```

#### POST /auth/login

Login existing user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token"
}
```

#### GET /auth/me

Get current user information.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Projects

#### GET /projects

Get all projects for authenticated user.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Temperature Sensor",
    "description": "IoT temperature monitoring",
    "protocol": "MQTT",
    "host": "test.mosquitto.org",
    "port": 1883,
    "topic": "sensors/temperature",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /projects/:id

Get project by ID.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": "uuid",
  "name": "Temperature Sensor",
  "description": "IoT temperature monitoring",
  "protocol": "MQTT",
  "host": "test.mosquitto.org",
  "port": 1883,
  "topic": "sensors/temperature",
  "status": "active",
  "payloads": [...],
  "simulations": [...],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### POST /projects

Create new project.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Temperature Sensor",
  "description": "IoT temperature monitoring",
  "protocol": "MQTT",
  "host": "test.mosquitto.org",
  "port": 1883,
  "topic": "sensors/temperature",
  "sslEnabled": false,
  "autoReconnect": true
}
```

**Response:**

```json
{
  "id": "uuid",
  "name": "Temperature Sensor",
  ...
}
```

#### PUT /projects/:id

Update project.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response:**

```json
{
  "id": "uuid",
  "name": "Updated Name",
  ...
}
```

#### DELETE /projects/:id

Delete project.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Project deleted successfully"
}
```

#### POST /projects/:id/test-connection

Test project connection.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "connected": true,
  "error": null
}
```

---

### Payloads

#### GET /payloads/project/:projectId

Get all payloads for a project.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "Temperature Payload",
    "structure": "[{\"name\":\"temperature\",\"type\":\"number\",\"mode\":\"random\",\"min\":20,\"max\":30}]",
    "template": false,
    "projectId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /payloads

Create new payload.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "name": "Temperature Payload",
  "structure": [
    {
      "name": "temperature",
      "type": "number",
      "mode": "random",
      "min": 20,
      "max": 30,
      "required": true
    }
  ],
  "projectId": "uuid",
  "template": false
}
```

**Response:**

```json
{
  "id": "uuid",
  "name": "Temperature Payload",
  ...
}
```

#### POST /payloads/generate

Generate payload from structure.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "structure": [
    {
      "name": "temperature",
      "type": "number",
      "mode": "random",
      "min": 20,
      "max": 30,
      "required": true
    }
  ]
}
```

**Response:**

```json
{
  "payload": {
    "temperature": 25.4
  }
}
```

---

### Simulations

#### POST /simulations/start

Start simulation.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "projectId": "uuid",
  "payloadStructure": [...],
  "interval": 1000,
  "batchSize": 1
}
```

**Response:**

```json
{
  "message": "Simulation started successfully"
}
```

#### POST /simulations/stop

Stop simulation.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "projectId": "uuid"
}
```

**Response:**

```json
{
  "message": "Simulation stopped successfully"
}
```

#### GET /simulations/:projectId/status

Get simulation status.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "isRunning": true,
  "stats": {
    "totalSent": 100,
    "successCount": 98,
    "errorCount": 2,
    "startTime": 1234567890
  }
}
```

---

### Logs

#### GET /logs/project/:projectId

Get logs for a project.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `type` (optional): Filter by log type (request, response, error, event)
- `limit` (optional): Number of logs to return (default: 100)

**Response:**

```json
[
  {
    "id": "uuid",
    "type": "request",
    "protocol": "MQTT",
    "message": "Published to topic sensors/temperature",
    "payload": "{\"temperature\":25.4}",
    "latency": 45,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
]
```

#### DELETE /logs/project/:projectId/clear

Clear all logs for a project.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "message": "Logs cleared successfully"
}
```

---

## WebSocket Events

Connect to WebSocket:

```javascript
const socket = io("http://localhost:4000");
```

### Events

#### subscribe

Subscribe to project updates.

```javascript
socket.emit("subscribe", projectId);
```

#### unsubscribe

Unsubscribe from project updates.

```javascript
socket.emit("unsubscribe", projectId);
```

#### payloadSent

Receive when payload is sent.

```javascript
socket.on("payloadSent", (data) => {
  console.log(data);
  // { projectId, payload, result, stats }
});
```

#### payloadError

Receive when error occurs.

```javascript
socket.on("payloadError", (data) => {
  console.log(data);
  // { projectId, payload, error, stats }
});
```

---

## Error Codes

| Code | Description                             |
| ---- | --------------------------------------- |
| 400  | Bad Request - Invalid input             |
| 401  | Unauthorized - Invalid or missing token |
| 403  | Forbidden - Access denied               |
| 404  | Not Found - Resource not found          |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error                   |

---

## Rate Limiting

Default rate limit: 100 requests per 15 minutes per IP address.

When rate limit is exceeded, you'll receive:

```json
{
  "error": "Too many requests, please try again later."
}
```

---

## Examples

### cURL Examples

**Register:**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Create Project:**

```bash
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name":"Temperature Sensor",
    "protocol":"MQTT",
    "host":"test.mosquitto.org",
    "port":1883,
    "topic":"sensors/temperature"
  }'
```

**Start Simulation:**

```bash
curl -X POST http://localhost:4000/api/simulations/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectId":"YOUR_PROJECT_ID",
    "payloadStructure":[{"name":"temp","type":"number","mode":"random","min":20,"max":30}],
    "interval":1000,
    "batchSize":1
  }'
```

---

## Support

For issues or questions, please create an issue on GitHub.
