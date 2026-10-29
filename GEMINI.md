# IoTKit Studio - Claude AI Agent Configuration

## 📋 Project Overview

**IoTKit Studio** is an industrial IoT simulation platform with a modern dashboard for creating, managing, and sending IoT sensor payloads without coding.

### ✨ Key Features (Updated 2026)

#### Core Features

- **Project Management**: Create and manage multiple IoT projects with full CRUD operations
- **Multi-Protocol Support**: HTTP/HTTPS, MQTT/MQTTS, WebSocket/WSS with SSL/TLS
- **Visual Payload Builder**: Build JSON payload structures visually without coding
- **Real-time Simulation**: Run sensor data simulations with configurable intervals
- **Swarm Mode**: Simulate multiple devices simultaneously
- **Webhook Support**: Public webhook endpoints for each project

#### Analytics & Monitoring

- **Analytics Dashboard** ✅ **NEW**: Real-time charts with time range selection (1h, 24h, 7d, 30d)
  - Area Chart: Payload trends over time
  - Line Chart: Success rate tracking
  - Pie Chart: Protocol distribution
  - Bar Chart: Latency analysis
  - Performance summary with success/failed breakdown
  - **Uses REAL data from logs** (no dummy data)
- **Real-time Monitoring**: Live activity feed with WebSocket updates
- **Comprehensive Logging**: Request/response logs with latency tracking
- **Alert System**: AlertRule and AlertLog models for threshold-based alerts

#### AI & Automation

- **AI Agent**: Autonomous project creation using natural language (Indonesian & English)
- **Chat History**: Persistent chat sessions with PostgreSQL storage
- **Unlimited Prompts**: Uncapped prompts with sliding window context memory

#### UI/UX

- **Stormy Morning Design System**: Industrial IoT theme (NOT chatbot-like)
- **Responsive Layout**: Mobile, tablet, and desktop optimized
- **Dark Sidebar**: Professional industrial control panel aesthetic

### 🛠️ Tech Stack

**Frontend:**

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Recharts (for Analytics charts)
- Framer Motion (animations)
- Zustand (state management)
- Socket.IO Client

**Backend:**

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- MQTT.js, Axios, WebSocket
- JWT Authentication
- node-cron (scheduled tasks)

---

## 🎯 Development Guidelines

### Design System: "Stormy Morning"

This project uses an **industrial IoT design system**, NOT a chatbot interface.

**Color Palette:**

```css
Primary:   #6A89A7  (Slate Blue)
Accent:    #BDDDFC  (Light Blue)
Highlight: #88BDF2  (Sky Blue)
Secondary: #384959  (Dark Slate)

Success:   #4CAF50  (Green)
Error:     #F44336  (Red)
Warning:   #FF9800  (Orange)
Info:      #2196F3  (Blue)
```

**Design Philosophy:**

- ✅ Industrial control panel aesthetic
- ✅ Data-focused with clear hierarchy
- ✅ Professional and clean
- ✅ Real data visualization
- ❌ NO chat bubbles, bot avatars, or conversational UI
- ❌ NO bright blue/cyan colors
- ❌ NO dummy/mock data

**Reference**: See `DESIGN.md` for complete design system documentation.

---

## 📁 Project Structure

```
iotkit-studio/
├── backend/
│   ├── src/
│   │   ├── controllers/      # API controllers
│   │   │   ├── authController.ts
│   │   │   ├── projectController.ts
│   │   │   ├── payloadController.ts
│   │   │   ├── simulationController.ts
│   │   │   ├── logController.ts
│   │   │   └── aiAgentController.ts
│   │   ├── routes/           # Express routes
│   │   ├── middleware/       # Auth, error handling, rate limiting
│   │   ├── modules/          # IoT modules (hera, drone, carbon)
│   │   ├── protocols/        # MQTT, HTTP, WebSocket clients
│   │   ├── services/         # Business logic
│   │   │   ├── jobManager.ts
│   │   │   ├── scheduler.ts
│   │   │   ├── chatCleanupScheduler.ts
│   │   │   └── transportRouter.ts
│   │   ├── simulation/       # Simulation manager
│   │   └── types/            # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   │   ├── (dashboard)/  # Dashboard pages
│   │   │   │   ├── dashboard/      # Main dashboard
│   │   │   │   ├── projects/       # Project management
│   │   │   │   ├── analytics/      # ✅ NEW Analytics page
│   │   │   │   ├── ai-agent/       # AI Agent chat
│   │   │   │   ├── payload-builder/
│   │   │   │   ├── logs/
│   │   │   │   └── settings/
│   │   │   └── (auth)/       # Auth pages (login, register)
│   │   ├── components/       # React components
│   │   │   ├── layout/       # SidebarV2, HeaderV2
│   │   │   └── ui/           # Reusable UI components
│   │   ├── lib/              # Utilities (api, utils)
│   │   ├── store/            # Zustand stores
│   │   └── app/globals.css   # Stormy Morning theme styles
│   └── package.json
├── docs/                     # Documentation
│   ├── GET_STARTED.md
│   ├── API.md
│   ├── DEVELOPMENT.md
│   └── ...
├── DESIGN.md                 # Design system documentation
└── docker-compose.yml
```

