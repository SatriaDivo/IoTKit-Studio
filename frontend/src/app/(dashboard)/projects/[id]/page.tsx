"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Play, Trash2, Plus, X, Upload } from "lucide-react";
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
import { PayloadField } from "@/types";
import toast from "react-hot-toast";

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { currentProject, fetchProject } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Payload fields state
  const [payloadFields, setPayloadFields] = useState<PayloadField[]>([
    {
      name: "temperature",
      type: "number",
      mode: "random",
      min: 20,
      max: 30,
      unit: "°C",
      required: true,
    },
  ]);

  // Simulation settings state
  const [simulationSettings, setSimulationSettings] = useState({
    interval: 1000,
    batchSize: 1,
    duration: 0,
  });

  // Import payload state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchProject(params.id as string).finally(() => setLoading(false));
    }
  }, [params.id, fetchProject]);

  const addPayloadField = () => {
    setPayloadFields([
      ...payloadFields,
      {
        name: `field_${payloadFields.length + 1}`,
        type: "string",
        mode: "static",
        value: "",
        required: false,
      },
    ]);
  };

  const removePayloadField = (index: number) => {
    setPayloadFields(payloadFields.filter((_, i) => i !== index));
  };

  const updatePayloadField = (
    index: number,
    updates: Partial<PayloadField>,
  ) => {
    setPayloadFields(
      payloadFields.map((field, i) =>
        i === index ? { ...field, ...updates } : field,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement API call to save payload and simulation settings
      console.log("Saving configuration:", {
        payloadFields,
        simulationSettings,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Configuration saved successfully!");
    } catch (error) {
      console.error("Failed to save configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleStartSimulation = async () => {
    try {
      // TODO: Implement API call to start simulation
      console.log("Starting simulation with:", {
        projectId: params.id,
        payloadFields,
        simulationSettings,
      });

      toast.success("Simulation started! (Feature coming soon)");
    } catch (error) {
      console.error("Failed to start simulation:", error);
      toast.error("Failed to start simulation");
    }
  };

  const handleImportPayload = () => {
    try {
      const parsed = JSON.parse(importJson);
      const fields: PayloadField[] = [];

      const processObject = (obj: any, prefix = "") => {
        Object.entries(obj).forEach(([key, value]) => {
          const fieldName = prefix ? `${prefix}.${key}` : key;
          const valueType = typeof value;

          if (
            valueType === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            // Nested object - process recursively
            processObject(value, fieldName);
          } else {
            // Create field based on value type
            let field: PayloadField = {
              name: fieldName,
              type: "string",
              mode: "static",
              value: "",
              required: false,
            };

            if (valueType === "number") {
              field.type = "number";
              field.mode = "random";
              field.min = 0;
              field.max = 100;
              field.value = value;
            } else if (valueType === "boolean") {
              field.type = "boolean";
              field.mode = "static";
              field.value = value;
            } else if (valueType === "string") {
              field.type = "string";
              field.mode = "static";
              field.value = value;
            }

            fields.push(field);
          }
        });
      };

      processObject(parsed);
      setPayloadFields(fields);
      setShowImportDialog(false);
      setImportJson("");
      toast.success(`Successfully imported ${fields.length} fields!`);
    } catch (error) {
      toast.error("Invalid JSON format. Please check your input.");
      console.error("Import error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <Button onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{currentProject.name}</h1>
            <p className="text-muted-foreground">
              {currentProject.description || "No description"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={handleStartSimulation}>
            <Play className="h-4 w-4 mr-2" />
            Start Simulation
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Project Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>Basic project configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Protocol</Label>
                <div className="text-lg font-semibold text-primary">
                  {currentProject.protocol}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Host</Label>
                <div className="font-mono text-sm">{currentProject.host}</div>
              </div>
              {currentProject.port && (
                <div className="space-y-2">
                  <Label>Port</Label>
                  <div className="font-mono text-sm">{currentProject.port}</div>
                </div>
              )}
              {currentProject.endpoint && (
                <div className="space-y-2">
                  <Label>Endpoint</Label>
                  <div className="font-mono text-sm">
                    {currentProject.endpoint}
                  </div>
                </div>
              )}
              {currentProject.topic && (
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <div className="font-mono text-sm">
                    {currentProject.topic}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      currentProject.status === "active"
                        ? "bg-green-500"
                        : currentProject.status === "error"
                          ? "bg-red-500"
                          : "bg-gray-500"
                    }`}
                  />
                  <span className="capitalize">{currentProject.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payload Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payload Configuration</CardTitle>
                  <CardDescription>
                    Configure your IoT payload structure
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowImportDialog(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import JSON
                  </Button>
                  <Button size="sm" onClick={addPayloadField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {payloadFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm mb-4">No fields added yet</p>
                  <Button variant="outline" onClick={addPayloadField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Field
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Scrollable Fields List */}
                  <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
                    {payloadFields.map((field, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 space-y-2 relative bg-card"
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removePayloadField(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>

                        <div className="grid grid-cols-4 gap-2 pr-6">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={field.name}
                              onChange={(e) =>
                                updatePayloadField(index, {
                                  name: e.target.value,
                                })
                              }
                              placeholder="field_name"
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <select
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              value={field.type}
                              onChange={(e) =>
                                updatePayloadField(index, {
                                  type: e.target.value as PayloadField["type"],
                                })
                              }
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Mode</Label>
                            <select
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              value={field.mode}
                              onChange={(e) =>
                                updatePayloadField(index, {
                                  mode: e.target.value as PayloadField["mode"],
                                })
                              }
                            >
                              <option value="static">Static</option>
                              <option value="random">Random</option>
                              <option value="incremental">Incr.</option>
                              <option value="timestamp">Time</option>
                            </select>
                          </div>

                          {field.type === "number" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Unit</Label>
                              <Input
                                value={field.unit || ""}
                                onChange={(e) =>
                                  updatePayloadField(index, {
                                    unit: e.target.value,
                                  })
                                }
                                placeholder="°C, %, ppm"
                                className="h-8 text-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* Second row for value/range inputs */}
                        <div className="grid grid-cols-4 gap-2 pr-6">
                          {field.mode === "static" && (
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Value</Label>
                              <Input
                                value={field.value || ""}
                                onChange={(e) =>
                                  updatePayloadField(index, {
                                    value: e.target.value,
                                  })
                                }
                                placeholder="Enter value"
                                className="h-8 text-xs"
                              />
                            </div>
                          )}

                          {field.mode === "random" &&
                            field.type === "number" && (
                              <div className="space-y-1 col-span-4">
                                <Label className="text-xs">Range</Label>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="number"
                                    value={field.min || 0}
                                    onChange={(e) =>
                                      updatePayloadField(index, {
                                        min: parseFloat(e.target.value),
                                      })
                                    }
                                    placeholder="Min"
                                    className="h-8 text-xs"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    to
                                  </span>
                                  <Input
                                    type="number"
                                    value={field.max || 100}
                                    onChange={(e) =>
                                      updatePayloadField(index, {
                                        max: parseFloat(e.target.value),
                                      })
                                    }
                                    placeholder="Max"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            )}

                          {field.mode === "incremental" &&
                            field.type === "number" && (
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs">
                                  Start Value (optional)
                                </Label>
                                <Input
                                  type="number"
                                  value={field.value || 0}
                                  onChange={(e) =>
                                    updatePayloadField(index, {
                                      value: parseFloat(e.target.value),
                                    })
                                  }
                                  placeholder="0"
                                  className="h-8 text-xs"
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* JSON Preview */}
                  <div className="border-t pt-3">
                    <h4 className="text-xs font-semibold mb-2">
                      JSON Preview:
                    </h4>
                    <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto max-h-[120px] overflow-y-auto">
                      {JSON.stringify(
                        payloadFields.reduce(
                          (acc, field) => {
                            let value;
                            if (field.mode === "static") {
                              value = field.value;
                            } else if (
                              field.mode === "random" &&
                              field.type === "number"
                            ) {
                              value = `<random ${field.min}-${field.max}>`;
                            } else if (field.mode === "incremental") {
                              value = "<incremental>";
                            } else if (field.mode === "timestamp") {
                              value = "<timestamp>";
                            } else {
                              value = `<${field.mode}>`;
                            }
                            acc[field.name] = value;
                            return acc;
                          },
                          {} as Record<string, any>,
                        ),
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Simulation Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass">
          <CardHeader>
            <CardTitle>Simulation Settings</CardTitle>
            <CardDescription>Configure simulation parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (ms)</Label>
                <Input
                  id="interval"
                  type="number"
                  placeholder="1000"
                  value={simulationSettings.interval}
                  onChange={(e) =>
                    setSimulationSettings({
                      ...simulationSettings,
                      interval: parseInt(e.target.value) || 1000,
                    })
                  }
                  min={100}
                />
                <p className="text-xs text-muted-foreground">
                  Time between each payload send
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">Batch Size</Label>
                <Input
                  id="batch"
                  type="number"
                  placeholder="1"
                  value={simulationSettings.batchSize}
                  onChange={(e) =>
                    setSimulationSettings({
                      ...simulationSettings,
                      batchSize: parseInt(e.target.value) || 1,
                    })
                  }
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Number of payloads per batch
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="0 = Unlimited"
                  value={simulationSettings.duration}
                  onChange={(e) =>
                    setSimulationSettings({
                      ...simulationSettings,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  0 = run until stopped manually
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Import JSON Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border rounded-lg shadow-lg max-w-2xl w-full mx-4"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Import Payload from JSON</CardTitle>
                    <CardDescription>
                      Paste your JSON payload structure below
                    </CardDescription>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setShowImportDialog(false);
                      setImportJson("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="json-input">JSON Payload</Label>
                  <textarea
                    id="json-input"
                    className="w-full h-64 p-3 rounded-md border border-input bg-background font-mono text-sm"
                    placeholder={`Example:
{
  "temperature": 25.5,
  "humidity": 60,
  "pressure": 1013.25,
  "location": "Room A",
  "status": "active"
}`}
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                  />
                </div>

                <div className="bg-muted p-3 rounded-md text-xs space-y-1">
                  <p className="font-semibold">Import Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      Number values will be set to Random mode (0-100 range)
                    </li>
                    <li>String values will be set to Static mode</li>
                    <li>Boolean values will be set to Static mode</li>
                    <li>
                      You can adjust mode, range, and other settings after
                      import
                    </li>
                    <li>
                      Nested objects will be flattened (e.g., sensor.temp)
                    </li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportDialog(false);
                      setImportJson("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleImportPayload}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
