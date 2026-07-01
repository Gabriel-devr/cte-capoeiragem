"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Logo } from "../Logo";
import { CapoeiraCircle } from "../CapoeiraWave";
import { Lock, Mail, User, Calendar, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpFormData } from "@/utils/validators";
import { createUser } from "@/actions/user_data";
import { toast } from "sonner";
import { formatDateInput, toISODate } from "@/utils/formatters";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

export function SignUp() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      full_name: "",
      birth_date: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const handleFormattedChange = (fieldToUpdate: any, formatter: (val: string) => string) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatter(e.target.value);
      form.setValue(fieldToUpdate, formatted);
    };
  };

  const onSubmit = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, birth_date: toISODate(data.birth_date) };
      const res = await createUser(
        payload.full_name,
        payload.birth_date,
        payload.email,
        payload.password
      );

      if (res.result === "sucesso") {
        toast.success("Conta criada com sucesso!", {
          description: "Verifique seu e-mail para confirmar a conta antes de fazer login.",
          duration: 10000,
        });
        router.push("/");
      } else {
        toast.error("Erro ao criar conta: " + res.details);
      }
    } catch (err) {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-10 right-20 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <CapoeiraCircle className="top-1/3 left-1/3 w-40 h-40" />
      <CapoeiraCircle className="bottom-1/4 right-1/3 w-28 h-28" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10 my-4"
      >
        <div className="bg-white border border-border rounded-2xl shadow-xl p-6">
          <div className="flex justify-center mb-5">
            <Logo />
          </div>

          <h2 className="text-center text-foreground mb-5">
            Crie sua conta
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="João Silva"
                          className="pl-10 bg-input-background border-border text-foreground"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="DD/MM/AAAA"
                          className="pl-10 bg-input-background border-border text-foreground"
                          onChange={handleFormattedChange("birth_date", formatDateInput)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10 bg-input-background border-border text-foreground"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-input-background border-border text-foreground"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-input-background border-border text-foreground"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-4 min-h-[44px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Criar conta"
                )}
              </Button>

              <div className="text-center">
                <span className="text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                </span>
                <Link
                  href="/"
                  className="text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  Fazer login
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
}
