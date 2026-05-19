"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Play,
  Square,
  Plus,
  X,
  Send,
  Trash2,
  Pause,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Search,
  Settings,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import toast from "react-hot-toast";
import { useMQTTStore, MQTTMessage } from "@/store/mqttStore";

export default function MQTTInspectorPage() {
  const { projects, fetchProjects } = useProjectStore();
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Broker Configuration State
  const [brokerUrl, setBrokerUrl] = useState("tcp://broker.hivemq.com:1883");
  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([
    "iotkit/test/#",
  ]);

  // Publisher State
  const [publishTopic, setPublishTopic] = useState("iotkit/test/data");
  const [publishPayload, setPublishPayload] = useState(
    JSON.stringify(
      { status: "active", temperature: 24.5, humidity: 60 },
      null,
      2,
    ),
  );
  const [publishInterval, setPublishInterval] = useState(5);
  const [publishCount, setPublishCount] = useState<number | "">("");
  const [isAutoPublishing, setIsAutoPublishing] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const autoPublishIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Global MQTT Store Connection & Stream State
  const {
    isConnected,
    isConnecting,
    messages,
    isPaused,
    setIsPaused,
    clearMessages,
    connectMqtt,
    disconnectMqtt,
    subscribeTopic,
    publishMessage,
  } = useMQTTStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MQTTMessage | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  useEffect(() => {
    fetchProjects().finally(() => setProjectsLoading(false));

    try {
      if (typeof window !== "undefined") {
        const savedBrokerUrl = localStorage.getItem("mqtt_inspector_brokerUrl");
        if (savedBrokerUrl) setBrokerUrl(savedBrokerUrl);

        const savedClientId = localStorage.getItem("mqtt_inspector_clientId");
        if (savedClientId) {
          setClientId(savedClientId);
        } else {
          setClientId(
            `iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`,
          );
        }

        const savedUsername = localStorage.getItem("mqtt_inspector_username");
        if (savedUsername) setUsername(savedUsername);

        const savedPassword = localStorage.getItem("mqtt_inspector_password");
        if (savedPassword) setPassword(savedPassword);

        const savedTopics = localStorage.getItem(
          "mqtt_inspector_subscribedTopics",
        );
        if (savedTopics) {
          setSubscribedTopics(JSON.parse(savedTopics));
        }

        const savedPublishTopic = localStorage.getItem(
          "mqtt_inspector_publishTopic",
        );
        if (savedPublishTopic) setPublishTopic(savedPublishTopic);

        const savedPublishPayload = localStorage.getItem(
          "mqtt_inspector_publishPayload",
        );
        if (savedPublishPayload) setPublishPayload(savedPublishPayload);

        const savedPublishInterval = localStorage.getItem(
          "mqtt_inspector_publishInterval",
        );
        if (savedPublishInterval)
          setPublishInterval(Number(savedPublishInterval));

        const savedPublishCount = localStorage.getItem(
          "mqtt_inspector_publishCount",
        );
        if (savedPublishCount && savedPublishCount !== "") {
          setPublishCount(Number(savedPublishCount));
        }

        const wasConnected = localStorage.getItem(
          "mqtt_inspector_wasConnected",
        );
        if (wasConnected === "true" && savedBrokerUrl && savedClientId) {
          const topics = savedTopics ? JSON.parse(savedTopics) : [];
          setTimeout(() => {
            connectMqtt({
              brokerUrl: savedBrokerUrl,
              clientId: savedClientId,
              username: savedUsername || "",
              password: savedPassword || "",
              subscribedTopics: topics,
            });
          }, 500);
        }
      } else {
        setClientId(
          `iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`,
        );
      }
    } catch (e) {
      setClientId(
        `iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`,
      );
    } finally {
      setIsLoaded(true);
    }

    return () => {
      if (autoPublishIntervalRef.current) {
        clearInterval(autoPublishIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("mqtt_inspector_brokerUrl", brokerUrl);
        localStorage.setItem("mqtt_inspector_clientId", clientId);
        localStorage.setItem("mqtt_inspector_username", username);
        localStorage.setItem("mqtt_inspector_password", password);
        localStorage.setItem(
          "mqtt_inspector_subscribedTopics",
          JSON.stringify(subscribedTopics),
        );
        localStorage.setItem("mqtt_inspector_publishTopic", publishTopic);
        localStorage.setItem("mqtt_inspector_publishPayload", publishPayload);
        localStorage.setItem(
          "mqtt_inspector_publishInterval",
          publishInterval.toString(),
        );
        localStorage.setItem(
          "mqtt_inspector_publishCount",
          publishCount.toString(),
        );
      }
    } catch (e) {}
  }, [
    isLoaded,
    brokerUrl,
    clientId,
    username,
    password,
    subscribedTopics,
    publishTopic,
    publishPayload,
    publishInterval,
    publishCount,
  ]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "mqtt_inspector_wasConnected",
          isConnected ? "true" : "false",
        );
      }
    } catch (e) {}
  }, [isLoaded, isConnected]);

  const handleProjectSelect = (projectId: string) => {
    if (!projectId) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    let protocol = "tcp";
    const protoStr = project.protocol as string;
    if (protoStr === "MQTTS" || protoStr === "mqtts") {
      protocol = "ssl";
    }

    const port = project.port ? project.port : protocol === "ssl" ? 8883 : 1883;
    setBrokerUrl(`${protocol}://${project.host}:${port}`);
    setUsername(project.username || "");
    setPassword(project.password || "");
    if (project.topic) {
      setSubscribedTopics((prev) => {
        if (prev.includes(project.topic!)) return prev;
        return [...prev, project.topic!];
      });
      setPublishTopic(project.topic);
    }
    toast.success(`Loaded configuration from project: ${project.name}`);
  };

  const handleAddTopic = () => {
    if (!topicInput.trim()) return;
    if (subscribedTopics.includes(topicInput.trim())) {
      toast.error("Topic already added");
      return;
    }
    const newTopics = [...subscribedTopics, topicInput.trim()];
    setSubscribedTopics(newTopics);
    setTopicInput("");

    if (isConnected) {
      subscribeTopic(topicInput.trim());
      toast.success(`Subscribed to: ${topicInput.trim()}`);
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    setSubscribedTopics(subscribedTopics.filter((t) => t !== topicToRemove));
  };

  const handlePublish = async () => {
    if (!publishTopic.trim()) {
      toast.error("Please enter a topic to publish to");
      return;
    }

    try {
      JSON.parse(publishPayload);
    } catch {
      // allow plain text
    }

    const success = await publishMessage(publishTopic.trim(), publishPayload);
    if (success) {
      toast.success("Published message!");
    }
  };

  const handleStartAutoPublish = () => {
    if (!publishTopic.trim()) {
      toast.error("Please enter a topic to publish to");
      return;
    }

    setIsAutoPublishing(true);
    setPublishedCount(0);

    let count = 0;
    const maxCount = typeof publishCount === "number" ? publishCount : 0;

    publishMessage(publishTopic.trim(), publishPayload);
    count++;
    setPublishedCount(count);

    if (maxCount > 0 && count >= maxCount) {
      setIsAutoPublishing(false);
      toast.success(`Auto-publish completed! Sent ${count} message(s)`);
      return;
    }

    autoPublishIntervalRef.current = setInterval(async () => {
      const success = await publishMessage(publishTopic.trim(), publishPayload);

      if (success) {
        count++;
        setPublishedCount(count);

        if (maxCount > 0 && count >= maxCount) {
          handleStopAutoPublish();
          toast.success(`Auto-publish completed! Sent ${count} message(s)`);
        }
      }
    }, publishInterval * 1000);

    toast.success(`Auto-publish started! Interval: ${publishInterval}s`);
  };

  const handleStopAutoPublish = () => {
    if (autoPublishIntervalRef.current) {
      clearInterval(autoPublishIntervalRef.current);
      autoPublishIntervalRef.current = null;
    }
    setIsAutoPublishing(false);
    toast.success(`Auto-publish stopped. Sent ${publishedCount} message(s)`);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(publishPayload);
      setPublishPayload(JSON.stringify(parsed, null, 2));
      toast.success("Formatted JSON successfully!");
    } catch {
      toast.error("Invalid JSON format in payload");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.payload.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] bg-[#F5F7FA] rounded-xl border border-[#E8EDF2] overflow-hidden shadow-sm">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-[#E8EDF2] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-[#6A89A7]" />
          <h1 className="text-lg font-semibold text-[#2C3E50]">
            MQTT Inspector
          </h1>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-[#5A6C7D]">Connection:</span>
            <span className="text-sm font-mono text-[#2C3E50]">{clientId}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">
                Connected
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#E8EDF2] border border-[#D1DBE5] rounded-lg">
              <div className="h-2 w-2 rounded-full bg-[#8B9AA8]"></div>
              <span className="text-sm font-medium text-[#5A6C7D]">
                Disconnected
              </span>
            </div>
          )}
          <Button
            onClick={() => setShowConnectionModal(!showConnectionModal)}
            className="h-9 px-4 bg-[#6A89A7] hover:bg-[#5a7997] text-white text-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Connections */}
        <div className="w-64 bg-white border-r border-[#E8EDF2] flex flex-col">
          <div className="p-4 border-b border-[#E8EDF2]">
            <h2 className="text-sm font-semibold text-[#2C3E50] mb-3">
              Connections
            </h2>
            <select
              onChange={(e) => handleProjectSelect(e.target.value)}
              disabled={isConnected || isConnecting || projectsLoading}
              className="w-full h-9 px-3 border border-[#D1DBE5] rounded-lg text-xs bg-white text-[#2C3E50] focus:ring-1 focus:ring-[#6A89A7] focus:outline-none"
            >
              <option value="">-- Select project --</option>
              {projects
                .filter((p) => {
                  const proto = (p.protocol || "").toUpperCase();
                  return proto === "MQTT" || proto === "MQTTS";
                })
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {projects
                .filter((p) => {
                  const proto = (p.protocol || "").toUpperCase();
                  return proto === "MQTT" || proto === "MQTTS";
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border border-[#E8EDF2] hover:bg-[#F5F7FA] cursor-pointer transition-colors"
                    onClick={() => handleProjectSelect(p.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#2C3E50]">
                        {p.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-[#E8EDF2] text-[#5A6C7D] rounded">
                        {p.protocol}
                      </span>
                    </div>
                    <span className="text-xs text-[#8B9AA8] font-mono">
                      {p.host}:{p.port}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-4 border-t border-[#E8EDF2]">
            {isConnected ? (
              <Button
                onClick={disconnectMqtt}
                className="w-full h-9 bg-red-500 hover:bg-red-600 text-white text-sm"
              >
                <Square className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={() =>
                  connectMqtt({
                    brokerUrl,
                    clientId,
                    username,
                    password,
                    subscribedTopics,
                  })
                }
                disabled={isConnecting}
                className="w-full h-9 bg-[#6A89A7] hover:bg-[#5a7997] text-white text-sm"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Middle Section - Topics & Publisher */}
        <div className="w-80 bg-white border-r border-[#E8EDF2] flex flex-col">
          {/* Subscriptions */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-[#E8EDF2]">
              <h2 className="text-sm font-semibold text-[#2C3E50] mb-3">
                Subscriptions
              </h2>
              <div className="flex gap-2">
                <Input
                  placeholder="topic/#"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                  className="flex-1 h-9 text-xs"
                  disabled={!isConnected}
                />
                <Button
                  onClick={handleAddTopic}
                  disabled={!isConnected}
                  className="h-9 px-3 bg-[#6A89A7] hover:bg-[#5a7997] text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {subscribedTopics.map((topic) => (
                  <div
                    key={topic}
                    className="flex items-center justify-between p-2 rounded-lg border border-[#E8EDF2] hover:bg-[#F5F7FA] group"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <MessageSquare className="h-4 w-4 text-[#6A89A7]" />
                      <span className="text-sm text-[#2C3E50] font-mono">
                        {topic}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      className="opacity-0 group-hover:opacity-100 text-[#8B9AA8] hover:text-red-500 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Publisher */}
          <div className="border-t border-[#E8EDF2] p-4">
            <h2 className="text-sm font-semibold text-[#2C3E50] mb-3">
              Publish
            </h2>
            <div className="space-y-3">
              <Input
                placeholder="Topic"
                value={publishTopic}
                onChange={(e) => setPublishTopic(e.target.value)}
                disabled={!isConnected}
                className="h-9 text-xs font-mono"
              />
              <textarea
                value={publishPayload}
                onChange={(e) => setPublishPayload(e.target.value)}
                disabled={!isConnected}
                className="w-full h-24 p-2 text-xs font-mono border border-[#D1DBE5] rounded-lg focus:ring-1 focus:ring-[#6A89A7] focus:outline-none"
                placeholder="Payload..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={handlePublish}
                  disabled={!isConnected}
                  className="flex-1 h-9 bg-[#6A89A7] hover:bg-[#5a7997] text-white text-sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
                <Button
                  onClick={handleFormatJson}
                  disabled={!isConnected}
                  variant="outline"
                  className="h-9 px-3 text-sm"
                >
                  Format
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Messages */}
        <div className="flex-1 flex flex-col bg-[#F5F7FA]">
          <div className="h-12 bg-white border-b border-[#E8EDF2] flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-[#2C3E50]">Messages</h2>
              <span className="text-xs text-[#8B9AA8]">
                {filteredMessages.length} message(s)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8B9AA8]" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 w-48 text-xs"
                />
              </div>
              <Button
                onClick={clearMessages}
                variant="outline"
                className="h-9 px-3 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Radio className="h-12 w-12 text-[#8B9AA8] opacity-25 mb-3" />
                <p className="text-sm font-medium text-[#5A6C7D]">
                  No messages yet
                </p>
                <p className="text-xs text-[#8B9AA8] mt-1">
                  Connect to broker and subscribe to topics
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedMessage?.id === msg.id
                        ? "bg-white border-[#6A89A7] shadow-md"
                        : "bg-white border-[#E8EDF2] hover:border-[#D1DBE5] hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#2C3E50] font-mono">
                          {msg.topic}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-[#E8EDF2] text-[#5A6C7D] rounded">
                          QoS {msg.qos}
                        </span>
                      </div>
                      <span className="text-xs text-[#8B9AA8]">
                        {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <pre className="text-xs font-mono text-[#2C3E50] bg-[#F5F7FA] p-3 rounded overflow-x-auto">
                      {(() => {
                        try {
                          const parsed = JSON.parse(msg.payload);
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return msg.payload;
                        }
                      })()}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Settings Modal */}
      <AnimatePresence>
        {showConnectionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#2C3E50]">
                  Connection Settings
                </h3>
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="text-[#8B9AA8] hover:text-[#5A6C7D]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-[#5A6C7D]">
                    Broker URL
                  </Label>
                  <Input
                    value={brokerUrl}
                    onChange={(e) => setBrokerUrl(e.target.value)}
                    disabled={isConnected}
                    className="mt-1.5 h-9 text-xs"
                    placeholder="tcp://broker.hivemq.com:1883"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#5A6C7D]">
                    Client ID
                  </Label>
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    disabled={isConnected}
                    className="mt-1.5 h-9 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-[#5A6C7D]">
                      Username
                    </Label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isConnected}
                      className="mt-1.5 h-9 text-xs"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-[#5A6C7D]">
                      Password
                    </Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isConnected}
                      className="mt-1.5 h-9 text-xs"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => setShowConnectionModal(false)}
                    variant="outline"
                    className="flex-1 h-9 text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowConnectionModal(false);
                      toast.success("Settings saved!");
                    }}
                    className="flex-1 h-9 bg-[#6A89A7] hover:bg-[#5a7997] text-white text-sm"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
