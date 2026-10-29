"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cpu, ArrowRight, ShieldCheck, Activity } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Authentication failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:20px_20px] p-4">
      {/* Precision Frame Container */}
      <div className="w-full max-w-md">
        {/* Terminal Header Info */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
              NODE_AUTH // GATEWAY_ONLINE
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300/50">
            TLS_v1.3 // SHA256
          </span>
        </div>

        {/* Industrial Login Console */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Card Top Banner */}
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  IoTKit Studio
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                    CORE
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Industrial Telemetry &amp; Simulation Engine
                </p>
              </div>
            </div>
            <Activity className="h-4 w-4 text-slate-400" />
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-slate-600 font-medium">
                    Operator Identity / Email
                  </Label>
                  <span className="font-mono text-[10px] text-slate-400">RFC 5322</span>
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="operator@iotkit.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 bg-white font-mono text-xs border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-slate-600 font-medium">
                    Access Token / Password
                  </Label>
                  <span className="font-mono text-[10px] text-slate-400">ENCRYPTED</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 bg-white font-mono text-xs border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50/80 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                  <span className="font-mono">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <span>AUTHENTICATE OPERATOR</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Unprovisioned node?</span>
              <Link
                href="/register"
                className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                REGISTER_NEW_OPERATOR &rarr;
              </Link>
            </div>
          </div>

          {/* Sub-footer status bar */}
          <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              RBAC PROTECTED
            </span>
            <span>BACKEND: GO FIBER // :4000</span>
          </div>
        </div>

        {/* Global Footer */}
        <div className="mt-6 text-center font-mono text-[11px] text-slate-400">
          IoTKit Studio &bull; Precision Industrial Simulation Suite &bull; 2026
        </div>
      </div>
    </div>
  );
}
