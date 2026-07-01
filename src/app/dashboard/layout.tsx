"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Acesso restrito a administradores.");
      logout().finally(() => router.replace("/"));
    }
  }, [loading, isAdmin, logout, router]);

  if (loading || !isAdmin) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
