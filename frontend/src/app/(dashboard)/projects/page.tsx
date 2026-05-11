"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, Edit, Play, Square } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, fetchProjects, deleteProject } = useProjectStore();
  const [loading, setLoading] = useState(true);
  // Track simulation status per project: { [projectId]: boolean }
  const [runningProjects, setRunningProjects] = useState<
    Record<string, boolean>
  >({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    fetchProjects().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once projects are loaded, fetch simulation status for each
  useEffect(() => {
    if (projects.length === 0) return;

    projects.forEach((project) => {
      fetchProjectSimStatus(project.id);
    });

    // Cleanup all intervals on unmount
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      intervalsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  const fetchProjectSimStatus = async (projectId: string) => {
    try {
      const res = await api.get(`/simulations/status/${projectId}`);
      setRunningProjects((prev) => ({
        ...prev,
        [projectId]: res.data.isRunning,
      }));
      // If running, start polling for this project
      if (res.data.isRunning) startPolling(projectId);
    } catch {
      setRunningProjects((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const startPolling = (projectId: string) => {
    if (intervalsRef.current[projectId]) return;

    intervalsRef.current[projectId] = setInterval(async () => {
      try {
        const res = await api.get(`/simulations/status/${projectId}`);
        setRunningProjects((prev) => ({
          ...prev,
          [projectId]: res.data.isRunning,
        }));
        if (!res.data.isRunning) {
          clearInterval(intervalsRef.current[projectId]);
          delete intervalsRef.current[projectId];
        }
      } catch {
        clearInterval(intervalsRef.current[projectId]);
        delete intervalsRef.current[projectId];
      }
    }, 5000);
  };

  const stopPolling = (projectId: string) => {
    if (intervalsRef.current[projectId]) {
      clearInterval(intervalsRef.current[projectId]);
      delete intervalsRef.current[projectId];
    }
  };

  const handleStart = async (projectId: string) => {
    setActionLoading((prev) => ({ ...prev, [projectId]: true }));
    try {
      // Fetch saved payload for this project
      const payloadRes = await api.get(`/payloads/project/${projectId}`);
      const payloads = payloadRes.data;

      if (!payloads || payloads.length === 0) {
        toast.error("No payload configured. Please configure payload first.");
        return;
      }

      const latestPayload = payloads[0];
      const structure = JSON.parse(latestPayload.structure);

      await api.post("/simulations/start", {
        projectId,
        payloadStructure: structure,
        interval: 1000,
        batchSize: 1,
      });

      setRunningProjects((prev) => ({ ...prev, [projectId]: true }));
      toast.success("Simulation started!");
      startPolling(projectId);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to start simulation");
    } finally {
      setActionLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleStop = async (projectId: string) => {
    setActionLoading((prev) => ({ ...prev, [projectId]: true }));
    try {
      await api.post("/simulations/stop", { projectId });
      setRunningProjects((prev) => ({ ...prev, [projectId]: false }));
      stopPolling(projectId);
      toast.success("Simulation stopped!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to stop simulation");
    } finally {
      setActionLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      stopPolling(id);
      await deleteProject(id);
    }
  };

  const getProtocolColor = (protocol: string) => {
    if (protocol.includes("HTTP")) return "text-blue-500";
    if (protocol.includes("MQTT")) return "text-green-500";
    if (protocol.includes("WS")) return "text-purple-500";
    return "text-gray-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your IoT simulation projects
          </p>
        </div>
        <Button onClick={() => router.push("/projects/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Button onClick={() => router.push("/projects/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => {
            const isRunning = runningProjects[project.id] ?? false;
            const isLoading = actionLoading[project.id] ?? false;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`glass hover:border-primary transition-colors ${isRunning ? "border-green-500/50" : ""}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {project.description || "No description"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isRunning && (
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                        <div
                          className={`h-2 w-2 rounded-full ${
                            isRunning ? "bg-green-500" : "bg-gray-500"
                          }`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Protocol</span>
                        <span
                          className={`font-medium ${getProtocolColor(project.protocol)}`}
                        >
                          {project.protocol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Host</span>
                        <span className="font-medium truncate ml-2">
                          {project.host}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Last Activity
                        </span>
                        <span className="text-xs">
                          {project.lastActivity
                            ? formatDate(project.lastActivity)
                            : "Never"}
                        </span>
                      </div>
                      {isRunning && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="text-xs text-green-500 font-medium">
                            ● Running
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>

                      {!isRunning ? (
                        <Button
                          size="sm"
                          onClick={() => handleStart(project.id)}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {isLoading ? "..." : "Start"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStop(project.id)}
                          disabled={isLoading}
                          className="flex-1"
                        >
                          <Square className="h-3 w-3 mr-1" />
                          {isLoading ? "..." : "Stop"}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(project.id)}
                        disabled={isRunning}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
