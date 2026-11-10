"use client";

import React, { useState, useMemo } from "react";
import {
  Menu,
  Search,
  Plus,
  Calendar,
  Wrench,
  DollarSign,
  FileText,
  ChevronDown,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type { ActiveModule } from "./sidebar";
import { useERP } from "@/lib/erp-context";
import { parseDate, formatDate, formatCurrency } from "@/lib/utils";

export type PeriodFilter = "este_mes" | "mes_passado" | "ultimos_3_meses" | "ano_atual" | "todos";

interface HeaderProps {
  activeModule: ActiveModule;
  onOpenMobile: () => void;
  period: PeriodFilter;
  onChangePeriod: (p: PeriodFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickAction: (action: "new_service" | "new_transaction" | "new_proposal") => void;
  onNavigate?: (module: ActiveModule) => void;
  onOpenService?: (serviceId: string) => void;
}

const moduleTitles: Record<ActiveModule, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard Operacional",
    subtitle: "Visão consolidada de caixa, serviços elétricos e rentabilidade",
  },
  calendar: {
    title: "Calendário de Obras & Escala de Equipe",
    subtitle: "Controle de eletricistas em campo, prazos de execução e agenda diária",
  },
  cashflow: {
    title: "Fluxo de Caixa & Finanças",
    subtitle: "Recebimentos de clientes, despesas operacionais e contas a pagar/receber",
  },
  services: {
    title: "Gestão de Serviços & Obras",
    subtitle: "Controle técnico, 9 abas de execução, formação de preços e custos reais",
  },
  customers: {
    title: "Carteira de Clientes",
    subtitle: "Pessoas Físicas e Jurídicas, condomínios, indústrias e histórico de obras",
  },
  collaborators: {
    title: "Controle de Colaboradores",
    subtitle: "Registro administrativo, controle de diárias, funções e custo de equipe",
  },
  suppliers: {
    title: "Fornecedores & Parceiros",
    subtitle: "Distribuidoras elétricas, locadoras de equipamentos e faturamentos",
  },
  proposals: {
    title: "Propostas Comerciais",
    subtitle: "Elaboração de orçamentos formais, PDF para WhatsApp e conversão em OS",
  },
  reports: {
    title: "Relatórios Gerenciais",
    subtitle: "DRE Operacional, rentabilidade por obra, exportação para Excel e impressão",
  },
  settings: {
    title: "Configurações da Empresa",
    subtitle: "Dados cadastrais, alíquotas fiscais, chave PIX e backup de banco de dados",
  },
};

interface NotificationItem {
  id: string;
  category: "overdue_payable" | "overdue_receivable" | "expiring_service" | "overdue_service" | "upcoming_payable";
  type: "financial" | "service";
  title: string;
  subtitle: string;
  urgency: "critical" | "warning";
  daysDiff: number; // negativo = atrasado, 0 = hoje, positivo = faltam dias
  amount?: number;
  serviceId?: string;
  dateStr: string;
}

