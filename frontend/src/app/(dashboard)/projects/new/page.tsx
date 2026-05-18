"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProtocolType } from "@/types";
import { parseHostInput } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
export default function NewProjectPage() {
  const router = useRouter();
  const { createProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    protocol: "HTTP" as ProtocolType,
    host: "",
    port: "",
    endpoint: "",
    topic: "",
    authToken: "",
    headers: "",
    username: "",
    password: "",
    sslEnabled: false,
    autoReconnect: true,
  });
  
  const [headerItems, setHeaderItems] = useState<{key: string, value: string}[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        port: formData.port ? parseInt(formData.port) : undefined,
        headers: headerItems.length > 0 ? JSON.stringify(headerItems.filter(h => h.key.trim() !== "")) : undefined,
        status: "inactive" as const,
      };
      const newProject = await createProject(data);
      // Redirect to project detail page to configure payload
      router.push(`/projects/${newProject.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setLoading(false);
    }
  };

  const protocols: ProtocolType[] = [
    "HTTP",
    "HTTPS",
    "MQTT",
    "MQTTS",
    "WS",
    "WSS",
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Project</h1>
        <p className="text-muted-foreground">
          Set up a new IoT simulation project
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Configure your IoT project settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol *</Label>
                <select
                  id="protocol"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.protocol}
                  onChange={(e) => {
                    const protocol = e.target.value as ProtocolType;
                    let defaultPort = formData.port;
                    
                    if (protocol === "HTTP" || protocol === "WS") defaultPort = "80";
                    else if (protocol === "HTTPS" || protocol === "WSS") defaultPort = "443";
                    else if (protocol === "MQTT") defaultPort = "1883";
                    else if (protocol === "MQTTS") defaultPort = "8883";

                    setFormData({
                      ...formData,
                      protocol,
                      port: defaultPort,
                    });
                  }}
                  required
                >
                  {protocols.map((protocol) => (
                    <option key={protocol} value={protocol}>
                      {protocol}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">Host *</Label>
                  <Input
                    id="host"
                    placeholder="localhost or example.com"
                    value={formData.host}
                    onChange={(e) => {
                      const value = e.target.value;
                      const parsed = parseHostInput(value);
                      if (parsed) {
                        setFormData({
                          ...formData,
                          host: parsed.host,
                          protocol: parsed.protocol as ProtocolType,
                          port: parsed.port,
                          endpoint: parsed.protocol.includes("HTTP") || parsed.protocol.includes("WS") ? parsed.path : formData.endpoint,
                          topic: parsed.protocol.includes("MQTT") ? (parsed.path.startsWith("/") ? parsed.path.slice(1) : parsed.path) : formData.topic,
                        });
                      } else {
                        setFormData({ ...formData, host: value });
                      }
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="8080"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData({ ...formData, port: e.target.value })
                    }
                  />
                </div>
              </div>

              {(formData.protocol.includes("HTTP") ||
                formData.protocol.includes("WS")) && (
                <div className="space-y-2">
                  <Label htmlFor="endpoint">Endpoint / Path</Label>
                  <Input
                    id="endpoint"
                    placeholder="/api/data"
                    value={formData.endpoint}
                    onChange={(e) =>
                      setFormData({ ...formData, endpoint: e.target.value })
                    }
                  />
                </div>
              )}

              {formData.protocol.includes("MQTT") && (
                <div className="space-y-2">
                  <Label htmlFor="topic">MQTT Topic</Label>
                  <Input
                    id="topic"
                    placeholder="sensors/temperature"
                    value={formData.topic}
                    onChange={(e) =>
                      setFormData({ ...formData, topic: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="authToken">Authentication Token (Bearer)</Label>
                <Input
                  id="authToken"
                  type="password"
                  placeholder="Optional"
                  value={formData.authToken}
                  onChange={(e) =>
                    setFormData({ ...formData, authToken: e.target.value })
                  }
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>Custom Headers</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHeaderItems([...headerItems, { key: "", value: "" }])}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Header
                  </Button>
                </div>
                {headerItems.map((header, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Key (e.g. X-API-Key)"
                      value={header.key}
                      onChange={(e) => {
                        const newHeaders = [...headerItems];
                        newHeaders[index].key = e.target.value;
                        setHeaderItems(newHeaders);
                      }}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={header.value}
                      onChange={(e) => {
                        const newHeaders = [...headerItems];
                        newHeaders[index].value = e.target.value;
                        setHeaderItems(newHeaders);
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newHeaders = [...headerItems];
                        newHeaders.splice(index, 1);
                        setHeaderItems(newHeaders);
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Project"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/projects")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
