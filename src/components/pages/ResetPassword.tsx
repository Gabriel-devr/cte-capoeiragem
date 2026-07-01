"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Logo } from "../Logo";
import { CapoeiraCircle } from "../CapoeiraWave";
import { Lock, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { updatePassword } from "@/actions/user_data";
import { toast } from "sonner";

export function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    const res = await updatePassword(password);
    setLoading(false);
    
    if (res.result === "sucesso") {
      toast.success("Senha alterada com sucesso!");
      router.push("/dashboard");
    } else {
      toast.error("Erro ao alterar senha: " + res.details);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-32 left-32 w-56 h-56 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-32 right-32 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <CapoeiraCircle className="top-1/4 left-1/3 w-36 h-36" />
      <CapoeiraCircle className="bottom-1/3 right-1/4 w-32 h-32" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-white border border-border rounded-2xl shadow-xl p-6">
          <div className="flex justify-center mb-5">
            <Logo />
          </div>

          <h2 className="text-center text-foreground mb-1">
            Nova senha
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-5">
            Digite sua nova senha abaixo
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-input-background border-border text-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-input-background border-border text-foreground"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Alterar senha
            </Button>

            <div className="text-center">
              <Link
                href="/dashboard"
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                Voltar para o painel
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
