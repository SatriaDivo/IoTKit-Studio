"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Upload, Trash2, FileText, Loader2 } from "lucide-react";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [moduleName, setModuleName] = useState("");
  const [datasetName, setDatasetName] = useState("");

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/datasets");
      setDatasets(res.data.datasets || []);
    } catch (error) {
      toast.error("Failed to fetch datasets");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file");
    
    setUploading(true);
    
    try {
      const text = await file.text();
      
      await api.post("/datasets/upload", {
        fileName: file.name,
        moduleName: moduleName.trim() || "global",
        content: text,
        name: datasetName
      });
      
      toast.success("Dataset uploaded successfully");
      setFile(null);
      setDatasetName("");
      fetchDatasets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to upload dataset");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    
    try {
      await api.delete(`/datasets/${id}`);
      toast.success("Dataset deleted");
      fetchDatasets();
    } catch (error) {
      toast.error("Failed to delete dataset");
    }
  };

  const handleRename = async (id: string, currentName: string) => {
    const newName = window.prompt("Enter new dataset name:", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;

    try {
      await api.put(`/datasets/${id}/name`, { name: newName });
      toast.success("Dataset renamed successfully");
      fetchDatasets();
    } catch (error) {
      toast.error("Failed to rename dataset");
    }
  };

  const formatBytes = (bytes: string | number) => {
    const num = Number(bytes);
    if (num === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="h-8 w-8 text-blue-500" />
            Dataset Management
          </h1>
          <p className="text-slate-600 mt-1">
            Upload CSV datasets to replay historical data during simulation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Form */}
        <Card className="col-span-1 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Dataset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dataset Name (Optional)</label>
              <Input
                type="text"
                placeholder="Leave blank to use filename"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category / Tag (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. weather, factory, global"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CSV File</label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer h-auto py-2 file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 text-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">Max recommended size: 50MB</p>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-blue-500 to-sky-500 text-white"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Dataset</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Dataset List */}
        <Card className="col-span-1 md:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Available Datasets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            ) : datasets.length === 0 ? (
              <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No datasets uploaded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Module / File</th>
                      <th className="px-4 py-3">Rows</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Uploaded</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((dataset) => (
                      <tr key={dataset.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{dataset.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">File: {dataset.fileName} • Category: <span className="uppercase">{dataset.moduleName}</span></div>
                        </td>
                        <td className="px-4 py-3">{dataset.loadedRows.toLocaleString()}</td>
                        <td className="px-4 py-3">{formatBytes(dataset.fileSizeBytes)}</td>
                        <td className="px-4 py-3">
                          {new Date(dataset.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 mr-1"
                            onClick={() => handleRename(dataset.id, dataset.name)}
                            title="Rename Dataset"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(dataset.id)}
                            title="Delete Dataset"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
