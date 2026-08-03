"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  FileText,
  MessageSquare,
  MessagesSquare,
  User,
  LogOut,
  Users,
  DollarSign,
  CalendarCheck,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const menuItems = [
    { path: "/dashboard", icon: Home, label: "Home" },
    { path: "/dashboard/students", icon: Users, label: "Gestão de alunos" },
    { path: "/dashboard/matriculas", icon: ClipboardList, label: "Matrículas" },
    { path: "/dashboard/plans", icon: CalendarCheck, label: "Planos e produtos" },
    { path: "/dashboard/financial", icon: DollarSign, label: "Financeiro" },
    { path: "/dashboard/mensagens", icon: MessagesSquare, label: "Mensagens" },
    { path: "/dashboard/newsletter", icon: FileText, label: "Informativo" },
    { path: "/dashboard/ai-assistant", icon: MessageSquare, label: "IA assistant" },
    { path: "/dashboard/account", icon: User, label: "Minha conta" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed h-screen z-50 flex flex-col
          w-64 bg-white border-r border-border
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="relative py-6 border-b border-border flex items-center justify-center overflow-hidden bg-[#333333]">
          <Logo compact negative />
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted text-muted-foreground md:hidden shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    prefetch={false}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                      isActive
                        ? "bg-[#FFCC00] text-[#1a1a1a] shadow-sm"
                        : "text-foreground hover:bg-[#FFCC00] hover:text-[#1a1a1a]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-border">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-foreground hover:bg-destructive hover:text-destructive-foreground px-3 py-2.5 text-sm h-auto"
          >
            <LogOut className="w-4 h-4 mr-3 shrink-0" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Header mobile */}
        <header className="sticky top-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center gap-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted text-foreground shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-foreground tracking-wide">CTE Capoeiragem · Admin</span>
        </header>

        <main
          className="flex-1 p-4 sm:p-6 lg:p-8 bg-repeat"
          style={{ backgroundImage: "url('/BG2.png')", backgroundSize: "480px auto" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