---

## 🗄️ Database Schema (Prisma)

### Main Models

**User**

- Authentication and user management
- Relations: projects, chatSessions

**Project**

- IoT project configuration
- Fields: name, description, protocol, host, port, endpoint, topic
- Auth: authToken, username, password, headers
- Features: webhookToken, webhookEnabled, sslEnabled
- Relations: payloads, logs, simulations, alertRules, alertLogs

**Payload**

- Payload structure definitions
- JSON structure with field types and generation modes
- Template support

**Simulation**

- Simulation configuration and execution
- Modes: interval, manual, scenario
- Features: swarmMode, swarmCount, stages
- Stats: totalSent, successCount, errorCount
- Tracking: lastRunAt, lastPayload, lastResponse

**Log**

- Activity logging
- Types: request, response, error, event
- Metrics: latency, statusCode
- Timestamp-based filtering

**Dataset**

- Module datasets (HERA, Drone, Carbon)
- CSV file management
- Active/inactive status

**ChatSession & ChatMessage**

- AI Agent chat history
- Persistent storage in PostgreSQL
- Persistent session logs (no auto-deletion)

**AlertRule** ✅ **NEW**

- Threshold-based alert rules
- Fields: field, operator, value, severity
- Active/inactive status

**AlertLog** ✅ **NEW**

- Alert event logging
- Severity levels
- Read/unread status

---

## 🔌 API Endpoints

**Base URL**: `http://localhost:4000/api`

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user

### Projects

- `GET /projects` - Get all projects
- `GET /projects/:id` - Get project by ID
- `POST /projects` - Create project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `POST /projects/:id/test-connection` - Test connection

### Payloads

- `GET /payloads/project/:projectId` - Get project payloads
- `POST /payloads` - Create payload
- `POST /payloads/generate` - Generate payload from structure

### Simulations

- `POST /simulations/start` - Start simulation
- `POST /simulations/stop` - Stop simulation
- `GET /simulations/:projectId/status` - Get simulation status
- `GET /simulations/stats` - Get overall statistics

### Logs

- `GET /logs` - Get all logs (with pagination)
- `GET /logs/project/:projectId` - Get project logs
- `DELETE /logs/project/:projectId/clear` - Clear project logs

### AI Agent

- `POST /ai-agent/chat` - Send chat message
- `GET /ai-agent/sessions` - Get chat sessions
- `POST /ai-agent/sessions` - Create new session
- `DELETE /ai-agent/sessions/:id` - Delete session

**WebSocket**: Real-time updates via Socket.IO on port 4000

---

## 🛠️ Common Development Tasks

### Running the Project

```bash
# Backend (Terminal 1)
cd backend
npm run dev              # Starts on http://localhost:4000

# Frontend (Terminal 2)
cd frontend
npm run dev              # Starts on http://localhost:3000

# Database GUI (Terminal 3)
cd backend
npm run prisma:studio    # Opens on http://localhost:5555
```

### Database Operations

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate dev --name migration_name

# Reset database (⚠️ deletes all data)
npm run prisma:migrate reset

# View database
npm run prisma:studio
```

### Adding a New Feature

1. **Backend**:
   - Create controller in `backend/src/controllers/`
   - Add route in `backend/src/routes/`
   - Update types in `backend/src/types/`
   - If needed, update `schema.prisma` and run migration

2. **Frontend**:
   - Create page in `frontend/src/app/(dashboard)/`
   - Add components in `frontend/src/components/`
   - Update store if needed in `frontend/src/store/`
   - Follow Stormy Morning design system

3. **Styling**:
   - Use utility classes: `.card-industrial`, `.btn-primary`, `.table-industrial`
   - Follow color palette from `DESIGN.md`
   - NO dummy data - always use real API data

---

## 🎨 UI/UX Guidelines

### Component Styling

**Utility Classes:**

```css
.card-industrial          /* Industrial-style cards */
.btn-primary              /* Primary buttons (Slate Blue) */
.btn-secondary            /* Secondary buttons (Light Blue) */
.btn-outline              /* Outline buttons */
.table-industrial         /* Data tables */
.sidebar-industrial       /* Sidebar styling */
.badge-active             /* Success badge */
.badge-error              /* Error badge */
```

**Tailwind Colors:**

```tsx
bg-[#6A89A7]     // Primary background
text-[#2C3E50]   // Primary text
border-[#D1DBE5] // Borders
bg-[#4CAF50]     // Success
bg-[#F44336]     // Error
bg-[#88BDF2]     // Highlight
```

### Page Layout Template

```tsx
<div className="space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50]">Page Title</h1>
      <p className="text-[#5A6C7D] mt-1">Description</p>
    </div>
    {/* Actions */}
    <Button className="btn-primary">
      <Icon className="h-4 w-4 mr-2" />
      Action
    </Button>
  </div>

  {/* Content */}
  <Card className="card-industrial">
    <CardHeader className="border-b border-[#E8EDF2]">
      <CardTitle className="text-lg text-[#2C3E50]">Section Title</CardTitle>
    </CardHeader>
    <CardContent className="pt-6">{/* Content here */}</CardContent>
  </Card>
</div>
```

---

## 📊 Analytics Implementation ✅ NEW

The Analytics page (`frontend/src/app/(dashboard)/analytics/page.tsx`) uses **REAL data from logs**, not dummy data.

### Data Flow

1. **Fetch Logs**: `GET /api/logs?limit=1000&sort=desc`
2. **Filter by Time Range**: 1h, 24h, 7d, 30d
3. **Group into Buckets**: Time-based bucketing
4. **Calculate Metrics**:
   - Payloads sent per interval
   - Success rate from log status
   - Average latency from log data
5. **Update Charts**: Real-time updates every 5 seconds

### Chart Types

**Area Chart** - Payload Trends

- X-axis: Time intervals
- Y-axis: Number of payloads sent
- Data: Real log counts per time bucket

**Line Chart** - Success Rate

- X-axis: Time intervals
- Y-axis: Success percentage (0-100%)
- Data: Calculated from log status codes

**Pie Chart** - Protocol Distribution

- Data: Count of projects by protocol (MQTT, HTTP, WebSocket)

**Bar Chart** - Latency Trends

- X-axis: Time intervals
- Y-axis: Average latency (ms)
- Data: Real latency from logs

### Empty States

All charts show empty states when no data is available:

- "No data available" message
- Icon indicator
- Call-to-action text

---

## 🤖 AI Agent

The AI Agent feature allows users to create projects using natural language.

**Key Files:**

- `backend/src/controllers/aiAgentController.ts` - Chat logic with OpenRouter API
- `backend/src/routes/aiAgent.ts` - API routes
- `frontend/src/app/(dashboard)/ai-agent/page.tsx` - Chat UI

**Features:**

- Multi-language support (Indonesian & English)
- Chat history persistence (PostgreSQL)
- Unlimited daily prompts with 15-turn sliding window
- Real-time task execution
- Session management

**Database Models:**

- `ChatSession` - Chat sessions with title and timestamps
- `ChatMessage` - Individual messages with role (user/assistant/system)

---

## 🔍 Code Review & Quality

### Before Committing

1. ✅ Run TypeScript checks: `npm run build`
2. ✅ Check for console errors in browser
3. ✅ Test the feature manually
4. ✅ Follow Stormy Morning design system
5. ✅ Use REAL data, no dummy/mock data
6. ✅ Update documentation if needed
7. ✅ Check responsive design (mobile, tablet, desktop)

### Commit Message Format

Follow conventional commits:

```
feat: Add new feature
fix: Fix bug
refactor: Refactor code
docs: Update documentation
style: Update styling
perf: Performance improvement
test: Add tests
chore: Maintenance tasks
```

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Prefer functional components (React)
- Use async/await over promises
- Handle errors properly with try-catch
- Add loading states for async operations
- Add empty states for no data scenarios

---

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

---

## 📚 Additional Resources

- **Documentation**: `docs/` folder
- **API Reference**: `docs/API.md`
- **Design System**: `DESIGN.md`
- **Getting Started**: `docs/GET_STARTED.md`
- **Development Guide**: `docs/DEVELOPMENT.md`
- **Quick Reference**: `docs/QUICK_REFERENCE.md`

---

## 🚀 Recent Updates (2026)

### ✅ Completed Features

1. **Analytics Dashboard** - Real-time charts with Recharts
2. **Stormy Morning Design System** - Industrial IoT theme applied
3. **AI Agent Chat History** - PostgreSQL persistence with auto-cleanup
4. **Alert System** - AlertRule and AlertLog models
5. **Webhook Support** - Public webhook endpoints per project
6. **Swarm Mode** - Multiple device simulation
7. **Real Data Implementation** - Removed all dummy/mock data

### 🎯 Next Priorities

1. Alert notification system (email, webhook)
2. Device management and grouping
3. Advanced data processing pipeline
4. Role-based access control (RBAC)
5. API key management
6. Reporting system

---

**Happy Coding! 🚀**

_Last Updated: 2026-05-19_
