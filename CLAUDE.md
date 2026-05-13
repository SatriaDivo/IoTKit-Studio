# IoTKit Studio - Claude AI Agent Configuration

## 📋 Project Overview

**IoTKit Studio** is an industrial IoT simulation platform with a modern dashboard for creating, managing, and sending IoT sensor payloads without coding.

### Key Features

- **Project Management**: Create and manage multiple IoT projects
- **Multi-Protocol Support**: HTTP/HTTPS, MQTT/MQTTS, WebSocket/WSS
- **Visual Payload Builder**: Build JSON payload structures visually
- **Real-time Simulation**: Run sensor data simulations in real-time
- **Analytics Dashboard**: Real-time charts, metrics, and performance insights
- **AI Agent**: Autonomous project creation with natural language
- **Monitoring & Logs**: Real-time activity monitoring and logging
- **Modern UI**: Stormy Morning design system (industrial IoT theme)

### Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Recharts, Framer Motion
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Real-time**: Socket.IO
- **Protocols**: MQTT.js, Axios (HTTP), WebSocket

---

## 🎯 Development Guidelines

### Design System: "Stormy Morning"

This project uses an **industrial IoT design system**, NOT a chatbot interface.

**Color Palette:**

- Primary: `#6A89A7` (Slate Blue)
- Accent: `#BDDDFC` (Light Blue)
- Highlight: `#88BDF2` (Sky Blue)
- Secondary: `#384959` (Dark Slate)

**Design Philosophy:**

- ✅ Industrial control panel aesthetic
- ✅ Data-focused with clear hierarchy
- ✅ Professional and clean
- ❌ NO chat bubbles, bot avatars, or conversational UI
- ❌ NO bright blue/cyan colors

**Reference**: See `DESIGN.md` for complete design system documentation.

### Project Structure

```
iotkit-studio/
├── backend/
│   ├── src/
│   │   ├── controllers/      # API controllers
│   │   ├── routes/           # Express routes
│   │   ├── middleware/       # Auth, error handling
│   │   ├── modules/          # IoT modules (hera, drone, carbon)
│   │   ├── protocols/        # MQTT, HTTP, WebSocket clients
│   │   ├── services/         # Business logic
│   │   ├── simulation/       # Simulation manager
│   │   └── types/            # TypeScript types
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   │   ├── (dashboard)/  # Dashboard pages
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   ├── analytics/
│   │   │   │   ├── ai-agent/
│   │   │   │   └── logs/
│   │   │   └── (auth)/       # Auth pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities
│   │   └── store/            # Zustand stores
│   └── package.json
├── docs/                     # Documentation
└── docker-compose.yml
```

### Key Files to Know

**Backend:**

- `backend/src/index.ts` - Main server entry
- `backend/src/routes/` - API endpoints
- `backend/src/controllers/` - Request handlers
- `backend/prisma/schema.prisma` - Database models

**Frontend:**

- `frontend/src/app/(dashboard)/` - Main app pages
- `frontend/src/components/layout/` - Layout components
- `frontend/src/store/` - State management
- `frontend/src/app/globals.css` - Global styles with Stormy Morning theme

### Database Schema (Prisma)

**Main Models:**

- `User` - User accounts
- `Project` - IoT projects (protocol, host, port, etc.)
- `Payload` - Payload structures
- `Simulation` - Simulation configurations and stats
- `Log` - Activity logs
- `Dataset` - Module datasets (HERA, Drone, Carbon)
- `ChatSession` & `ChatMessage` - AI Agent chat history

### API Endpoints

**Base URL**: `http://localhost:4000/api`

**Key Routes:**

- `/auth/*` - Authentication (register, login)
- `/projects/*` - Project CRUD operations
- `/payloads/*` - Payload management
- `/simulations/*` - Start/stop simulations
- `/logs/*` - Activity logs
- `/ai-agent/*` - AI Agent chat

**WebSocket**: Real-time updates via Socket.IO

---

## 🛠️ Common Tasks

### Adding a New Feature

1. **Backend**: Create controller → Add route → Update types
2. **Frontend**: Create page/component → Add to router → Update store if needed
3. **Database**: Update `schema.prisma` → Run migration
4. **Styling**: Use Stormy Morning design system classes

### Running the Project

```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev

# Database GUI
cd backend
npm run prisma:studio
```

### Database Migrations

```bash
cd backend
npm run prisma:migrate dev --name your_migration_name
npm run prisma:generate
```

### Testing Endpoints

Use the API documentation in `docs/API.md` or test with:

- Postman/Insomnia
- `curl` commands
- Frontend integration

---

## 🎨 UI/UX Guidelines

### Component Styling

**Use these utility classes:**

- `.card-industrial` - Industrial-style cards
- `.btn-primary` - Primary buttons (Slate Blue)
- `.btn-secondary` - Secondary buttons (Light Blue)
- `.table-industrial` - Data tables
- `.sidebar-industrial` - Sidebar styling

**Colors (Tailwind):**

- `bg-[#6A89A7]` - Primary background
- `text-[#2C3E50]` - Primary text
- `border-[#D1DBE5]` - Borders
- `bg-[#4CAF50]` - Success
- `bg-[#F44336]` - Error

### Page Layout

All dashboard pages should follow this structure:

```tsx
<div className="space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold text-[#2C3E50]">Page Title</h1>
      <p className="text-[#5A6C7D] mt-1">Description</p>
    </div>
    {/* Actions */}
  </div>

  {/* Content */}
  <Card className="card-industrial">{/* ... */}</Card>
</div>
```

---

## 📊 Analytics Implementation

The Analytics page uses **real data from logs**, not dummy data:

- Fetches logs from `/api/logs` endpoint
- Groups logs into time buckets (1h, 24h, 7d, 30d)
- Calculates real metrics: payloads sent, success rate, latency
- Uses Recharts for data visualization

**Chart Types:**

- Area Chart: Payload trends
- Line Chart: Success rate over time
- Pie Chart: Protocol distribution
- Bar Chart: Latency trends

---

## 🤖 AI Agent

The AI Agent feature allows users to create projects using natural language.

**Key Files:**

- `backend/src/controllers/aiAgentController.ts` - Chat logic
- `backend/src/routes/aiAgent.ts` - API routes
- `frontend/src/app/(dashboard)/ai-agent/page.tsx` - UI

**Features:**

- Multi-language support (Indonesian & English)
- Chat history persistence (PostgreSQL)
- Auto-delete old chats (daily at 00:00)
- Real-time task execution

---

## 🔍 Code Review & Quality

### Before Committing

1. ✅ Run TypeScript checks: `npm run build`
2. ✅ Check for console errors
3. ✅ Test the feature manually
4. ✅ Follow Stormy Morning design system
5. ✅ Update documentation if needed

### Commit Messages

Follow conventional commits:

```
feat: Add new feature
fix: Fix bug
refactor: Refactor code
docs: Update documentation
style: Update styling
```

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

---

**Happy Coding! 🚀**
