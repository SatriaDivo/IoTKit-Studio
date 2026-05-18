import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface Task {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
}

export class AIAgentController {
  // Get all chat sessions for user
  async getSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { limit = 50, offset = 0 } = req.query;

      const sessions = await prisma.chatSession.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, createdAt: true, role: true },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
      });

      const sessionsDTO = sessions.map((s) => ({
        id: s.id,
        title: s.title,
        lastMessage: s.messages[0]?.content.substring(0, 100),
        lastMessageAt: s.messages[0]?.createdAt,
        lastMessageRole: s.messages[0]?.role,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s._count.messages,
      }));

      res.json({ sessions: sessionsDTO });
    } catch (error: any) {
      console.error("Get Sessions Error:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }

  // Get or create current session
  async getCurrentSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      // Get or create a default session
      let session = await prisma.chatSession.findFirst({
        where: { userId, title: "Current Chat" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 100, // Last 100 messages
          },
        },
      });

      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            userId,
            title: "Current Chat",
          },
          include: {
            messages: true,
          },
        });
      }

      res.json({ session });
    } catch (error: any) {
      console.error("Get Current Session Error:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  }

  // Create new session
  async createSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { title } = req.body;

      const session = await prisma.chatSession.create({
        data: {
          userId,
          title: title || `Chat ${new Date().toLocaleString()}`,
        },
      });

      res.status(201).json({ session });
    } catch (error: any) {
      console.error("Create Session Error:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  }

  // Delete session
  async deleteSession(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const session = await prisma.chatSession.deleteMany({
        where: { id, userId },
      });

      if (session.count === 0) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete Session Error:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  }

  async chat(req: AuthRequest, res: Response) {
    try {
      const { message, conversationHistory, sessionId } = req.body;
      const userId = req.user!.userId;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check daily limit (max 5 prompts per day per user)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyMessageCount = await prisma.chatMessage.count({
        where: {
          role: "user",
          createdAt: {
            gte: today,
          },
          session: {
            userId: userId,
          },
        },
      });

      if (dailyMessageCount >= 5) {
        return res.status(429).json({
          error: "Daily limit reached",
          message: "You have reached your daily limit of 5 AI Agent prompts. Please try again tomorrow.",
        });
      }

      const apiKey = process.env.OPENROUTER_API_KEY;
      const model =
        process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

      if (!apiKey) {
        return res.status(500).json({
          error: "OpenRouter API key not configured",
          message: "Please add OPENROUTER_API_KEY to your .env file",
        });
      }

      // Get or create session
      let session;
      if (sessionId) {
        session = await prisma.chatSession.findFirst({
          where: { id: sessionId, userId },
        });
      }

      if (!session) {
        // Create default session
        session = await prisma.chatSession.create({
          data: {
            userId,
            title: "Current Chat",
          },
        });
      }

      // Save user message to database FIRST
      const userMessage = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "user",
          content: message,
        },
      });

      // Build messages array with enhanced system prompt
      const messages = [
        {
          role: "system",
          content: `You are an autonomous IoT AI Assistant for IoTKit-Studio platform. You can EXECUTE actions, not just suggest them.

AVAILABLE ACTIONS:
1. CREATE_PROJECT - Create a new IoT project
2. CREATE_PAYLOAD - Create payload structure
3. START_SIMULATION - Start simulation
4. ANALYZE_DATA - Analyze simulation data

When user asks you to create/build something, respond with a JSON action plan:
{
  "type": "action_plan",
  "tasks": [
    {
      "action": "CREATE_PROJECT",
      "params": {
        "name": "Temperature Monitoring",
        "description": "Monitor temperature sensors",
        "protocol": "MQTT",
        "endpoint": "mqtt://103.217.145.187:1883",
        "topic": "sensors/temperature"
      }
    },
    {
      "action": "CREATE_PAYLOAD",
      "params": {
        "name": "Temperature Payload",
        "projectName": "Temperature Monitoring",
        "structure": [
          {
            "name": "deviceId",
            "type": "string",
            "mode": "static",
            "value": "temp_sensor_01"
          },
          {
            "name": "temperature",
            "type": "number",
            "mode": "random",
            "min": 20,
            "max": 30
          },
          {
            "name": "timestamp",
            "type": "string",
            "mode": "timestamp"
          }
        ]
      }
    }
  ],
  "summary": "I'll create a temperature monitoring project with MQTT protocol and configure the payload structure."
}

For regular questions, respond normally without JSON.

IMPORTANT:
- Always use valid JSON format for action plans
- Include all required parameters
- Be specific with values (don't use placeholders)
- Protocols: MQTT, MQTTS, HTTP, HTTPS, WS, WSS
- Endpoint format: protocol://host:port (e.g., mqtt://103.217.145.187:1883, http://api.example.com:8080)
- For CREATE_PAYLOAD, use "projectName" to reference the project created in previous task
- Payload types: string, number, boolean, object, array
- Payload modes: static, random, incremental, timestamp
- Support both Indonesian and English prompts`,
        },
        ...(conversationHistory || []),
        {
          role: "user",
          content: message,
        },
      ];

      // Call OpenRouter API
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.CORS_ORIGIN || "http://localhost:3000",
            "X-Title": "IoTKit-Studio",
            "Content-Type": "application/json",
          },
        },
      );

      const aiMessage = response.data.choices[0]?.message?.content;

      if (!aiMessage) {
        return res.status(500).json({ error: "No response from AI" });
      }

      // Check if response contains action plan
      let actionPlan = null;
      try {
        // Try to extract JSON from response
        const jsonMatch = aiMessage.match(
          /\{[\s\S]*"type":\s*"action_plan"[\s\S]*\}/,
        );
        if (jsonMatch) {
          actionPlan = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Not an action plan, just regular response
      }

      // Save AI response to database
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: aiMessage,
          metadata: actionPlan ? { actionPlan } : undefined,
        },
      });

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      });

      res.json({
        message: aiMessage,
        actionPlan,
        sessionId: session.id,
        messageId: assistantMessage.id,
        model: response.data.model,
        usage: response.data.usage,
      });
    } catch (error: any) {
      console.error("AI Agent Error:", error.response?.data || error.message);

      if (error.response?.status === 401) {
        return res.status(401).json({
          error: "Invalid OpenRouter API key",
          message: "Please check your OPENROUTER_API_KEY in .env file",
        });
      }

      if (error.response?.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again later.",
        });
      }

      res.status(500).json({
        error: "Failed to get AI response",
        message: error.response?.data?.error?.message || error.message,
      });
    }
  }

  async executeAction(req: AuthRequest, res: Response) {
    try {
      const { action, params } = req.body;
      const userId = req.user!.userId;

      let result: any = null;

      switch (action) {
        case "CREATE_PROJECT":
          result = await this.createProject(userId, params);
          break;

        case "CREATE_PAYLOAD":
          result = await this.createPayload(userId, params);
          break;

        case "START_SIMULATION":
          result = await this.startSimulation(userId, params);
          break;

        case "ANALYZE_DATA":
          result = await this.analyzeData(userId, params);
          break;

        default:
          return res.status(400).json({ error: "Unknown action" });
      }

      res.json({
        success: true,
        action,
        result,
      });
    } catch (error: any) {
      console.error("Execute Action Error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  private async createProject(userId: string, params: any) {
    // Parse endpoint to extract host and port
    let host = "";
    let port: number | null = null;
    let endpoint = params.endpoint || "";

    try {
      // Handle full URLs (mqtt://host:port, http://host:port, etc.)
      if (params.endpoint && params.endpoint.includes("://")) {
        const url = new URL(params.endpoint);
        host = url.hostname;
        port = url.port ? parseInt(url.port) : null;
        endpoint = url.pathname || "/";
      } else {
        // Handle host:port format
        const parts = (params.endpoint || "").split(":");
        host = parts[0] || "localhost";
        port = parts[1] ? parseInt(parts[1]) : null;
      }
    } catch (error) {
      // Fallback if URL parsing fails
      host = params.endpoint || "localhost";
    }

    // Set default ports based on protocol if not specified
    if (!port) {
      const defaultPorts: Record<string, number> = {
        HTTP: 80,
        HTTPS: 443,
        MQTT: 1883,
        MQTTS: 8883,
        WS: 80,
        WSS: 443,
      };
      port = defaultPorts[params.protocol.toUpperCase()] || 80;
    }

    const project = await prisma.project.create({
      data: {
        name: params.name,
        description: params.description || "",
        protocol: params.protocol.toUpperCase(),
        host,
        port,
        endpoint: endpoint || "/",
        topic: params.topic || null,
        username: params.username || null,
        password: params.password || null,
        sslEnabled: params.protocol.toUpperCase().endsWith("S"), // HTTPS, MQTTS, WSS
        status: "inactive",
        userId,
      },
    });

    return {
      projectId: project.id,
      name: project.name,
      protocol: project.protocol,
      host: project.host,
      port: project.port,
    };
  }

  private async createPayload(userId: string, params: any) {
    // Find project by name or use projectId
    let projectId = params.projectId;

    if (!projectId && params.projectName) {
      const project = await prisma.project.findFirst({
        where: {
          userId,
          name: params.projectName,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!project) {
        throw new Error(`Project "${params.projectName}" not found`);
      }

      projectId = project.id;
    }

    if (!projectId) {
      throw new Error("Project ID or name is required");
    }

    const payload = await prisma.payload.create({
      data: {
        name: params.name,
        structure: JSON.stringify(params.structure),
        template: params.template || false,
        projectId,
      },
    });

    return {
      payloadId: payload.id,
      name: payload.name,
      projectId,
    };
  }

  private async startSimulation(userId: string, params: any) {
    // This would integrate with your simulation service
    // For now, return a placeholder
    return {
      message: "Simulation start would be triggered here",
      projectId: params.projectId,
    };
  }

  private async analyzeData(userId: string, params: any) {
    // This would analyze logs/data
    // For now, return a placeholder
    return {
      message: "Data analysis would be performed here",
      projectId: params.projectId,
    };
  }

  async getModels(req: AuthRequest, res: Response) {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error: "OpenRouter API key not configured",
        });
      }

      const response = await axios.get("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Get Models Error:", error.message);
      res.status(500).json({
        error: "Failed to fetch models",
        message: error.message,
      });
    }
  }

  async getUsage(req: AuthRequest, res: Response) {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error: "OpenRouter API key not configured",
        });
      }

      const userId = req.user!.userId;
      const limit = 5;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyMessageCount = await prisma.chatMessage.count({
        where: {
          role: "user",
          createdAt: {
            gte: today,
          },
          session: {
            userId: userId,
          },
        },
      });

      res.json({
        limit,
        used: dailyMessageCount,
        remaining: Math.max(0, limit - dailyMessageCount),
        currentModel:
          process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
      });
    } catch (error: any) {
      console.error("Get Usage Error:", error.message);
      res.status(500).json({
        error: "Failed to fetch usage",
        message: error.message,
      });
    }
  }
}
