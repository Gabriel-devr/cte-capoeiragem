"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import { getUser, ensureUserSetup } from "@/actions/user_data";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const mapSupabaseUser = (sbUser: SupabaseUser | null): UserProfile | null => {
    if (!sbUser) return null;
    return {
      id: sbUser.id,
      name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || "Usuário",
      email: sbUser.email || "",
      role: "user",
    };
  };

  const fetchRealProfile = async (sbUser: SupabaseUser) => {
    try {
      const response = await getUser();
      if (response.result === "sucesso" && response.profile) {
        setUser({
          id: sbUser.id,
          name: response.profile.full_name || mapSupabaseUser(sbUser)?.name || "Usuário",
          email: sbUser.email || "",
          role: response.profile.role || "user",
        });
      } else {
        // Profile não encontrado: cria profile + student automaticamente (primeiro login)
        await ensureUserSetup(
          sbUser.id,
          sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'Usuário',
          sbUser.user_metadata?.birth_date || null,
          sbUser.email || ''
        );
        // Busca o profile recém-criado
        const retry = await getUser();
        if (retry.result === "sucesso" && retry.profile) {
          setUser({
            id: sbUser.id,
            name: retry.profile.full_name || mapSupabaseUser(sbUser)?.name || "Usuário",
            email: sbUser.email || "",
            role: retry.profile.role || "user",
          });
        } else {
          setUser(mapSupabaseUser(sbUser));
        }
      }
    } catch (error) {
      console.error("Erro ao buscar profile real:", error);
      setUser(mapSupabaseUser(sbUser));
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchRealProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchRealProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Logoff realizado com sucesso.");
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}