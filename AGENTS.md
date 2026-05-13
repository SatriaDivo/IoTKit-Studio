# IoTKit Studio - AI Agents Configuration

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
