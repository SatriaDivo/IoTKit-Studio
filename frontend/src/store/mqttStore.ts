import { create } from "zustand";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

export interface MQTTMessage {
  id: string;
  topic: string;
  payload: string;
  qos: number;
  retained: boolean;
  timestamp: string;
}

interface MQTTState {
  isConnected: boolean;
  isConnecting: boolean;
  isGo: boolean;
  messages: MQTTMessage[];
  isPaused: boolean;
  
  clearMessages: () => void;
  setIsPaused: (isPaused: boolean) => void;
  
  connectMqtt: (config: {
    brokerUrl: string;
    clientId: string;
    username?: string;
    password?: string;
    subscribedTopics: string[];
  }) => Promise<void>;
  
  disconnectMqtt: () => void;
  subscribeTopic: (topic: string) => void;
  publishMessage: (topic: string, payload: string) => Promise<boolean>;
}

// Module-level persistent references (persistent across page transitions)
let wsClient: WebSocket | null = null;
let ioClient: any = null;

export const useMQTTStore = create<MQTTState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  isGo: false,
  messages: [],
  isPaused: false,

  clearMessages: () => {
    set({ messages: [] });
  },

  setIsPaused: (isPaused: boolean) => {
    set({ isPaused });
  },

  connectMqtt: async (config) => {
    const { brokerUrl, clientId, username, password, subscribedTopics } = config;
    if (subscribedTopics.length === 0) {
      toast.error("Please add at least one topic to subscribe to.");
      return;
    }

    set({ isConnecting: true });
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    try {
      const healthRes = await fetch(`${API_URL}/health`)
        .then((res) => res.json())
        .catch(() => ({}));
      
      const isGoEngine = healthRes.status === "ok";
      set({ isGo: isGoEngine });

      // Clean up previous client connections if any
      if (wsClient) {
        wsClient.close();
        wsClient = null;
      }
      if (ioClient) {
        ioClient.disconnect();
        ioClient = null;
      }

      if (isGoEngine) {
        const wsUrl = API_URL.replace(/^http/, "ws") + "/ws";
        const ws = new WebSocket(wsUrl);
        wsClient = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              action: "mqtt_connect",
              broker: brokerUrl,
              clientId: clientId,
              username: username || "",
              password: password || "",
              topics: subscribedTopics,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === "mqtt_connected") {
              set({ isConnected: true, isConnecting: false });
              toast.success("Connected to MQTT Broker");
            } else if (msg.event === "mqtt_error") {
              set({ isConnecting: false, isConnected: false });
              toast.error(`MQTT Error: ${msg.data.message}`);
              get().disconnectMqtt();
            } else if (msg.event === "mqtt_message") {
              if (get().isPaused) return;
              const newMsg: MQTTMessage = {
                id: Math.random().toString(36).substring(7),
                topic: msg.data.topic,
                payload: msg.data.payload,
                qos: msg.data.qos,
                retained: msg.data.retained,
                timestamp: msg.data.timestamp,
              };
              set((state) => ({
                messages: [newMsg, ...state.messages].slice(0, 200),
              }));
            } else if (msg.event === "mqtt_disconnected") {
              set({ isConnected: false, isConnecting: false });
              toast.error("MQTT Inspector Disconnected");
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          set({ isConnected: false, isConnecting: false });
        };
      } else {
        const socket = io(API_URL);
        ioClient = socket;

        socket.on("connect", () => {
          socket.emit("mqtt-inspector:connect", {
            broker: brokerUrl,
            clientId: clientId,
            username: username || "",
            password: password || "",
            topics: subscribedTopics,
          });
        });

        socket.on("mqtt-inspector:connected", () => {
          set({ isConnected: true, isConnecting: false });
          toast.success("Connected to MQTT Broker");
        });

        socket.on("mqtt-inspector:error", (data: any) => {
          set({ isConnecting: false, isConnected: false });
          toast.error(`MQTT Error: ${data.message}`);
          get().disconnectMqtt();
        });

        socket.on("mqtt-inspector:message", (data: any) => {
          if (get().isPaused) return;
          const newMsg: MQTTMessage = {
            id: Math.random().toString(36).substring(7),
            topic: data.topic,
            payload: data.payload,
            qos: data.qos,
            retained: data.retained,
            timestamp: data.timestamp,
          };
          set((state) => ({
            messages: [newMsg, ...state.messages].slice(0, 200),
          }));
        });

        socket.on("mqtt-inspector:disconnected", () => {
          set({ isConnected: false, isConnecting: false });
        });

        socket.on("disconnect", () => {
          set({ isConnected: false, isConnecting: false });
        });
      }
    } catch (err: any) {
      set({ isConnecting: false, isConnected: false });
      toast.error(`Failed to establish websocket proxy connection: ${err.message}`);
    }
  },

  disconnectMqtt: () => {
    const { isGo } = get();
    if (isGo && wsClient) {
      if (wsClient.readyState === WebSocket.OPEN) {
        wsClient.send(JSON.stringify({ action: "mqtt_disconnect" }));
      }
      wsClient.close();
      wsClient = null;
    } else if (!isGo && ioClient) {
      ioClient.emit("mqtt-inspector:disconnect");
      ioClient.disconnect();
      ioClient = null;
    }
    set({ isConnected: false, isConnecting: false });
  },

  subscribeTopic: (topic: string) => {
    const { isGo, isConnected } = get();
    if (!isConnected) return;

    if (isGo && wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(
        JSON.stringify({
          action: "mqtt_subscribe",
          topics: [topic],
        })
      );
    } else if (!isGo && ioClient) {
      ioClient.emit("mqtt-inspector:subscribe", [topic]);
    }
  },

  publishMessage: async (topic, payload) => {
    const { isGo, isConnected } = get();
    if (!isConnected) {
      toast.error("Not connected to MQTT broker");
      return false;
    }

    if (isGo && wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(
        JSON.stringify({
          action: "mqtt_publish",
          topic: topic,
          message: payload,
        })
      );
      return true;
    } else if (!isGo && ioClient) {
      ioClient.emit("mqtt-inspector:publish", {
        topic: topic,
        message: payload,
      });
      return true;
    }
    return false;
  },
}));
