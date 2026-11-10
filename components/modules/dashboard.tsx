"use client";

import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  parseDate,
  isSameMonthYear,
  formatMonthName,
  getServiceCostSummary,
} from "@/lib/utils";
import type { PeriodFilter } from "../layout/header";
import type { ActiveModule } from "../layout/sidebar";

interface DashboardProps {
  period: PeriodFilter;
  onNavigate: (module: ActiveModule) => void;
  onOpenService: (serviceId: string) => void;
  onQuickAction: (action: "new_service" | "new_transaction" | "new_proposal") => void;
}

export function Dashboard({
  period,
  onNavigate,
  onOpenService,
  onQuickAction,
}: DashboardProps) {
  const { db, deleteService } = useERP();

  // Controle de Mês Real da Internet / Sistema
  const realToday = useMemo(() => new Date(), []);
  const [manualOverride, setManualOverride] = useState<{
    year: number;
    month: number;
    allTime: boolean;
  } | null>(null);

  // Deriva o ano e mês atuais com base no seletor do Header ou override manual
  const { selectedYear, selectedMonth, useAllTime } = useMemo(() => {
    if (manualOverride) {
      return {
        selectedYear: manualOverride.year,
        selectedMonth: manualOverride.month,
        useAllTime: manualOverride.allTime,
      };
    }
    if (period === "mes_passado") {
      const prev = new Date(realToday.getFullYear(), realToday.getMonth() - 1, 1);
      return {
        selectedYear: prev.getFullYear(),
        selectedMonth: prev.getMonth(),
        useAllTime: false,
      };
    }
    if (period === "todos") {
      return {
        selectedYear: realToday.getFullYear(),
        selectedMonth: realToday.getMonth(),
        useAllTime: true,
      };
    }
    return {
      selectedYear: realToday.getFullYear(),
      selectedMonth: realToday.getMonth(),
      useAllTime: false,
    };
  }, [manualOverride, period, realToday]);

  // Navegação de mês
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setManualOverride({ year: selectedYear - 1, month: 11, allTime: false });
    } else {
      setManualOverride({ year: selectedYear, month: selectedMonth - 1, allTime: false });
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setManualOverride({ year: selectedYear + 1, month: 0, allTime: false });
    } else {
      setManualOverride({ year: selectedYear, month: selectedMonth + 1, allTime: false });
    }
  };

  const handleResetToRealMonth = () => {
    setManualOverride(null);
  };

  const handleToggleAllTime = () => {
    setManualOverride({
      year: selectedYear,
      month: selectedMonth,
      allTime: !useAllTime,
    });
  };

  // Cálculo das métricas financeiras filtradas pelo mês selecionado
  const metrics = useMemo(() => {
    const transactions = db.transactions.filter((t) => {
      if (useAllTime || period === "todos") return true;
      if (period === "ano_atual") {
        const d = parseDate(t.date);
        return d ? d.getFullYear() === selectedYear : false;
      }
      if (period === "ultimos_3_meses") {
        const d = parseDate(t.date);
        if (!d) return false;
        const diffMonths = (realToday.getFullYear() - d.getFullYear()) * 12 + (realToday.getMonth() - d.getMonth());
        return diffMonths >= 0 && diffMonths < 3;
      }
      return isSameMonthYear(t.date, selectedYear, selectedMonth);
    });

    // Realizadas
    const realIncomes = transactions.filter(
      (t) => t.type === "entrada" && t.status === "efetivado"
    );
    const realExpenses = transactions.filter(
      (t) => t.type === "saida" && t.status === "efetivado"
    );

    // Pendentes
    const pendingIncomes = transactions.filter(
      (t) => t.type === "entrada" && t.status === "pendente"
    );
    const pendingExpenses = transactions.filter(
      (t) => t.type === "saida" && t.status === "pendente"
    );

    const totalRealIncome = realIncomes.reduce((acc, t) => acc + t.amount, 0);
    const totalRealExpense = realExpenses.reduce((acc, t) => acc + t.amount, 0);
    const currentBalance = totalRealIncome - totalRealExpense;

    const totalPendingIncome = pendingIncomes.reduce((acc, t) => acc + t.amount, 0);
    const totalPendingExpense = pendingExpenses.reduce((acc, t) => acc + t.amount, 0);

    const netProfit = totalRealIncome - totalRealExpense;
    const margin = totalRealIncome > 0 ? (netProfit / totalRealIncome) * 100 : 0;

    // Métricas de Serviços
    const activeServices = db.services.filter((s) => s.status === "em_andamento");
    const completedServices = db.services.filter((s) => s.status === "concluido");
    const pendingServices = db.services.filter(
      (s) => s.status === "aguardando_aprovacao" || s.status === "orcamento"
    );
    const totalContracted = db.services.reduce((acc, s) => acc + (s.contractedValue || 0), 0);

    // Distribuição de custos por categoria
    const costDistribution: Record<string, number> = {};
    for (const exp of realExpenses) {
      const cat = exp.category || "Outros";
      costDistribution[cat] = (costDistribution[cat] || 0) + exp.amount;
    }

    // Colaboradores em campo
    const activeElectriciansCount = db.collaborators.filter((c) => c.status === "ativo").length;

    // Serviços com sumário
    const servicesWithMargins = db.services.map((s) => {
      const summary = getServiceCostSummary(s);
      return {
        ...s,
        summary,
      };
    });

    return {
      currentBalance,
      totalRealIncome,
      totalRealExpense,
      totalPendingIncome,
      totalPendingExpense,
      netProfit,
      margin,
      activeServices,
      completedServices,
      pendingServices,
      totalContracted,
      costDistribution,
      activeElectriciansCount,
      servicesWithMargins,
    };
  }, [
    db.transactions,
    db.services,
    db.collaborators,
    selectedYear,
    selectedMonth,
    useAllTime,
    period,
    realToday,
  ]);

  const totalCosts = Object.values(metrics.costDistribution).reduce((a, b) => a + b, 0);

  const categoryColors: Record<string, string> = {
    "Materiais elétricos": "#38bdf8",
    "Mão de obra e diárias": "#f59e0b",
    "Aluguel e condomínio operacional": "#a855f7",
    "Combustível e transporte": "#10b981",
    "Energia, água e internet": "#f97316",
    "Ferramentas e equipamentos": "#ec4899",
    "Impostos e tributos (Simples/ISS)": "#ef4444",
    "Despesas administrativas": "#64748b",
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner Moderno com Controle Mensal Real */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Painel Gerencial NEXT GESTÃO</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {realToday.toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Visão Executiva & Controle de Caixa
            </h1>
            <p className="text-xs text-slate-400">
              Acompanhamento integrado de serviços elétricos, custos operacionais e margens reais
            </p>
          </div>

          {/* Seletor do Mês Real / Internet */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-xl">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 text-center min-w-[130px]">
                <span className="block text-[10px] text-slate-400 uppercase font-mono font-medium">
                  {useAllTime ? "Período Geral" : "Mês em Análise"}
                </span>
                <span className="text-xs font-bold text-amber-300 font-mono capitalize">
                  {useAllTime ? "Todo o Histórico" : `${formatMonthName(selectedMonth)}/${selectedYear}`}
                </span>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-slate-800 pt-1.5 sm:pt-0 sm:pl-2">
              <button
                onClick={handleResetToRealMonth}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  !useAllTime &&
                  selectedMonth === realToday.getMonth() &&
                  selectedYear === realToday.getFullYear()
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                Mês Atual
              </button>
              <button
                onClick={handleToggleAllTime}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                  useAllTime
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                Tudo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid dos 4 Indicadores Financeiros Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Disponível em Caixa */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all rounded-xl p-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Saldo Líquido em Caixa</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-2xl font-mono font-bold tabular-nums tracking-tight ${
              metrics.currentBalance >= 0 ? "text-slate-100" : "text-rose-400"
            }`}
          >
            {formatCurrency(metrics.currentBalance)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Disponibilidade:</span>
            <span className="text-emerald-400 font-mono font-semibold">100% Efetivado</span>
          </div>
        </div>

        {/* Card 2: Entradas Realizadas */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Recebimentos no Mês</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums tracking-tight">
            {formatCurrency(metrics.totalRealIncome)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>A Receber (Pendente):</span>
            <span className="font-mono text-amber-300 font-semibold">
              {formatCurrency(metrics.totalPendingIncome)}
            </span>
          </div>
        </div>

        {/* Card 3: Saídas Efetivadas */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Despesas & Custos Pagos</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-rose-400 tabular-nums tracking-tight">
            {formatCurrency(metrics.totalRealExpense)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>A Pagar (Pendente):</span>
            <span className="font-mono text-rose-300 font-semibold">
              {formatCurrency(metrics.totalPendingExpense)}
            </span>
          </div>
        </div>

        {/* Card 4: Lucro Líquido & Margem */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Lucro Líquido Operacional</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-amber-300 tabular-nums tracking-tight">
            {formatCurrency(metrics.netProfit)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Margem Operacional:</span>
            <span
              className={`font-mono font-bold ${
                metrics.margin >= 30 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {formatNumber(metrics.margin)}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Faixa de Status Operacional e Atalhos Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate("services")}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-3.5 rounded-xl text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Obras em Andamento</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-100">
            {metrics.activeServices.length}
          </div>
          <span className="text-[10px] text-amber-400/90 font-medium group-hover:underline">
            Gerenciar Obras →
          </span>
        </button>

        <button
          onClick={() => onNavigate("calendar")}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-3.5 rounded-xl text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Eletricistas em Campo</span>
            <HardHat className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-100">
            {metrics.activeElectriciansCount}
          </div>
          <span className="text-[10px] text-sky-400 font-medium group-hover:underline">
            Ver Escala no Calendário →
          </span>
        </button>

        <button
          onClick={() => onNavigate("proposals")}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-3.5 rounded-xl text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Propostas Aprovadas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-bold text-slate-100">
            {db.proposals.filter((p) => p.status === "aprovada").length}
          </div>
          <span className="text-[10px] text-emerald-400 font-medium group-hover:underline">
            Ver Propostas →
          </span>
        </button>

        <button
          onClick={() => onNavigate("cashflow")}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-3.5 rounded-xl text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Total Contratado</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-mono font-bold text-amber-300 truncate">
            {formatCurrency(metrics.totalContracted)}
          </div>
          <span className="text-[10px] text-amber-400/90 font-medium group-hover:underline">
            Fluxo de Caixa →
          </span>
        </button>
      </div>

      {/* 4. Gráficos Comparativos Modernos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Balanço Operacional */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Balanço de Caixa: Entradas vs. Saídas
              </h3>
              <p className="text-xs text-slate-400">
                Comparativo de valores realizados no período selecionado
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Recebido
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                Pago
              </span>
            </div>
          </div>

          <div className="space-y-4 py-2">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                <span>Recebimentos Realizados (Entradas)</span>
                <span className="font-mono text-emerald-400 font-bold tabular-nums">
                  {formatCurrency(metrics.totalRealIncome)}
                </span>
              </div>
              <div className="h-6 w-full bg-slate-950 rounded-lg overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-md transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-slate-950"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        10,
                        (metrics.totalRealIncome /
                          (metrics.totalRealIncome + metrics.totalRealExpense || 1)) *
                          100
                      )
                    )}%`,
                  }}
                >
                  {formatCurrency(metrics.totalRealIncome)}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
                <span>Despesas Efetivadas (Saídas)</span>
                <span className="font-mono text-rose-400 font-bold tabular-nums">
                  {formatCurrency(metrics.totalRealExpense)}
                </span>
              </div>
              <div className="h-6 w-full bg-slate-950 rounded-lg overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-md transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        10,
                        (metrics.totalRealExpense /
                          (metrics.totalRealIncome + metrics.totalRealExpense || 1)) *
                          100
                      )
                    )}%`,
                  }}
                >
                  {formatCurrency(metrics.totalRealExpense)}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Resultado Líquido do Período:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  metrics.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(metrics.netProfit)} ({formatNumber(metrics.margin)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Distribuição de Custos */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Composição dos Custos</h3>
              <p className="text-xs text-slate-400">Onde os recursos da empresa estão alocados</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-200">
              {formatCurrency(totalCosts)}
            </span>
          </div>

          <div className="space-y-3">
            {Object.keys(metrics.costDistribution).length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Nenhuma despesa ou custo registrado neste período.
              </div>
            ) : (
              Object.entries(metrics.costDistribution).map(([category, amount]) => {
                const percentage = totalCosts > 0 ? (amount / totalCosts) * 100 : 0;
                const color = categoryColors[category] || "#94a3b8";

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 truncate max-w-[190px]">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[11px] tabular-nums">
                          {formatNumber(percentage)}%
                        </span>
                        <span className="font-mono text-slate-200 font-semibold tabular-nums">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. Tabela Completa de Obras e Rentabilidade com Opção de Editar / Excluir */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Obras Cadastradas & Rentabilidade Real
            </h3>
            <p className="text-xs text-slate-400">
              Edite todos os custos e parâmetros nas 9 abas ou exclua serviços
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onQuickAction("new_service")}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nova Obra</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-3">Código</th>
                <th className="pb-3">Serviço / Cliente</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Valor Venda</th>
                <th className="pb-3 text-right">Custo Total</th>
                <th className="pb-3 text-right">Lucro Estimado</th>
                <th className="pb-3 text-right">Margem %</th>
                <th className="pb-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {metrics.servicesWithMargins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhuma obra ou serviço cadastrado ainda. Clique em &quot;Nova Obra&quot; para registrar seu primeiro serviço.
                  </td>
                </tr>
              ) : (
                metrics.servicesWithMargins.map((srv) => (
                <tr key={srv.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 font-mono font-bold text-amber-400">
                    <button
                      onClick={() => onOpenService(srv.id)}
                      className="hover:underline cursor-pointer"
                    >
                      {srv.code}
                    </button>
                  </td>
                  <td className="py-3">
                    <p className="font-semibold text-slate-200 truncate max-w-xs">{srv.title}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-xs">
                      {srv.customerName}
                    </p>
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase ${
                        srv.status === "concluido"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : srv.status === "em_andamento"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {srv.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-slate-200 font-semibold tabular-nums">
                    {formatCurrency(srv.summary.salePrice)}
                  </td>
                  <td className="py-3 text-right font-mono text-rose-300 tabular-nums">
                    {formatCurrency(srv.summary.totalCost)}
                  </td>
                  <td className="py-3 text-right font-mono text-emerald-400 font-bold tabular-nums">
                    {formatCurrency(srv.summary.grossProfit)}
                  </td>
                  <td className="py-3 text-right font-mono tabular-nums">
                    <span
                      className={`font-bold ${
                        srv.summary.marginPercent >= 30 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {formatNumber(srv.summary.marginPercent)}%
                    </span>
                  </td>
                  <td className="py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onOpenService(srv.id)}
                        className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors font-medium flex items-center gap-1 cursor-pointer"
                        title="Editar todas as 9 abas"
                      >
                        <Edit2 className="w-3 h-3 text-amber-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Excluir permanentemente a obra ${srv.code} (${srv.title})?`)) {
                            deleteService(srv.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Excluir OS"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
