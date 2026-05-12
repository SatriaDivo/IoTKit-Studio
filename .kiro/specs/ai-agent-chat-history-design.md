# AI Agent Chat History - Technical Design

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chat Sidebar │  │ Chat Window  │  │ Message Input│      │
│  │  - Sessions  │  │  - Messages  │  │  - Send Msg  │      │
│  │  - New Chat  │  │  - Scroll    │  │  - Tasks     │      │
│  │  - Search    │  │  - Format    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express + TypeScript)           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │           AI Agent Controller                        │   │
│  │  - Session CRUD                                      │   │
│  │  - Message handling                                  │   │
│  │  - OpenRouter integration                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Chat Service Layer                         │   │
│  │  - Business logic                                    │   │
│  │  - History management                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕ Prisma ORM
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    User      │  │ ChatSession  │  │ ChatMessage  │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Database Design

### Prisma Schema Updates

```prisma
// Add to schema.prisma

model ChatSession {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String   @default("New Conversation")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  ChatMessage[]

  @@index([userId, updatedAt])
  @@map("chat_sessions")
}

model ChatMessage {
  id        String      @id @default(uuid())
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      MessageRole
  content   String      @db.Text
  metadata  Json?       // For task execution data
  createdAt DateTime    @default(now())

  @@index([sessionId, createdAt])
  @@map("chat_messages")
}

enum MessageRole {
  user
  assistant
  system
}

// Update User model to include relation
model User {
  // ... existing fields
  chatSessions ChatSession[]
}
```

### Migration Strategy

1. Create migration: `npx prisma migrate dev --name add_chat_history`
2. Run migration on development database
3. Test with sample data
4. Deploy to production

## Backend API Design

### Route Structure

```typescript
// backend/src/routes/aiAgent.ts

router.get("/sessions", authMiddleware, listSessions);
router.post("/sessions", authMiddleware, createSession);
router.get("/sessions/:id", authMiddleware, getSession);
router.patch("/sessions/:id", authMiddleware, updateSession);
router.delete("/sessions/:id", authMiddleware, deleteSession);
router.post("/sessions/:id/messages", authMiddleware, sendMessage);
router.get("/sessions/:id/messages", authMiddleware, getMessages);
```

### Controller Methods

```typescript
// backend/src/controllers/aiAgentController.ts

interface ChatSessionDTO {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

interface ChatMessageDTO {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any;
  createdAt: Date;
}

// List all sessions for authenticated user
export const listSessions = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0 } = req.query;

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: Number(limit),
    skip: Number(offset),
  });

  const sessionsDTO: ChatSessionDTO[] = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    lastMessage: s.messages[0]?.content.substring(0, 100),
    lastMessageAt: s.messages[0]?.createdAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s._count.messages,
  }));

  res.json({ sessions: sessionsDTO });
};

// Create new session
export const createSession = async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { title } = req.body;

  const session = await prisma.chatSession.create({
    data: {
      userId,
      title: title || `Chat ${new Date().toLocaleString()}`,
    },
  });

  res.status(201).json({ session });
};

// Get session with messages
export const getSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { limit = 100, offset = 0 } = req.query;

  const session = await prisma.chatSession.findFirst({
    where: { id, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: Number(limit),
        skip: Number(offset),
      },
    },
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({ session });
};

// Update session (rename)
export const updateSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { title } = req.body;

  const session = await prisma.chatSession.updateMany({
    where: { id, userId },
    data: { title },
  });

  if (session.count === 0) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({ success: true });
};

// Delete session
export const deleteSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const session = await prisma.chatSession.deleteMany({
    where: { id, userId },
  });

  if (session.count === 0) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({ success: true });
};

// Send message (modified existing)
export const sendMessage = async (req: Request, res: Response) => {
  const { id: sessionId } = req.params;
  const userId = req.user.id;
  const { message } = req.body;

  // Verify session ownership
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "user",
      content: message,
    },
  });

  // Get conversation history
  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  // Call OpenRouter API with history
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: history.map((h) => ({ role: h.role, content: h.content })),
      }),
    },
  );

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  // Save AI response
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: aiResponse,
    },
  });

  // Update session timestamp
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  res.json({ response: aiResponse });
};

// Get messages for session
export const getMessages = async (req: Request, res: Response) => {
  const { id: sessionId } = req.params;
  const userId = req.user.id;
  const { limit = 100, offset = 0 } = req.query;

  // Verify session ownership
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: Number(limit),
    skip: Number(offset),
  });

  res.json({ messages });
};
```

## Frontend Design

### Component Structure

```
src/app/(dashboard)/ai-agent/
├── page.tsx                    # Main AI Agent page
├── components/
│   ├── ChatSidebar.tsx        # Session list sidebar
│   ├── ChatWindow.tsx         # Message display area
│   ├── MessageInput.tsx       # Input with send button
│   ├── MessageBubble.tsx      # Individual message component
│   ├── SessionItem.tsx        # Session list item
│   └── NewChatButton.tsx      # Create new session button
└── hooks/
    ├── useChatSessions.ts     # Manage sessions
    ├── useChatMessages.ts     # Manage messages
    └── useSendMessage.ts      # Send message logic
```

### Main Page Layout

