"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Database,
  Upload,
  Trash2,
  FileText,
  Loader2,
  Edit2,
  HardDrive,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { usePopupStore } from "@/store/popupStore";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [moduleName, setModuleName] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const confirm = usePopupStore((state) => state.confirm);
  const prompt = usePopupStore((state) => state.prompt);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/datasets");
      setDatasets(res.data.datasets || []);
    } catch {
      toast.error("Failed to fetch datasets");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a CSV file");

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return toast.error("File is too large. Maximum size is 50MB.");
    }

    setUploading(true);

    try {
      const text = await file.text();

      await api.post("/datasets/upload", {
        fileName: file.name,
        moduleName: moduleName.trim() || "global",
        content: text,
        name: datasetName,
      });

      toast.success("Dataset successfully ingested");
      setFile(null);
      setDatasetName("");
      setModuleName("");
      fetchDatasets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to upload dataset");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm(
      "Confirm permanent removal of this telemetry dataset?",
      "Purge Dataset"
    );
    if (!isConfirmed) return;

    try {
      await api.delete(`/datasets/${id}`);
      toast.success("Dataset removed from vault");
      fetchDatasets();
    } catch {
      toast.error("Failed to delete dataset");
    }
  };

  const handleRename = async (id: string, currentName: string) => {
    const newName = await prompt(
      "Enter new dataset identifier:",
      currentName,
      "Rename Dataset"
    );
    if (!newName || newName.trim() === "" || newName === currentName) return;

    try {
      await api.put(`/datasets/${id}/name`, { name: newName });
      toast.success("Dataset identifier updated");
      fetchDatasets();
    } catch {
      toast.error("Failed to update identifier");
    }
  };

  const formatBytes = (bytes: string | number) => {
    const num = Number(bytes);
    if (num === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalRows = datasets.reduce((acc, d) => acc + (d.loadedRows || 0), 0);
  const totalBytes = datasets.reduce((acc, d) => acc + (Number(d.fileSizeBytes) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Precision Instrument Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-md p-4 shadow-hairline">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-blue-50 text-blue-800 border border-blue-200">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Industrial Telemetry Dataset Vault
                </h1>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  REPLAY_READY
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">
                STORAGE: {datasets.length} REPOSITORIES{" // "}{totalRows.toLocaleString()} ROWS (
                {formatBytes(totalBytes)})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Form (4 cols) & Datasets Inventory (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Upload Form Station (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                INGEST_CSV_DATASET
              </span>
              <span className="font-mono text-[10px] text-[#64748B]">MAX 50MB</span>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  DATASET IDENTIFIER / LABEL
                </label>
                <input
                  type="text"
                  placeholder="e.g. Turbine_Vibration_2026"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave blank to use original filename
                </span>
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  CATEGORY / DOMAIN TAG
                </label>
                <input
                  type="text"
                  placeholder="e.g. power_grid, avionics, factory"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full h-8 px-2.5 font-sans border border-[#CBD5E1] rounded bg-white outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[#64748B] uppercase block mb-1">
                  CSV SOURCE FILE
                </label>
                <input
                  id="csv-file-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById("csv-file-upload")?.click()}
                    className="h-8 px-3 rounded border border-[#CBD5E1] bg-white text-xs font-mono font-medium text-[#475569] hover:bg-[#F8FAFC] shrink-0"
                  >
                    SELECT_FILE
                  </button>
                  <span className="text-xs font-mono text-slate-500 truncate min-w-0">
                    {file ? file.name : "No file chosen"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full h-8 inline-flex items-center justify-center gap-1.5 bg-[#0F172A] text-white rounded text-xs font-semibold hover:bg-[#1E293B] disabled:opacity-50 transition-all shadow-xs"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>INGESTING_RECORDS...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>Ingest Telemetry Records</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Datasets Inventory Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-md shadow-hairline overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[#0F172A]" />
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  REGISTERED_DATASET_ARCHIVE
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#64748B]">
                {datasets.length} REPOSITORIES
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                  LOADING_INVENTORY...
                </span>
              </div>
            ) : datasets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-mono text-xs space-y-2">
                <Database className="h-10 w-10 mx-auto opacity-25" />
                <p className="uppercase text-xs font-bold tracking-wider">
                  NO_DATASETS_REGISTERED
                </p>
                <p className="text-[11px] font-sans text-slate-400 max-w-sm mx-auto">
                  Upload CSV files from the panel on the left to replay historical IoT telemetry sequences in simulations.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[10px] font-mono text-[#64748B] uppercase">
                      <th className="py-2 px-3 font-semibold">IDENTIFIER / FILENAME</th>
                      <th className="py-2 px-3 font-semibold">CATEGORY</th>
                      <th className="py-2 px-3 font-semibold text-right">ROWS</th>
                      <th className="py-2 px-3 font-semibold text-right">SIZE</th>
                      <th className="py-2 px-3 font-semibold text-right">DATE</th>
                      <th className="py-2 px-3 font-semibold text-center w-20">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] font-mono">
                    {datasets.map((dataset) => (
                      <tr
                        key={dataset.id}
                        className="hover:bg-[#F8FAFC] transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#0F172A] font-sans">
                            {dataset.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                            {dataset.fileName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase border border-slate-200">
                            {dataset.moduleName || "global"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#0F172A] tabular-nums">
                          {dataset.loadedRows.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#64748B] tabular-nums">
                          {formatBytes(dataset.fileSizeBytes)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                          {new Date(dataset.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleRename(dataset.id, dataset.name)}
                              className="p-1 rounded text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                              title="Rename Identifier"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(dataset.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Purge Dataset"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
