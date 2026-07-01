"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Logo } from "../Logo";
import { CapoeiraCircle } from "../CapoeiraWave";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { resetPasswordForEmail } from "@/actions/user_data";
import { toast } from "sonner";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await resetPasswordForEmail(email);
    setLoading(false);
    
    if (res.result === "sucesso") {
      setSent(true);
    } else {
      toast.error("Erro ao solicitar redefinição: " + res.details);
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
            Recuperar senha
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-5">
            Digite seu email para receber instruções
          </p>

          {sent ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 p-6 bg-accent/10 border border-accent/20 rounded-lg">
                <CheckCircle className="w-12 h-12 text-accent" />
                <p className="text-foreground text-center">
                  Email enviado com sucesso!
                </p>
                <p className="text-muted-foreground text-sm text-center">
                  Verifique sua caixa de entrada e siga as instruções para
                  redefinir sua senha.
                </p>
              </div>

              <Link href="/" className="block">
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  Voltar para o login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 bg-input-background border-border text-foreground"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Redefinir senha
              </Button>

              <div className="text-center">
                <Link
                  href="/"
                  className="text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  ← Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}