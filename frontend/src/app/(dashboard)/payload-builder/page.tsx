"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Save,
  Eye,
  Code,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  FileJson,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectStore } from "@/store/projectStore";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface PayloadField {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  mode?: "static" | "random" | "incremental" | "timestamp";
  value?: any;
  min?: number;
  max?: number;
  children?: PayloadField[];
  expanded?: boolean;
}

export default function PayloadBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { projects } = useProjectStore();

  const [fields, setFields] = useState<PayloadField[]>([]);
  const [payloadName, setPayloadName] = useState("");
  const [preview, setPreview] = useState<any>({});
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (projectId) {
      loadTemplates();
    }
  }, [projectId]);

  useEffect(() => {
    generatePreview();
  }, [fields]);

  const loadTemplates = async () => {
    if (!projectId) return;
    try {
      const response = await api.get(`/payloads/project/${projectId}`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const generatePreview = () => {
    const payload: any = {};
    fields.forEach((field) => {
      payload[field.name] = generateFieldValue(field);
    });
    setPreview(payload);
  };

  const generateFieldValue = (field: PayloadField): any => {
    switch (field.type) {
      case "string":
        if (field.mode === "timestamp") return new Date().toISOString();
        if (field.mode === "random")
          return `value_${Math.random().toString(36).substring(7)}`;
        if (field.mode === "incremental") return `${field.value || "item"}_0`;
        return field.value || "";

      case "number":
        if (field.mode === "timestamp") return Date.now();
        if (field.mode === "random") {
          const min = field.min ?? 0;
          const max = field.max ?? 100;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        if (field.mode === "incremental") return field.min ?? 0;
        return field.value ?? 0;

      case "boolean":
        if (field.mode === "random") return Math.random() > 0.5;
        return field.value ?? false;

      case "object":
        if (!field.children) return {};
        const obj: any = {};
        field.children.forEach((child) => {
          obj[child.name] = generateFieldValue(child);
        });
        return obj;

      case "array":
        const length = field.value ?? 3;
        const arr: any[] = [];
        if (field.children && field.children.length > 0) {
          for (let i = 0; i < length; i++) {
            const item: any = {};
            field.children.forEach((child) => {
              item[child.name] = generateFieldValue(child);
            });
            arr.push(item);
          }
        } else {
          for (let i = 0; i < length; i++) {
            arr.push(i);
          }
        }
        return arr;

      default:
        return null;
    }
  };

  const addField = (parentId?: string) => {
    const newField: PayloadField = {
      id: `field_${Date.now()}`,
      name: "newField",
      type: "string",
      mode: "static",
      value: "",
    };

    if (parentId) {
      setFields((prev) =>
        prev.map((f) => {
          if (f.id === parentId) {
            return {
              ...f,
              children: [...(f.children || []), newField],
              expanded: true,
            };
          }
          return f;
        }),
      );
    } else {
      setFields((prev) => [...prev, newField]);
    }
  };

  const updateField = (
    id: string,
    updates: Partial<PayloadField>,
    parentId?: string,
  ) => {
    if (parentId) {
      setFields((prev) =>
        prev.map((f) => {
          if (f.id === parentId && f.children) {
            return {
              ...f,
              children: f.children.map((c) =>
                c.id === id ? { ...c, ...updates } : c,
              ),
            };
          }
          return f;
        }),
      );
    } else {
      setFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      );
    }
  };

  const deleteField = (id: string, parentId?: string) => {
    if (parentId) {
      setFields((prev) =>
        prev.map((f) => {
          if (f.id === parentId && f.children) {
            return {
              ...f,
              children: f.children.filter((c) => c.id !== id),
            };
          }
          return f;
        }),
      );
    } else {
      setFields((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const toggleExpand = (id: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, expanded: !f.expanded } : f)),
    );
  };

  const saveTemplate = async () => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }

    if (!payloadName.trim()) {
      toast.error("Please enter a payload name");
      return;
    }

    if (fields.length === 0) {
      toast.error("Please add at least one field");
      return;
    }

    try {
      setSaving(true);
      await api.post("/payloads", {
        name: payloadName,
        structure: fields,
        projectId,
        template: true,
      });
      toast.success("Payload template saved successfully!");
      loadTemplates();
      setPayloadName("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = (template: any) => {
    try {
      const structure = JSON.parse(template.structure);
      setFields(structure);
      setPayloadName(template.name);
      toast.success(`Loaded template: ${template.name}`);
    } catch (error) {
      toast.error("Failed to load template");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(preview, null, 2));
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const renderField = (
    field: PayloadField,
    parentId?: string,
    depth: number = 0,
  ) => {
    const isNested = field.type === "object" || field.type === "array";

    return (
      <motion.div
        key={field.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border border-blue-100 rounded-lg p-4 bg-white ${depth > 0 ? "ml-6 mt-2" : "mb-3"}`}
      >
        <div className="flex items-start gap-3">
          {isNested && (
            <button
              onClick={() => toggleExpand(field.id)}
              className="mt-2 text-slate-500 hover:text-blue-600"
            >
              {field.expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}

          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-600">Field Name</Label>
                <Input
                  value={field.name}
                  onChange={(e) =>
                    updateField(field.id, { name: e.target.value }, parentId)
                  }
                  placeholder="fieldName"
                  className="mt-1 border-blue-200 focus:border-blue-400"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-600">Type</Label>
                <select
                  value={field.type}
                  onChange={(e) =>
                    updateField(
                      field.id,
                      {
                        type: e.target.value as any,
                        mode: "static",
                        value: undefined,
                      },
                      parentId,
                    )
                  }
                  className="mt-1 w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                </select>
              </div>

              {field.type !== "object" && (
                <div>
                  <Label className="text-xs text-slate-600">Mode</Label>
                  <select
                    value={field.mode}
                    onChange={(e) =>
                      updateField(
                        field.id,
                        { mode: e.target.value as any },
                        parentId,
                      )
                    }
                    className="mt-1 w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400"
                  >
                    <option value="static">Static</option>
                    <option value="random">Random</option>
                    <option value="incremental">Incremental</option>
                    <option value="timestamp">Timestamp</option>
                  </select>
                </div>
              )}
            </div>

            {field.mode === "static" && field.type === "string" && (
              <div>
                <Label className="text-xs text-slate-600">Value</Label>
                <Input
                  value={field.value || ""}
                  onChange={(e) =>
                    updateField(field.id, { value: e.target.value }, parentId)
                  }
                  placeholder="Enter value"
                  className="mt-1 border-blue-200 focus:border-blue-400"
                />
              </div>
            )}

            {field.mode === "static" && field.type === "number" && (
              <div>
                <Label className="text-xs text-slate-600">Value</Label>
                <Input
                  type="number"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    updateField(
                      field.id,
                      { value: Number(e.target.value) },
                      parentId,
                    )
                  }
                  placeholder="Enter number"
                  className="mt-1 border-blue-200 focus:border-blue-400"
                />
              </div>
            )}

            {field.mode === "static" && field.type === "boolean" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.value ?? false}
                  onChange={(e) =>
                    updateField(field.id, { value: e.target.checked }, parentId)
                  }
                  className="w-4 h-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                />
                <Label className="text-sm text-slate-700">Value</Label>
              </div>
            )}

            {field.mode === "random" && field.type === "number" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Min</Label>
                  <Input
                    type="number"
                    value={field.min ?? 0}
                    onChange={(e) =>
                      updateField(
                        field.id,
                        { min: Number(e.target.value) },
                        parentId,
                      )
                    }
                    className="mt-1 border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Max</Label>
                  <Input
                    type="number"
                    value={field.max ?? 100}
                    onChange={(e) =>
                      updateField(
                        field.id,
                        { max: Number(e.target.value) },
                        parentId,
                      )
                    }
                    className="mt-1 border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
            )}

            {field.mode === "incremental" && field.type === "string" && (
              <div>
                <Label className="text-xs text-slate-600">Prefix</Label>
                <Input
                  value={field.value || ""}
                  onChange={(e) =>
                    updateField(field.id, { value: e.target.value }, parentId)
                  }
                  placeholder="item"
                  className="mt-1 border-blue-200 focus:border-blue-400"
                />
              </div>
            )}

            {field.mode === "incremental" && field.type === "number" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Start</Label>
                  <Input
                    type="number"
                    value={field.min ?? 0}
                    onChange={(e) =>
                      updateField(
                        field.id,
                        { min: Number(e.target.value) },
                        parentId,
                      )
                    }
                    className="mt-1 border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Max</Label>
                  <Input
                    type="number"
                    value={field.max ?? 100}
                    onChange={(e) =>
                      updateField(
                        field.id,
                        { max: Number(e.target.value) },
                        parentId,
                      )
                    }
                    className="mt-1 border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
            )}

            {field.type === "array" && (
              <div>
                <Label className="text-xs text-slate-600">Array Length</Label>
                <Input
                  type="number"
                  value={field.value ?? 3}
                  onChange={(e) =>
                    updateField(
                      field.id,
                      { value: Number(e.target.value) },
                      parentId,
                    )
                  }
                  min={1}
                  className="mt-1 border-blue-200 focus:border-blue-400"
                />
              </div>
            )}

            {isNested && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addField(field.id)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Child Field
                </Button>
              </div>
            )}
          </div>

          <button
            onClick={() => deleteField(field.id, parentId)}
            className="mt-2 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {isNested &&
          field.expanded &&
          field.children &&
          field.children.length > 0 && (
            <div className="mt-3 space-y-2">
              {field.children.map((child) =>
                renderField(child, field.id, depth + 1),
              )}
            </div>
          )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Payload Builder</h1>
          <p className="text-slate-600 mt-1">
            Create and manage IoT payload structures
          </p>
        </div>
        <Button
          onClick={() => router.push("/projects")}
          variant="outline"
          className="border-blue-200 text-slate-700 hover:bg-blue-50"
        >
          Back to Projects
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="bg-white border-blue-100 shadow-md">
            <CardHeader className="border-b border-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-500" />
                  Field Configuration
                </CardTitle>
                <Button
                  onClick={() => addField()}
                  size="sm"
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 max-h-[600px] overflow-y-auto">
              {fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileJson className="h-16 w-16 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-600 font-medium">
                    No fields yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &quot;Add Field&quot; to start building your payload
                  </p>
                </div>
              ) : (
                <div>{fields.map((field) => renderField(field))}</div>
              )}
            </CardContent>
          </Card>

          {projectId && (
            <Card className="bg-white border-blue-100 shadow-md">
              <CardHeader className="border-b border-blue-50">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Save className="h-5 w-5 text-blue-500" />
                  Save Template
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-slate-700">
                      Template Name
                    </Label>
                    <Input
                      value={payloadName}
                      onChange={(e) => setPayloadName(e.target.value)}
                      placeholder="e.g., Temperature Sensor Payload"
                      className="mt-1 border-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <Button
                    onClick={saveTemplate}
                    disabled={
                      saving || !payloadName.trim() || fields.length === 0
                    }
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  >
                    {saving ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="bg-white border-blue-100 shadow-md">
            <CardHeader className="border-b border-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  Live Preview
                </CardTitle>
                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-slate-700 hover:bg-blue-50"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="bg-slate-50 border border-blue-100 rounded-lg p-4 max-h-[500px] overflow-auto">
                <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">
                  {JSON.stringify(preview, null, 2)}
                </pre>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Zap className="h-3 w-3" />
                <span>Preview updates automatically as you build</span>
              </div>
            </CardContent>
          </Card>

          {templates.length > 0 && (
            <Card className="bg-white border-blue-100 shadow-md">
              <CardHeader className="border-b border-blue-50">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-blue-500" />
                  Saved Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className="w-full text-left p-3 rounded-lg border border-blue-100 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {template.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <FileJson className="h-4 w-4 text-blue-500" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
