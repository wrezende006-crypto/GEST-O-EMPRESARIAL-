"use client";

import React from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Wrench,
  Users,
  HardHat,
  Truck,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Lock,
  Zap,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";

export type ActiveModule =
  | "dashboard"
  | "calendar"
  | "cashflow"
  | "services"
  | "customers"
  | "collaborators"
  | "suppliers"
  | "proposals"
  | "reports"
  | "settings";

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeModule,
  onSelectModule,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { db, logout } = useERP();

  const navItems: { id: ActiveModule; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "calendar",
      label: "Calendário & Escala",
      icon: Calendar,
      badge: db.services.filter((s) => s.status === "em_andamento").length,
    },
    {
      id: "cashflow",
      label: "Fluxo de Caixa",
      icon: Wallet,
      badge: db.transactions.filter((t) => t.status === "pendente").length,
    },
    {
      id: "services",
      label: "Serviços & Obras",
      icon: Wrench,
      badge: db.services.filter((s) => s.status === "em_andamento").length,
    },
    { id: "customers", label: "Clientes", icon: Users },
    { id: "collaborators", label: "Colaboradores", icon: HardHat },
    { id: "suppliers", label: "Fornecedores", icon: Truck },
    {
      id: "proposals",
      label: "Propostas Comerciais",
      icon: FileSpreadsheet,
      badge: db.proposals.filter((p) => p.status === "aguardando_aprovacao" || p.status === "enviada").length,
    },
    { id: "reports", label: "Relatórios Gerenciais", icon: BarChart3 },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  const handleSelect = (id: ActiveModule) => {
    onSelectModule(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-amber-500/30 shrink-0 flex items-center justify-center p-0.5 shadow-xs">
                {db.settings.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={db.settings.logoUrl}
                    alt={db.settings.companyName || "Logo"}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Zap className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 tracking-tight text-base whitespace-nowrap truncate max-w-[150px]">
                  {db.settings.companyName?.trim() || "NEXT GESTÃO"}
                </span>
                <span className="text-[11px] text-amber-400/90 font-medium tracking-wide uppercase truncate max-w-[150px]">
                  {db.settings.tradeName?.trim() || "Serviços Elétricos"}
                </span>
              </div>
            </div>
          </div>

          {/* Nav menu */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? "bg-amber-500/20 text-amber-300 font-semibold"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom user / lock info */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700 flex items-center justify-center text-slate-300">
                {db.settings.adminName?.trim() ? (
                  <span className="text-xs font-bold font-mono text-amber-400">
                    {db.settings.adminName
                      .trim()
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                ) : (
                  <Users className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {db.settings.adminName?.trim() || "Administrador (Sem nome)"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {db.settings.adminRole?.trim() || "Definir em Configurações"}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Bloquear sessão do sistema"
              className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors shrink-0"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>ERP Operacional</span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">v2.4 BR</span>
          </div>
        </div>
      </aside>
    </>
  );
}
