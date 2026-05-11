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
  // Display status: 'idle' | 'running' | 'stopped'
  const [projectStatus, setProjectStatus] = useState<
    Record<string, "idle" | "running" | "stopped">
  >({});
  const intervalsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const idleTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    projectId: string;
    projectName: string;
  }>({ open: false, projectId: "", projectName: "" });

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
      Object.values(idleTimersRef.current).forEach(clearTimeout);
      intervalsRef.current = {};
      idleTimersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  const setIdleAfterDelay = (projectId: string) => {
    // Clear any existing idle timer
    if (idleTimersRef.current[projectId]) {
      clearTimeout(idleTimersRef.current[projectId]);
    }
    // After 10 seconds, change status from 'stopped' to 'idle'
    idleTimersRef.current[projectId] = setTimeout(() => {
      setProjectStatus((prev) => ({ ...prev, [projectId]: "idle" }));
      delete idleTimersRef.current[projectId];
    }, 10000);
  };

  const fetchProjectSimStatus = async (projectId: string) => {
    try {
      const res = await api.get(`/simulations/status/${projectId}`);
      const isRunning = res.data.isRunning;
      setRunningProjects((prev) => ({ ...prev, [projectId]: isRunning }));
      setProjectStatus((prev) => ({
        ...prev,
        [projectId]: isRunning ? "running" : "idle",
      }));
      if (isRunning) startPolling(projectId);
    } catch {
      setRunningProjects((prev) => ({ ...prev, [projectId]: false }));
      setProjectStatus((prev) => ({ ...prev, [projectId]: "idle" }));
    }
  };

  const startPolling = (projectId: string) => {
    if (intervalsRef.current[projectId]) return;

    intervalsRef.current[projectId] = setInterval(async () => {
      try {
        const res = await api.get(`/simulations/status/${projectId}`);
        const isRunning = res.data.isRunning;
        setRunningProjects((prev) => ({ ...prev, [projectId]: isRunning }));
        if (!isRunning) {
          setProjectStatus((prev) => ({ ...prev, [projectId]: "stopped" }));
          setIdleAfterDelay(projectId);
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
        toast.error(
          "No payload configured. Redirecting to project settings...",
        );
        setActionLoading((prev) => ({ ...prev, [projectId]: false }));
        // Redirect to project detail page to configure payload
        router.push(`/projects/${projectId}`);
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
      setProjectStatus((prev) => ({ ...prev, [projectId]: "running" }));
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
      setProjectStatus((prev) => ({ ...prev, [projectId]: "stopped" }));
      setIdleAfterDelay(projectId);
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

  const confirmDelete = async () => {
    stopPolling(deleteDialog.projectId);
    await deleteProject(deleteDialog.projectId);
    setDeleteDialog({ open: false, projectId: "", projectName: "" });
    toast.success("Project deleted successfully!");
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
            const status = projectStatus[project.id] ?? "idle";

            const statusConfig = {
              running: {
                label: "Running",
                dot: "bg-green-500 animate-pulse",
                text: "text-green-500",
                border: "border-green-500/50",
              },
              stopped: {
                label: "Stopped",
                dot: "bg-red-500",
                text: "text-red-500",
                border: "border-red-500/30",
              },
              idle: {
                label: "Idle",
                dot: "bg-gray-500",
                text: "text-gray-400",
                border: "",
              },
            };
            const cfg = statusConfig[status];

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`glass hover:border-primary transition-colors ${cfg.border}`}
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
                      {/* Status badge top-right */}
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${cfg.text} border-current`}
                      >
                        <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        {cfg.label}
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
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            projectId: project.id,
                            projectName: project.name,
                          })
                        }
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

      {/* Custom Delete Confirmation Dialog */}
      {deleteDialog.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-border">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Delete Project</h2>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  "{deleteDialog.projectName}"
                </span>
                ? All payload configurations, simulation history, and logs will
                be permanently removed.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <Button
                variant="outline"
                onClick={() =>
                  setDeleteDialog({
                    open: false,
                    projectId: "",
                    projectName: "",
                  })
                }
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
