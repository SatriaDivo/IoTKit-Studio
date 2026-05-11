# IoTKit-Studio Frontend

Modern web dashboard untuk IoT simulation platform.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Animations
- **Zustand** - State management
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time communication
- **Recharts** - Data visualization
- **Radix UI** - Headless UI components

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Dashboard pages
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── payload-builder/
│   │   ├── simulation/
│   │   ├── logs/
│   │   └── settings/
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
│
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── layout/           # Layout components
│       ├── Sidebar.tsx
│       └── Header.tsx
│
├── lib/                  # Utilities
│   ├── api.ts           # Axios instance
│   └── utils.ts         # Helper functions
│
├── store/               # Zustand stores
│   ├── authStore.ts    # Authentication state
│   └── projectStore.ts # Project state
│
├── types/              # TypeScript types
│   └── index.ts
│
└── services/           # API services
    └── (future)
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
cp .env.local.example .env.local

# Start development server
npm run dev
```

Application will run at `http://localhost:3000`

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Available Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## Features

### Authentication

- JWT-based authentication
- Login/Register pages
- Protected routes
- Auto token refresh

### Dashboard

- Real-time statistics
- Project overview
- Activity feed
- Protocol statistics

### Projects

- Create/Edit/Delete projects
- Multi-protocol support (HTTP, MQTT, WebSocket)
- Connection testing
- Project status monitoring

### Payload Builder

- Visual JSON builder
- Multiple data types
- Generation modes
- Live preview
- Save templates

### Simulation

- Real-time data sending
- Configurable intervals
- Batch sending
- Statistics tracking
- Error monitoring

### Logs & Monitoring

- Real-time log streaming
- Filter by type/project
- Search functionality
- Export logs

## UI Components

Built with Radix UI and Tailwind CSS:

- **Button** - Multiple variants and sizes
- **Input** - Form inputs with validation
- **Card** - Content containers
- **Label** - Form labels
- **Dialog** - Modal dialogs
- **Select** - Dropdown selects
- **Switch** - Toggle switches
- **Tabs** - Tab navigation

## State Management

Using Zustand for global state:

### Auth Store

```typescript
const { user, login, logout, isAuthenticated } = useAuthStore();
```

### Project Store

```typescript
const { projects, fetchProjects, createProject } = useProjectStore();
```

## Styling

### Tailwind CSS

Custom theme configuration in `tailwind.config.ts`:

- Dark mode by default
- Custom color palette (cyan/blue)
- Glassmorphism effects
- Smooth animations

### CSS Variables

Defined in `globals.css`:

```css
--background
--foreground
--primary
--secondary
--accent
--muted
--destructive
```

## Real-time Features

Using Socket.IO for real-time updates:

```typescript
import { io } from "socket.io-client";

const socket = io(API_URL);

// Subscribe to project updates
socket.emit("subscribe", projectId);

// Listen for events
socket.on("payloadSent", (data) => {
  // Handle payload sent
});
```

## Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Responsive sidebar
- Adaptive layouts

## Performance

- Next.js App Router for optimal performance
- Code splitting
- Image optimization
- Font optimization (Inter)
- Lazy loading

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

### Hot Reload

Changes are automatically reflected in the browser.

### TypeScript

Use proper types for better DX:

```typescript
import { Project } from '@/types'

const project: Project = { ... }
```

### Component Structure

```typescript
'use client' // If using hooks

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function MyComponent() {
  const [state, setState] = useState()

  return (
    <div>
      <Button>Click me</Button>
    </div>
  )
}
```

## Troubleshooting

### Port Already in Use

```bash
PORT=3001 npm run dev
```

### Module Not Found

```bash
rm -rf node_modules .next
npm install
```

### Build Errors

```bash
npm run build
# Check for TypeScript errors
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT
