"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Radio, Play, Square, Plus, X, Send, Trash2, 
  Pause, Wifi, WifiOff, Copy, Check, Search, Info 
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>(["iotkit/test/#"]);

  // Publisher State
  const [publishTopic, setPublishTopic] = useState("iotkit/test/data");
  const [publishPayload, setPublishPayload] = useState(
    JSON.stringify({ status: "active", temperature: 24.5, humidity: 60 }, null, 2)
  );

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
  const [selectedMessage, setSelectedMessage] = useState<MQTTMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetchProjects().finally(() => setProjectsLoading(false));
    
    // Load config from localStorage if present
    try {
      if (typeof window !== "undefined") {
        const savedBrokerUrl = localStorage.getItem("mqtt_inspector_brokerUrl");
        if (savedBrokerUrl) setBrokerUrl(savedBrokerUrl);

        const savedClientId = localStorage.getItem("mqtt_inspector_clientId");
        if (savedClientId) {
          setClientId(savedClientId);
        } else {
          setClientId(`iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`);
        }

        const savedUsername = localStorage.getItem("mqtt_inspector_username");
        if (savedUsername) setUsername(savedUsername);

        const savedPassword = localStorage.getItem("mqtt_inspector_password");
        if (savedPassword) setPassword(savedPassword);

        const savedTopics = localStorage.getItem("mqtt_inspector_subscribedTopics");
        if (savedTopics) {
          setSubscribedTopics(JSON.parse(savedTopics));
        }

        const savedPublishTopic = localStorage.getItem("mqtt_inspector_publishTopic");
        if (savedPublishTopic) setPublishTopic(savedPublishTopic);

        const savedPublishPayload = localStorage.getItem("mqtt_inspector_publishPayload");
        if (savedPublishPayload) setPublishPayload(savedPublishPayload);
      } else {
        setClientId(`iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`);
      }
    } catch (e) {
      setClientId(`iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`);
    } finally {
      setIsLoaded(true);
    }

    return () => {
      disconnectMqtt();
    };
  }, []);

  // Auto-persist inputs to localStorage on change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("mqtt_inspector_brokerUrl", brokerUrl);
        localStorage.setItem("mqtt_inspector_clientId", clientId);
        localStorage.setItem("mqtt_inspector_username", username);
        localStorage.setItem("mqtt_inspector_password", password);
        localStorage.setItem("mqtt_inspector_subscribedTopics", JSON.stringify(subscribedTopics));
        localStorage.setItem("mqtt_inspector_publishTopic", publishTopic);
        localStorage.setItem("mqtt_inspector_publishPayload", publishPayload);
      }
    } catch (e) {}
  }, [isLoaded, brokerUrl, clientId, username, password, subscribedTopics, publishTopic, publishPayload]);

  const handleProjectSelect = (projectId: string) => {
    if (!projectId) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    let protocol = "tcp";
    const protoStr = project.protocol as string;
    if (protoStr === "MQTTS" || protoStr === "mqtts") {
      protocol = "ssl";
    }

    const port = project.port ? project.port : (protocol === "ssl" ? 8883 : 1883);
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
      m.payload.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2C3E50] flex items-center gap-3">
            <Radio className="h-8 w-8 text-[#6A89A7] animate-pulse" />
            MQTT Inspector
          </h1>
          <p className="text-[#5A6C7D] mt-1">
            Real-time industrial MQTT topic explorer and payload monitor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connection & Publish */}
        <div className="space-y-6 lg:col-span-1">
          {/* Connection Card */}
          <Card className="card-industrial shadow-md">
            <CardHeader className="pb-3 border-b border-[#D1DBE5]">
              <CardTitle className="text-lg text-[#2C3E50] flex items-center justify-between">
                <span>Broker Connection</span>
                {isConnected ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    <Wifi className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-[#8B9AA8] bg-[#E8EDF2] px-2 py-0.5 rounded-full border border-[#D1DBE5]">
                    <WifiOff className="h-3.5 w-3.5" /> Disconnected
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Configure broker and wildcard subscription topics
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Load Configuration from Existing Project */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#5A6C7D]">Load Config from Project</Label>
                <select
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  disabled={isConnected || isConnecting || projectsLoading}
                  className="w-full h-10 px-3 border border-[#D1DBE5] rounded-lg text-sm bg-white text-[#2C3E50] focus:ring-1 focus:ring-[#6A89A7] focus:outline-none"
                >
                  <option value="">-- Choose an existing project --</option>
                  {projects
                    .filter((p) => {
                      const proto = (p.protocol || "").toUpperCase();
                      return proto === "MQTT" || proto === "MQTTS";
                    })
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.protocol})
                      </option>
                    ))}
                </select>
              </div>

              {/* Broker URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#5A6C7D]">Broker URL</Label>
                <Input
                  placeholder="e.g. tcp://localhost:1883"
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                  disabled={isConnected || isConnecting}
                  className="bg-white border-[#D1DBE5]"
                />
              </div>

              {/* Client ID */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#5A6C7D]">Client ID</Label>
                <Input
                  placeholder="Inspector Client ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={isConnected || isConnecting}
                  className="bg-white border-[#D1DBE5] font-mono text-xs"
                />
              </div>

              {/* Auth Credentials */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#5A6C7D]">Username</Label>
                  <Input
                    placeholder="Optional"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isConnected || isConnecting}
                    className="bg-white border-[#D1DBE5] text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#5A6C7D]">Password</Label>
                  <Input
                    type="password"
                    placeholder="Optional"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isConnected || isConnecting}
                    className="bg-white border-[#D1DBE5] text-xs"
                  />
                </div>
              </div>

              {/* Subscription Topics */}
              <div className="space-y-1.5 pt-2 border-t border-[#E8EDF2]">
                <Label className="text-xs font-semibold text-[#5A6C7D]">Subscribe to Topics</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. telemetry/#"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                    className="bg-white border-[#D1DBE5] text-xs"
                  />
                  <Button 
                    onClick={handleAddTopic}
                    className="btn-secondary h-10 px-3 bg-[#E8EDF2] border border-[#D1DBE5] hover:bg-[#D1DBE5]"
                  >
                    <Plus className="h-4 w-4 text-[#5A6C7D]" />
                  </Button>
                </div>

                {/* Subscribed Badges List */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {subscribedTopics.map((topic) => (
                    <span 
                      key={topic} 
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8EDF2] text-[#2C3E50] border border-[#D1DBE5]"
                    >
                      {topic}
                      <button 
                        onClick={() => handleRemoveTopic(topic)}
                        className="text-[#8B9AA8] hover:text-red-500 font-bold transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {subscribedTopics.length === 0 && (
                    <span className="text-xs text-[#8B9AA8] italic">No active subscriptions.</span>
                  )}
                </div>
              </div>

              {/* Toggle Connection Button */}
              <Button
                onClick={isConnected ? disconnectMqtt : () => connectMqtt({ brokerUrl, clientId, username, password, subscribedTopics })}
                disabled={isConnecting}
                className={`w-full h-11 mt-4 font-semibold text-sm shadow-md transition-all ${
                  isConnected 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-[#6A89A7] hover:bg-[#5a7997] text-white"
                }`}
              >
                {isConnecting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Connecting...
                  </div>
                ) : isConnected ? (
                  <div className="flex items-center justify-center gap-2">
                    <Square className="h-4 w-4" /> Disconnect
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Play className="h-4 w-4" /> Connect Broker
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Publisher Card */}
          <Card className="card-industrial shadow-md">
            <CardHeader className="pb-3 border-b border-[#D1DBE5]">
              <CardTitle className="text-lg text-[#2C3E50] flex items-center gap-2">
                <Send className="h-5 w-5 text-[#6A89A7]" />
                Publish Message
              </CardTitle>
              <CardDescription>
                Publish one-off telemetry to any custom topic
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Target Topic */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#5A6C7D]">Topic</Label>
                <Input
                  placeholder="e.g. iotkit/test/data"
                  value={publishTopic}
                  onChange={(e) => setPublishTopic(e.target.value)}
                  disabled={!isConnected}
                  className="bg-white border-[#D1DBE5] text-xs font-mono"
                />
              </div>

              {/* Payload Data */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-[#5A6C7D]">Payload (JSON / Text)</Label>
                  <button 
                    onClick={handleFormatJson}
                    disabled={!isConnected}
                    className="text-xs text-[#6A89A7] hover:text-[#5a7997] hover:underline font-medium transition-colors"
                  >
                    Format JSON
                  </button>
                </div>
                <textarea
                  value={publishPayload}
                  onChange={(e) => setPublishPayload(e.target.value)}
                  disabled={!isConnected}
                  className="w-full h-32 p-3 font-mono text-xs border border-[#D1DBE5] rounded-lg bg-white text-[#2C3E50] focus:ring-1 focus:ring-[#6A89A7] focus:outline-none"
                  placeholder="Enter message content..."
                />
              </div>

              <Button
                onClick={handlePublish}
                disabled={!isConnected}
                className="w-full h-10 font-semibold bg-[#6A89A7] hover:bg-[#5a7997] text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" /> Send Payload
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Console */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-industrial h-full shadow-md flex flex-col min-h-[500px]">
            <CardHeader className="pb-3 border-b border-[#D1DBE5] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-[#2C3E50]">Live Traffic Console</CardTitle>
                <CardDescription>Real-time incoming broker traffic log stream</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* Search query */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8B9AA8]" />
                  <Input
                    placeholder="Search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 w-44 md:w-56 text-xs bg-white border-[#D1DBE5]"
                  />
                </div>
                
                {/* Pause Stream */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                  className={`h-9 text-xs border-[#D1DBE5] ${isPaused ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "text-[#5A6C7D] hover:bg-[#E8EDF2]"}`}
                >
                  <Pause className="h-3.5 w-3.5 mr-1" />
                  {isPaused ? "Paused" : "Pause"}
                </Button>

                {/* Clear console */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearMessages}
                  className="h-9 text-xs text-red-500 border-[#D1DBE5] hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto max-h-[580px] divide-y divide-[#E8EDF2]">
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center text-muted-foreground p-6">
                    <Radio className="h-12 w-12 text-[#8B9AA8] opacity-25 mb-3" />
                    <p className="text-sm font-medium text-[#5A6C7D]">No MQTT traffic monitored</p>
                    <p className="text-xs text-[#8B9AA8] mt-1 max-w-sm">
                      Connect to an MQTT broker and verify your subscription topics to stream real-time broker traffic logs here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#E8EDF2]/40 text-xs font-semibold text-[#5A6C7D] border-b border-[#D1DBE5]">
                          <th className="px-4 py-3 font-medium">Timestamp</th>
                          <th className="px-4 py-3 font-medium">Topic</th>
                          <th className="px-4 py-3 font-medium">Payload</th>
                          <th className="px-4 py-3 text-center font-medium">QoS</th>
                          <th className="px-4 py-3 text-center font-medium">Retained</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMessages.map((msg) => (
                          <tr 
                            key={msg.id}
                            onClick={() => setSelectedMessage(msg)}
                            className="hover:bg-[#E8EDF2]/30 cursor-pointer transition-colors text-xs border-b border-[#E8EDF2]"
                          >
                            <td className="px-4 py-3 text-[#8B9AA8] font-mono whitespace-nowrap">
                              {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                                hour12: false,
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#2C3E50] max-w-[150px] truncate">
                              {msg.topic}
                            </td>
                            <td className="px-4 py-3 text-[#5A6C7D] max-w-[280px] truncate font-mono text-[11px]">
                              {msg.payload}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-1.5 py-0.2 bg-[#E8EDF2] border border-[#D1DBE5] rounded font-semibold text-[#5A6C7D]">
                                {msg.qos}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {msg.retained ? (
                                <span className="inline-block px-1.5 py-0.2 bg-amber-50 border border-amber-200 rounded font-semibold text-amber-700">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-[#8B9AA8]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Detail Modal Drawer */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 bg-[#384959]/40 backdrop-blur-[2px] flex items-center justify-end z-[9999]">
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="bg-white w-full max-w-lg h-full shadow-2xl p-6 overflow-y-auto flex flex-col border-l border-[#D1DBE5]"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-[#E8EDF2] mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#2C3E50]">Message Details</h3>
                  <p className="text-xs text-[#8B9AA8] mt-0.5">Inspecting received MQTT topic packet</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMessage(null)}
                  className="text-[#8B9AA8] hover:text-[#5A6C7D]"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Data Properties */}
              <div className="space-y-4 flex-1">
                {/* Topic info */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#5A6C7D]">Topic</Label>
                  <div className="p-3 bg-[#E8EDF2]/40 border border-[#D1DBE5] rounded-lg font-mono text-xs text-[#2C3E50] break-all select-all">
                    {selectedMessage.topic}
                  </div>
                </div>

                {/* Packet parameters */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#5A6C7D]">Quality of Service (QoS)</Label>
                    <div className="p-2.5 bg-white border border-[#D1DBE5] rounded-lg text-sm text-[#2C3E50] font-semibold text-center">
                      QoS {selectedMessage.qos}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#5A6C7D]">Retained Flag</Label>
                    <div className="p-2.5 bg-white border border-[#D1DBE5] rounded-lg text-sm text-[#2C3E50] font-semibold text-center">
                      {selectedMessage.retained ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#5A6C7D]">Timestamp</Label>
                  <div className="p-2.5 bg-white border border-[#D1DBE5] rounded-lg text-xs text-[#5A6C7D] font-mono">
                    {new Date(selectedMessage.timestamp).toLocaleString("id-ID")}
                  </div>
                </div>

                {/* Payload rendering */}
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-[#5A6C7D]">Payload</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedMessage.payload, selectedMessage.id)}
                      className="h-8 text-xs text-[#6A89A7] hover:text-[#5a7997]"
                    >
                      {copiedId === selectedMessage.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy Payload
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="flex-1 w-full p-4 overflow-auto rounded-lg bg-[#384959] text-[#BDDDFC] font-mono text-[11px] leading-relaxed border border-[#2d3a47] max-h-[320px]">
                    {(() => {
                      try {
                        const parsed = JSON.parse(selectedMessage.payload);
                        return JSON.stringify(parsed, null, 2);
                      } catch {
                        return selectedMessage.payload;
                      }
                    })()}
                  </pre>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
