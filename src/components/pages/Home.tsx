"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Calendar, User as UserIcon, ArrowRight, Loader2, Newspaper } from "lucide-react";
import Link from "next/link";
import { ImageWithFallback } from "../fallback/ImageWithFallback";
import { useAuth } from "../../contexts/AuthContext";
import { listNewsletters } from "@/actions/newsletter_data";

interface Newsletter {
  id: string | number;
  title: string;
  date: string;
  author: string;
  category: string;
  image: string;
  excerpt: string;
}

export function Home() {
  const { user } = useAuth();
  const [latestNewsletter, setLatestNewsletter] = useState<Newsletter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      setIsLoading(true);
      try {
        const res = await listNewsletters();
        if (res.result === "sucesso" && res.data && res.data.length > 0) {
          setLatestNewsletter(res.data[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar a newsletter:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLatest();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-primary rounded-2xl p-12 shadow-xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white mb-4">
            Olá, {user?.name || "Capoeirista"}!
          </h1>
          <p className="text-xl text-white/90">
            Bem-vindo ao seu espaço de movimento e cultura
          </p>
        </div>

        <svg
          className="absolute bottom-0 left-0 w-full opacity-10"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          style={{ height: "80px" }}
        >
          <path
            fill="#ffffff"
            d="M0,32 C240,96 480,64 720,64 C960,64 1200,96 1440,32 L1440,120 L0,120 Z"
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Newspaper className="text-accent w-8 h-8" />
          Última Newsletter
        </h2>

        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-card/50">
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
            <p className="text-muted-foreground animate-pulse">Buscando as novidades da roda...</p>
          </div>
        ) : latestNewsletter ? (
          <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group">
            <div className="relative h-72 overflow-hidden">
              <ImageWithFallback
                src={latestNewsletter.image}
                alt={latestNewsletter.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="p-8">
              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(latestNewsletter.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>{latestNewsletter.author}</span>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors">
                {latestNewsletter.title}
              </h3>

              <p className="text-base text-muted-foreground mb-6 leading-relaxed line-clamp-3">
                {latestNewsletter.excerpt}
              </p>

              <div className="flex items-center justify-between">
                <span className="inline-block px-4 py-1 bg-accent/10 text-accent rounded-full text-sm font-semibold">
                  {latestNewsletter.category}
                </span>
                <Link href="/dashboard/newsletter" className="flex items-center gap-2 text-accent font-bold hover:underline">
                  Ler mais <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-card/50">
            <p className="text-muted-foreground">Nenhuma notícia publicada ainda.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}