export function Header({
  activeModule,
  onOpenMobile,
  period,
  onChangePeriod,
  searchQuery,
  onSearchChange,
  onQuickAction,
  onNavigate,
  onOpenService,
}: HeaderProps) {
  const { db } = useERP();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"todas" | "financial" | "service">("todas");

  const current = moduleTitles[activeModule] || { title: "NEXT GESTÃO", subtitle: "" };

  // 1. Cálculo Dinâmico do Mês e Data Real do Sistema / Internet
  const realToday = useMemo(() => new Date(), []);
  const currentMonthIdx = realToday.getMonth();
  const currentYear = realToday.getFullYear();

  const shortMonths = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const currentMonthLabel = `${shortMonths[currentMonthIdx]}/${currentYear}`;

  const prevMonthDate = useMemo(
    () => new Date(currentYear, currentMonthIdx - 1, 1),
    [currentYear, currentMonthIdx]
  );
  const prevMonthLabel = `${shortMonths[prevMonthDate.getMonth()]}/${prevMonthDate.getFullYear()}`;
  const currentYearLabel = `Ano ${currentYear} Inteiro`;

  // 2. Cálculo dos Alertas de Notificação (Contas Vencidas e Contratos/OS a Expirar)
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // A) Contas a Pagar e Contas a Receber (Transações Financeiras)
    for (const t of db.transactions) {
      if (t.status === "pendente") {
        const d = parseDate(t.dueDate || t.date);
        if (!d) continue;
        const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const daysDiff = Math.round((dDay - todayMs) / oneDayMs);

        if (t.type === "saida") {
          if (daysDiff < 0) {
            // Conta a pagar vencida (Crítico)
            list.push({
              id: `pay_overdue_${t.id}`,
              category: "overdue_payable",
              type: "financial",
              title: `Conta a Pagar Vencida: ${t.supplierName || t.description}`,
              subtitle: `Venceu há ${Math.abs(daysDiff)} dia(s) (${formatDate(t.dueDate || t.date)}) · ${t.category}`,
              urgency: "critical",
              daysDiff,
              amount: t.amount,
              dateStr: formatDate(t.dueDate || t.date),
            });
          } else if (daysDiff <= 5) {
            // Conta a pagar próxima do vencimento
            list.push({
              id: `pay_soon_${t.id}`,
              category: "upcoming_payable",
              type: "financial",
              title: `Conta a Pagar ${daysDiff === 0 ? "Vence Hoje" : `Vence em ${daysDiff}d`}: ${t.supplierName || t.description}`,
              subtitle: `Vencimento em ${formatDate(t.dueDate || t.date)} · ${t.category}`,
              urgency: "warning",
              daysDiff,
              amount: t.amount,
              dateStr: formatDate(t.dueDate || t.date),
            });
          }
        } else if (t.type === "entrada") {
          if (daysDiff < 0) {
            // Recebimento de cliente em atraso (Crítico)
            list.push({
              id: `rec_overdue_${t.id}`,
              category: "overdue_receivable",
              type: "financial",
              title: `Recebimento em Atraso: ${t.customerName || t.description}`,
              subtitle: `Atrasado há ${Math.abs(daysDiff)} dia(s) · Previsto: ${formatDate(t.dueDate || t.date)}`,
              urgency: "critical",
              daysDiff,
              amount: t.amount,
              dateStr: formatDate(t.dueDate || t.date),
            });
          }
        }
      }
    }

    // B) Contratos & Ordens de Serviço a Expirar ou com Prazo Vencido
    for (const s of db.services) {
      if (s.status !== "concluido" && s.status !== "cancelado") {
        const end = parseDate(s.expectedEndDate);
        if (!end) continue;
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        const daysDiff = Math.round((endDay - todayMs) / oneDayMs);

        if (daysDiff < 0) {
          // Prazo de entrega da OS expirado e não concluído
          list.push({
            id: `serv_overdue_${s.id}`,
            category: "overdue_service",
            type: "service",
            title: `Prazo Expirado: ${s.code} - ${s.title}`,
            subtitle: `Prazo encerrou há ${Math.abs(daysDiff)} dia(s) (${formatDate(s.expectedEndDate)}) · Cliente: ${s.customerName}`,
            urgency: "critical",
            daysDiff,
            amount: s.contractedValue,
            serviceId: s.id,
            dateStr: formatDate(s.expectedEndDate),
          });
        } else if (daysDiff <= 7) {
          // Contrato / OS a expirar nos próximos 7 dias
          list.push({
            id: `serv_expiring_${s.id}`,
            category: "expiring_service",
            type: "service",
            title: `Contrato a Expirar (${daysDiff === 0 ? "Hoje" : `${daysDiff}d`}): ${s.code}`,
            subtitle: `Entrega prevista: ${formatDate(s.expectedEndDate)} · ${s.title}`,
            urgency: "warning",
            daysDiff,
            amount: s.contractedValue,
            serviceId: s.id,
            dateStr: formatDate(s.expectedEndDate),
          });
        }
      }
    }

    // Ordenação: primeiro os com maior atraso (daysDiff mais negativo), depois alertas próximos
    return list.sort((a, b) => a.daysDiff - b.daysDiff);
  }, [db.transactions, db.services]);

  const criticalCount = notifications.filter((n) => n.urgency === "critical").length;
  const warningCount = notifications.filter((n) => n.urgency === "warning").length;
  const totalAlerts = notifications.length;

  const filteredNotifications = useMemo(() => {
    if (notificationTab === "financial") {
      return notifications.filter((n) => n.type === "financial");
    }
    if (notificationTab === "service") {
      return notifications.filter((n) => n.type === "service");
    }
    return notifications;
  }, [notifications, notificationTab]);

  const handleNotificationAction = (item: NotificationItem) => {
    setNotificationOpen(false);
    if (item.type === "service" && item.serviceId && onOpenService) {
      onOpenService(item.serviceId);
    } else if (item.type === "financial" && onNavigate) {
      onNavigate("cashflow");
    } else if (item.type === "service" && onNavigate) {
      onNavigate("services");
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xs border-b border-slate-800 px-4 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Left zone: Mobile toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base lg:text-lg font-bold text-slate-100 tracking-tight leading-tight">
            {current.title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right zone: Filters, Search, Notification Bell & Quick Action button */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {/* Search */}
        <div className="relative flex-1 sm:w-52">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar serviço, cliente, NF..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Dynamic Period filter dropdown (Vinculado ao dia e mês real da Internet) */}
        <div className="relative flex items-center">
          <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
          <select
            value={period}
            onChange={(e) => onChangePeriod(e.target.value as PeriodFilter)}
            title="Filtrar dados pelo período contábil real"
            className="bg-slate-950/80 border border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-slate-200 focus:outline-hidden focus:border-amber-500 transition-colors appearance-none cursor-pointer"
          >
            <option value="este_mes">Este Mês ({currentMonthLabel})</option>
            <option value="mes_passado">Mês Anterior ({prevMonthLabel})</option>
            <option value="ultimos_3_meses">Últimos 3 Meses</option>
            <option value="ano_atual">{currentYearLabel}</option>
            <option value="todos">Todo o Histórico</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-slate-400 pointer-events-none" />
        </div>

        {/* Notification Bell Badge (Alertas de Contratos a Expirar e Contas Vencidas) */}
        <div className="relative">
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className={`relative p-2 rounded-lg border transition-colors ${
              totalAlerts > 0
                ? "bg-slate-950/90 border-slate-700/90 text-slate-200 hover:text-white hover:border-slate-600"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title={
              totalAlerts > 0
                ? `${totalAlerts} alerta(s) de contratos e pagamentos pendentes`
                : "Sem notificações pendentes"
            }
            aria-label="Abrir central de notificações"
          >
            <Bell className="w-4 h-4" />

            {/* Badge contador */}
            {totalAlerts > 0 && (
              <>
                {criticalCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full animate-ping opacity-60 pointer-events-none" />
                )}
                <span
                  className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-mono font-bold rounded-full px-1 border-2 border-slate-900 shadow-xs ${
                    criticalCount > 0
                      ? "bg-rose-500 text-white"
                      : "bg-amber-500 text-slate-950"
                  }`}
                >
                  {totalAlerts > 99 ? "99+" : totalAlerts}
                </span>
              </>
            )}
          </button>

          {/* Dropdown Popover de Notificações */}
          {notificationOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotificationOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-84 sm:w-96 max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header da Notificação */}
                <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span>Central de Notificações</span>
                      </h3>
                      {totalAlerts > 0 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                          {totalAlerts} alerta{totalAlerts > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Contratos a expirar e pagamentos vencidos/próximos
                    </p>
                  </div>
                  <button
                    onClick={() => setNotificationOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Filtros da Central */}
                <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center gap-1.5 text-[11px]">
                  <button
                    onClick={() => setNotificationTab("todas")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      notificationTab === "todas"
                        ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Todas ({totalAlerts})
                  </button>
                  <button
                    onClick={() => setNotificationTab("financial")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      notificationTab === "financial"
                        ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Financeiro ({notifications.filter((n) => n.type === "financial").length})
                  </button>
                  <button
                    onClick={() => setNotificationTab("service")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      notificationTab === "service"
                        ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Obras & Contratos ({notifications.filter((n) => n.type === "service").length})
                  </button>
                </div>

                {/* Lista de Alertas */}
                <div className="overflow-y-auto max-h-[380px] p-2 space-y-2 divide-y divide-slate-800/40">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-semibold text-slate-200">
                        Nenhuma pendência crítica encontrada!
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                        Todas as contas e prazos de contratos de obras estão em conformidade.
                      </p>
                    </div>
                  ) : (
                    filteredNotifications.map((item) => {
                      const isCritical = item.urgency === "critical";
                      return (
                        <div
                          key={item.id}
                          className={`pt-2 first:pt-0 p-2.5 rounded-lg border transition-all ${
                            isCritical
                              ? "bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60"
                              : "bg-amber-950/15 border-amber-900/40 hover:border-amber-700/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <div
                                className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                                  isCritical
                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {isCritical ? (
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-sm ${
                                      item.category === "overdue_payable"
                                        ? "bg-rose-500/30 text-rose-300"
                                        : item.category === "overdue_receivable"
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : item.category === "overdue_service"
                                        ? "bg-rose-500/30 text-rose-300"
                                        : "bg-amber-500/25 text-amber-300"
                                    }`}
                                  >
                                    {item.category === "overdue_payable" && "Conta a Pagar Vencida"}
                                    {item.category === "overdue_receivable" && "Recebimento Atrasado"}
                                    {item.category === "upcoming_payable" && "Vence em Breve"}
                                    {item.category === "overdue_service" && "Prazo de Obra Expirado"}
                                    {item.category === "expiring_service" && "Contrato a Expirar"}
                                  </span>
                                  {item.amount !== undefined && item.amount > 0 && (
                                    <span className="font-mono text-[11px] font-semibold text-slate-200">
                                      {formatCurrency(item.amount)}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs font-semibold text-slate-100 mt-1 leading-snug truncate">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Ação rápida direta */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.daysDiff < 0
                                ? `Vencido há ${Math.abs(item.daysDiff)}d`
                                : item.daysDiff === 0
                                ? "Vence hoje"
                                : `Faltam ${item.daysDiff}d`}
                            </span>
                            <button
                              onClick={() => handleNotificationAction(item)}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${
                                isCritical
                                  ? "text-rose-300 hover:bg-rose-900/30"
                                  : "text-amber-300 hover:bg-amber-900/30"
                              }`}
                            >
                              <span>
                                {item.type === "service" ? "Abrir Obra" : "Ver no Caixa"}
                              </span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer com resumo rápido */}
                <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {criticalCount > 0
                      ? `${criticalCount} pendência(s) crítica(s)`
                      : "Sem pendências críticas"}
                  </span>
                  {onNavigate && (
                    <button
                      onClick={() => {
                        setNotificationOpen(false);
                        onNavigate("cashflow");
                      }}
                      className="text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      Ir para Financeiro →
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick action CTA with dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Criar</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 p-1 space-y-1">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onQuickAction("new_service");
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Nova Ordem de Serviço</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onQuickAction("new_transaction");
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Novo Lançamento Financeiro</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onQuickAction("new_proposal");
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Nova Proposta Comercial</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