```typescript
// frontend/src/app/(dashboard)/ai-agent/page.tsx

'use client';

import { useState } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';

export default function AIAgentPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#F8FBFF]">
      {/* Sidebar - 20% width */}
      <ChatSidebar
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
      />

      {/* Main Chat Area - 80% width */}
      <div className="flex-1 flex flex-col">
        <ChatWindow sessionId={activeSessionId} />
        <MessageInput sessionId={activeSessionId} />
      </div>
    </div>
  );
}
```

### Chat Sidebar Component

```typescript
// frontend/src/app/(dashboard)/ai-agent/components/ChatSidebar.tsx

interface ChatSidebarProps {
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
}

export default function ChatSidebar({ activeSessionId, onSessionSelect }: ChatSidebarProps) {
  const { sessions, loading, createSession, deleteSession, renameSession } = useChatSessions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={createSession}
          className="w-full bg-[#38BDF8] text-white py-2 px-4 rounded-lg hover:bg-[#0EA5E9] transition-colors"
        >
          + New Chat
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
        />
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No conversations yet</div>
        ) : (
          filteredSessions.map(session => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={() => onSessionSelect(session.id)}
              onDelete={() => deleteSession(session.id)}
              onRename={(title) => renameSession(session.id, title)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

### Chat Window Component

```typescript
// frontend/src/app/(dashboard)/ai-agent/components/ChatWindow.tsx

interface ChatWindowProps {
  sessionId: string | null;
}

export default function ChatWindow({ sessionId }: ChatWindowProps) {
  const { messages, loading } = useChatMessages(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Welcome to AI Agent</h2>
          <p>Select a conversation or start a new chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {loading ? (
        <div className="text-center text-gray-500">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
      ) : (
        messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

### Message Bubble Component

```typescript
// frontend/src/app/(dashboard)/ai-agent/components/MessageBubble.tsx

interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
    metadata?: any;
  };
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isUser ? 'bg-[#38BDF8] text-white' : 'bg-white border border-gray-200'} rounded-lg p-4 shadow-sm`}>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
```

### Custom Hooks

```typescript
// frontend/src/app/(dashboard)/ai-agent/hooks/useChatSessions.ts

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    const res = await fetch("/api/ai-agent/sessions", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    setSessions(data.sessions);
    setLoading(false);
  };

  const createSession = async () => {
    const res = await fetch("/api/ai-agent/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: `Chat ${new Date().toLocaleString()}` }),
    });
    const data = await res.json();
    setSessions([data.session, ...sessions]);
    return data.session.id;
  };

  const deleteSession = async (id: string) => {
    await fetch(`/api/ai-agent/sessions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setSessions(sessions.filter((s) => s.id !== id));
  };

  const renameSession = async (id: string, title: string) => {
    await fetch(`/api/ai-agent/sessions/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });
    setSessions(sessions.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    createSession,
    deleteSession,
    renameSession,
    refetch: fetchSessions,
  };
}
```

## Implementation Tasks

### Phase 1: Database & Backend (Priority: High)

1. Update Prisma schema with ChatSession and ChatMessage models
2. Create and run database migration
3. Implement backend controllers for session management
4. Implement backend controllers for message handling
5. Update existing AI Agent endpoints to use sessions
6. Add authentication middleware to all endpoints
7. Test API endpoints with Postman/Thunder Client

### Phase 2: Frontend Core (Priority: High)

1. Create ChatSidebar component
2. Create ChatWindow component
3. Create MessageBubble component
4. Create MessageInput component
5. Implement useChatSessions hook
6. Implement useChatMessages hook
7. Update main AI Agent page layout

### Phase 3: Features & Polish (Priority: Medium)

1. Add search functionality
2. Add session rename feature
3. Add session delete with confirmation
4. Add markdown rendering for messages
5. Add code syntax highlighting
6. Add copy button for code blocks
7. Add loading states and error handling
8. Add optimistic UI updates

### Phase 4: Testing & Optimization (Priority: Medium)

1. Test with multiple sessions
2. Test with long conversations
3. Optimize database queries
4. Add pagination for old messages
5. Add rate limiting
6. Performance testing
7. Cross-browser testing

## Technical Decisions

### Why PostgreSQL + Prisma?

- Already used in the project
- ACID compliance for data integrity
- Good performance for relational data
- Prisma provides type-safe queries

### Why REST API?

- Simple and well-understood
- Easy to test and debug
- Can upgrade to WebSocket later for real-time features

### Why Server-Side Rendering (SSR)?

- Next.js App Router with client components
- Better initial load performance
- SEO-friendly (if needed later)

### Why Markdown Rendering?

- AI responses often include formatted text
- Code blocks with syntax highlighting
- Better UX for technical conversations

## Performance Considerations

1. **Database Indexing**: Index on `userId`, `sessionId`, and `createdAt`
2. **Pagination**: Limit messages per request (100 default)
3. **Lazy Loading**: Load sessions on demand
4. **Caching**: Consider Redis for frequently accessed sessions
5. **Optimistic Updates**: Show messages immediately, save in background

## Security Considerations

1. **Authentication**: JWT token validation on all endpoints
2. **Authorization**: Users can only access their own sessions
3. **Input Sanitization**: Prevent XSS attacks
4. **Rate Limiting**: Prevent abuse (10 messages per minute)
5. **SQL Injection**: Prisma ORM prevents this by default

---

**Status**: Design Complete
**Next Step**: Implementation Phase 1
