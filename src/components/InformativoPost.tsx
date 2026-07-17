"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
} from "lucide-react";
import { ImageWithFallback } from "./fallback/ImageWithFallback";

interface Newsletter {
  id: string | number;
  title: string;
  date: string;
  author: string;
  category: string;
  image: string;
  excerpt: string;
}

interface InformativoPostProps {
  newsletter: Newsletter;
  readMoreHref?: string;
  truncateExcerpt?: boolean;
  headerActions?: React.ReactNode;
  imageBadge?: React.ReactNode;
}

export function InformativoPost({ newsletter, readMoreHref, truncateExcerpt, headerActions, imageBadge }: InformativoPostProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-xl mx-auto w-full bg-card border border-border rounded-md overflow-hidden shadow-sm">
      {/* Cabeçalho do post */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-accent to-primary p-[2px] shrink-0">
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
              <Newspaper className="w-4 h-4 text-accent" />
            </div>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">{newsletter.author}</p>
            <p className="text-xs text-muted-foreground">{newsletter.category}</p>
          </div>
        </div>
        {headerActions ?? <MoreHorizontal className="w-5 h-5 text-muted-foreground" />}
      </div>

      {/* Imagem quadrada */}
      <div className="relative w-full aspect-square overflow-hidden bg-black/5">
        <ImageWithFallback
          src={newsletter.image}
          alt={newsletter.title}
          className="w-full h-full object-cover"
        />
        {imageBadge && <div className="absolute top-3 left-3">{imageBadge}</div>}
      </div>

      {/* Barra de ações */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            aria-label="Curtir"
            className="transition-transform active:scale-90"
          >
            <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
          </button>
          <MessageCircle className="w-6 h-6 text-foreground" />
          <Send className="w-6 h-6 text-foreground" />
        </div>
        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          aria-label="Salvar"
          className="transition-transform active:scale-90"
        >
          <Bookmark className={`w-6 h-6 ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} />
        </button>
      </div>

      {/* Legenda */}
      <div className="px-4 pt-3 pb-1 text-sm text-foreground">
        <span className="font-semibold mr-1">{newsletter.author}</span>
        <span className="font-semibold">{newsletter.title}</span>
      </div>

      <p className={`px-4 text-sm text-muted-foreground leading-relaxed ${truncateExcerpt ? "line-clamp-2" : ""}`}>
        {newsletter.excerpt}
      </p>

      {readMoreHref && (
        <Link href={readMoreHref} className="px-4 inline-block text-sm text-muted-foreground hover:text-accent pt-1">
          Ver mais
        </Link>
      )}

      <p className="px-4 pt-2 pb-4 text-[11px] uppercase tracking-wide text-muted-foreground">
        {new Date(newsletter.date).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
      </p>
    </div>
  );
}
