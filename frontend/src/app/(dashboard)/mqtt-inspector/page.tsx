"use client";

import { useEffect, useState, useRef } from "react";
import {
  Radio,
  Play,
  Square,
  Plus,
  X,
  Send,
  Trash2,
  Pause,
  Copy,
  Check,
  Search,
  Settings,
  ChevronRight,
  MessageSquare,
  Layers,
  Terminal,
  Activity,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
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
  const [showPassword, setShowPassword] = useState(false);
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
      2
    )
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
  const [selectedMessage, setSelectedMessage] = useState<MQTTMessage | null>(null);
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
            `iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`
          );
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

        const savedPublishInterval = localStorage.getItem("mqtt_inspector_publishInterval");
        if (savedPublishInterval) setPublishInterval(Number(savedPublishInterval));

        const savedPublishCount = localStorage.getItem("mqtt_inspector_publishCount");
        if (savedPublishCount && savedPublishCount !== "") {
          setPublishCount(Number(savedPublishCount));
        }

        const wasConnected = localStorage.getItem("mqtt_inspector_wasConnected");
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
          `iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`
        );
      }
    } catch (e) {
      setClientId(
        `iotkit_inspector_${Math.random().toString(16).substring(2, 10)}`
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
          JSON.stringify(subscribedTopics)
        );
        localStorage.setItem("mqtt_inspector_publishTopic", publishTopic);
        localStorage.setItem("mqtt_inspector_publishPayload", publishPayload);
        localStorage.setItem("mqtt_inspector_publishInterval", publishInterval.toString());
        localStorage.setItem("mqtt_inspector_publishCount", publishCount.toString());
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
          isConnected ? "true" : "false"
        );
      }
    } catch (e) {}
  }, [isLoaded, isConnected]);

  const handleProjectSelect = (projectId: string) => {
    if (!projectId) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    let protocol = "tcp";
    const protoStr = (project.protocol as string) || "";
    if (protoStr.toUpperCase() === "MQTTS") {
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
    toast.success(`Loaded configuration from: ${project.name}`);
  };

  const handleAddTopic = () => {
    if (!topicInput.trim()) return;
    if (subscribedTopics.includes(topicInput.trim())) {
      toast.error("Topic already in subscription list");
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
      toast.error("Topic is required");
      return;
    }

    const success = await publishMessage(publishTopic.trim(), publishPayload);
    if (success) {
      toast.success("MQTT packet published");
    }
  };

  const handleStartAutoPublish = () => {
    if (!publishTopic.trim()) {
      toast.error("Topic is required");
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
      toast.success(`Auto-publish completed: ${count} message(s)`);
      return;
    }

    autoPublishIntervalRef.current = setInterval(async () => {
      const success = await publishMessage(publishTopic.trim(), publishPayload);
      if (success) {
        count++;
        setPublishedCount(count);

        if (maxCount > 0 && count >= maxCount) {
          handleStopAutoPublish();
          toast.success(`Auto-publish completed: ${count} message(s)`);
        }
      }
    }, publishInterval * 1000);

    toast.success(`Auto-publish started (${publishInterval}s interval)`);
  };

  const handleStopAutoPublish = () => {
    if (autoPublishIntervalRef.current) {
      clearInterval(autoPublishIntervalRef.current);
      autoPublishIntervalRef.current = null;
    }
    setIsAutoPublishing(false);
    toast.success(`Auto-publish stopped. Emitted ${publishedCount} packet(s)`);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(publishPayload);
      setPublishPayload(JSON.stringify(parsed, null, 2));
      toast.success("Formatted JSON payload");
    } catch {
      toast.error("Invalid JSON syntax");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.payload.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  MQTT Protocol Inspector
                </h1>
                {isConnected ? (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    BROKER_CONNECTED
                  </span>
                ) : isConnecting ? (
                  <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    CONNECTING...
                  </span>
                ) : (
                  <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                    DISCONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                BROKER: {brokerUrl}{" // "}CLIENT_ID: {clientId || "auto"}
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConnectionModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium text-[#475569] bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC]"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>CONFIG</span>
            </button>

            {isConnected ? (
              <button
                onClick={disconnectMqtt}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] shadow-sm disabled:opacity-50 transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{isConnecting ? "Connecting..." : "Connect Broker"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Control Rail + Sniffer Teleprinter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Control Rail (4 cols): Projects Preset, Subscriptions, Publisher */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Preset Selector */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline p-3 space-y-2">
            <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase block">
              LOAD CONFIG FROM PROJECT NODE
            </label>
            <select
              onChange={(e) => handleProjectSelect(e.target.value)}
              disabled={isConnected || isConnecting || projectsLoading}
              className="w-full h-8 px-2.5 border border-[#CBD5E1] rounded text-xs font-mono bg-white focus:border-[#2563EB] outline-none"
            >
              <option value="">-- Select MQTT Project --</option>
              {projects
                .filter((p) => {
                  const proto = (p.protocol || "").toUpperCase();
                  return proto.includes("MQTT");
                })
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.host}:{p.port || 1883})
                  </option>
                ))}
            </select>
          </div>

          {/* Subscriptions Panel */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                TOPIC_SUBSCRIPTIONS
              </span>
              <span className="font-mono text-[10px] text-[#64748B]">
                {subscribedTopics.length} ACTIVE
              </span>
            </div>

            <div className="p-3 space-y-3">
              {/* Subscribe input */}
              <div className="flex gap-1.5">
                <input
                  placeholder="sensors/+/temperature"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                  className="flex-1 h-8 px-2.5 font-mono text-xs border border-[#CBD5E1] rounded bg-white focus:border-[#2563EB] outline-none"
                />
                <button
                  onClick={handleAddTopic}
                  className="px-2.5 h-8 bg-[#0F172A] text-white rounded text-xs font-semibold hover:bg-[#1E293B]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Subscribed list */}
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {subscribedTopics.map((topic) => (
                  <div
                    key={topic}
                    className="flex items-center justify-between p-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-mono group"
                  >
                    <span className="text-emerald-700 font-semibold truncate max-w-[200px]">
                      {topic}
                    </span>
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      title="Unsubscribe"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Publisher Panel */}
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                PACKET_PUBLISHER
              </span>
              <button
                onClick={handleFormatJson}
                className="text-[10px] font-mono text-[#2563EB] hover:underline"
              >
                FORMAT_JSON
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              <div>
                <label className="text-[10px] font-mono text-[#64748B] uppercase block mb-1">
                  PUBLISH_TOPIC
                </label>
                <input
                  value={publishTopic}
                  onChange={(e) => setPublishTopic(e.target.value)}
                  placeholder="iotkit/device/1"
                  className="w-full h-8 px-2.5 font-mono text-xs border border-[#CBD5E1] rounded bg-white focus:border-[#2563EB] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#64748B] uppercase block mb-1">
                  PAYLOAD_BODY (JSON / TEXT)
                </label>
                <textarea
                  value={publishPayload}
                  onChange={(e) => setPublishPayload(e.target.value)}
                  className="w-full h-24 p-2 font-mono text-xs border border-[#CBD5E1] rounded bg-white focus:border-[#2563EB] outline-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handlePublish}
                  disabled={!isConnected}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 bg-[#0F172A] text-white rounded text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  <span>Emit Packet</span>
                </button>
              </div>

              {/* Auto Publish Trigger */}
              <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#64748B]">
                  <span>EVERY:</span>
                  <input
                    type="number"
                    min="1"
                    value={publishInterval}
                    onChange={(e) => setPublishInterval(parseInt(e.target.value) || 1)}
                    className="w-12 h-6 px-1.5 border border-[#CBD5E1] rounded text-center text-xs font-mono"
                  />
                  <span>SEC</span>
                </div>

                {!isAutoPublishing ? (
                  <button
                    onClick={handleStartAutoPublish}
                    disabled={!isConnected}
                    className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-[#CBD5E1] hover:bg-[#F8FAFC] disabled:opacity-50"
                  >
                    START_LOOP
                  </button>
                ) : (
                  <button
                    onClick={handleStopAutoPublish}
                    className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-rose-600 text-white hover:bg-rose-700"
                  >
                    HALT_LOOP ({publishedCount})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Area (8 cols): Packet Sniffer & Detail Inspector */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex flex-col h-[680px]">
            {/* Sniffer Top Bar */}
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  CAPTURED_PACKET_STREAM
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                  {filteredMessages.length} PKTS
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    placeholder="Filter packets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 pl-7 pr-2 font-mono text-xs border border-[#CBD5E1] rounded bg-white w-40 sm:w-48 outline-none focus:border-[#2563EB]"
                  />
                </div>

                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-2 py-1 rounded text-xs font-mono font-medium border flex items-center gap-1 ${
                    isPaused
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                  }`}
                  title={isPaused ? "Resume packet capture" : "Pause packet capture"}
                >
                  {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  <span>{isPaused ? "RESUMED" : "PAUSE"}</span>
                </button>

                <button
                  onClick={clearMessages}
                  className="px-2 py-1 rounded text-xs font-mono font-medium border border-[#CBD5E1] text-[#475569] hover:text-rose-600 hover:bg-rose-50"
                  title="Purge captured packets"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Split Sniffer: Packets List (Top) & Detail Inspector (Bottom) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Packets Stream */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] font-mono text-xs">
                {filteredMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-[#94A3B8] text-center space-y-2">
                    <Radio className="h-8 w-8 opacity-25" />
                    <p className="uppercase text-xs tracking-wider">
                      NO_MQTT_PACKETS_CAPTURED
                    </p>
                    <p className="text-[11px] font-sans text-slate-400 max-w-sm">
                      Connect to your MQTT broker and publish or subscribe to topics to sniff live telemetry packets.
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isSelected = selectedMessage?.id === msg.id;
                    return (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedMessage(msg)}
                        className={`px-3.5 py-2 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/70 border-l-2 border-[#2563EB]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-emerald-700 font-bold truncate max-w-[150px]">
                            {msg.topic}
                          </span>
                          <span className="text-slate-400 text-[10px] shrink-0">
                            QoS {msg.qos}
                          </span>
                          <span className="text-[#64748B] truncate max-w-[260px] hidden sm:inline">
                            {msg.payload}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new TextEncoder().encode(msg.payload).length}B
                          </span>
                          <ChevronRight className="h-3 w-3 text-slate-400" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Packet Detail Inspector (Bottom Section) */}
              <div className="h-56 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col overflow-hidden">
                <div className="px-3.5 py-1.5 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-[#0F172A] uppercase">
                      PACKET_INSPECTOR
                    </span>
                    {selectedMessage && (
                      <span className="font-mono text-[10px] text-[#2563EB] font-bold">
                        {selectedMessage.topic}
                      </span>
                    )}
                  </div>

                  {selectedMessage && (
                    <button
                      onClick={() =>
                        copyToClipboard(selectedMessage.payload, selectedMessage.id)
                      }
                      className="text-[10px] font-mono text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
                    >
                      {copiedId === selectedMessage.id ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedId === selectedMessage.id ? "COPIED" : "COPY_PAYLOAD"}</span>
                    </button>
                  )}
                </div>

                <div className="p-3 flex-1 overflow-y-auto">
                  {selectedMessage ? (
                    <pre className="font-mono text-xs text-[#0F172A] leading-relaxed">
                      {(() => {
                        try {
                          const parsed = JSON.parse(selectedMessage.payload);
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return selectedMessage.payload;
                        }
                      })()}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 font-mono text-xs">
                      {"// Select a packet from the stream above to inspect its decoded payload."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Settings Modal */}
      {showConnectionModal && (
        <div
          style={{ margin: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white border border-[#CBD5E1] rounded-md shadow-popover max-w-md w-full overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase">
                MQTT_BROKER_SETTINGS
              </span>
              <button
                onClick={() => setShowConnectionModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  BROKER URL (TCP / SSL / WS)
                </label>
                <input
                  value={brokerUrl}
                  onChange={(e) => setBrokerUrl(e.target.value)}
                  disabled={isConnected}
                  className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                  placeholder="tcp://broker.hivemq.com:1883"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  CLIENT ID
                </label>
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={isConnected}
                  className="w-full h-8 px-2.5 font-mono border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    USERNAME (OPTIONAL)
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isConnected}
                    className="w-full h-8 px-2 font-mono border border-[#CBD5E1] rounded bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                    PASSWORD (OPTIONAL)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isConnected}
                      className="w-full h-8 px-2 pr-7 font-mono border border-[#CBD5E1] rounded bg-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="px-3 py-1.5 text-xs font-mono rounded border border-[#CBD5E1] hover:bg-[#F8FAFC]"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    setShowConnectionModal(false);
                    toast.success("Broker parameters updated");
                  }}
                  className="px-4 py-1.5 text-xs font-mono font-bold bg-[#0F172A] text-white rounded hover:bg-[#1E293B]"
                >
                  SAVE_SETTINGS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
