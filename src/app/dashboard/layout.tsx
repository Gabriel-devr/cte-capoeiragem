"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin, profileError, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só força logoff quando temos CONFIRMAÇÃO de que o usuário não é admin.
    // Se profileError, a busca do profile falhou de forma transitória (rede/servidor)
    // e não deve ser interpretada como "não é admin" — isso derrubava admins de verdade
    // no login por causa de falhas passageiras.
    if (!loading && !isAdmin && !profileError) {
      toast.error("Acesso restrito a administradores.");
      logout().finally(() => router.replace("/"));
    }
  }, [loading, isAdmin, profileError, logout, router]);

  if (loading) {
    return null;
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Não foi possível confirmar seus dados. Recarregue a página.
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
