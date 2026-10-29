"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const verify = async () => {
      try {
        await checkAuth();
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };
    verify();
    return () => {
      mounted = false;
    };
  }, [checkAuth]);

  useEffect(() => {
    if (!checking) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [checking, isAuthenticated, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">
          CONNECTING_GATEWAY // DISPATCHING_ROUTE...
        </span>
      </div>
    </div>
  );
}
