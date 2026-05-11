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
    username: "",
    password: "",
    sslEnabled: false,
    autoReconnect: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        port: formData.port ? parseInt(formData.port) : undefined,
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      protocol: e.target.value as ProtocolType,
                    })
                  }
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
                    onChange={(e) =>
                      setFormData({ ...formData, host: e.target.value })
                    }
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
                <Label htmlFor="authToken">Authentication Token</Label>
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
