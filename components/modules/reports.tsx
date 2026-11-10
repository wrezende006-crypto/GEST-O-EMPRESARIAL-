"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Wrench,
  Users,
  HardHat,
  Package,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getServiceCostSummary,
} from "@/lib/utils";

type ReportType =
  | "dre"
  | "rentabilidade_obras"
  | "desempenho_clientes"
  | "mao_de_obra"
  | "materiais_utilizados"
  | "contas_pagar_receber";

export function Reports() {
  const { db } = useERP();
  const [selectedReport, setSelectedReport] = useState<ReportType>("dre");
  const [periodFilter, setPeriodFilter] = useState<string>("ano_2026");

  // DRE Operacional
  const dreData = useMemo(() => {
    const realIncomes = db.transactions.filter(
      (t) => t.type === "entrada" && t.status === "efetivado"
    );
    const totalRevenue = realIncomes.reduce((acc, t) => acc + t.amount, 0);

    // Custos diretos de materiais
    const materialExpenses = db.transactions
      .filter((t) => t.type === "saida" && t.status === "efetivado" && t.category.includes("Materiais"))
      .reduce((acc, t) => acc + t.amount, 0);

    // Mão de obra operacional
    const laborExpenses = db.transactions
      .filter((t) => t.type === "saida" && t.status === "efetivado" && t.category.includes("Mão de obra"))
      .reduce((acc, t) => acc + t.amount, 0);

    // Despesas operacionais de deslocamento e ferramentas
    const vehicleToolsExpenses = db.transactions
      .filter(
        (t) =>
          t.type === "saida" &&
          t.status === "efetivado" &&
          (t.category.includes("Combustível") || t.category.includes("Ferramentas") || t.category.includes("Locação"))
      )
      .reduce((acc, t) => acc + t.amount, 0);

    // Despesas fixas (Aluguel, Luz, etc.)
    const fixedAdminExpenses = db.transactions
      .filter(
        (t) =>
          t.type === "saida" &&
          t.status === "efetivado" &&
          (t.category.includes("Aluguel") || t.category.includes("Energia") || t.category.includes("Administrativas"))
      )
      .reduce((acc, t) => acc + t.amount, 0);

    // Impostos
    const taxExpenses = db.transactions
      .filter((t) => t.type === "saida" && t.status === "efetivado" && t.category.includes("Impostos"))
      .reduce((acc, t) => acc + t.amount, 0);

    const grossMargin = totalRevenue - materialExpenses - laborExpenses;
    const netProfit = totalRevenue - (materialExpenses + laborExpenses + vehicleToolsExpenses + fixedAdminExpenses + taxExpenses);
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      materialExpenses,
      laborExpenses,
      vehicleToolsExpenses,
      fixedAdminExpenses,
      taxExpenses,
      grossMargin,
      netProfit,
      netMarginPercent,
    };
  }, [db.transactions]);

  // Rentabilidade por Obra
  const servicesProfitability = useMemo(() => {
    return db.services.map((s) => {
      const summary = getServiceCostSummary(s);
      return {
        id: s.id,
        code: s.code,
        title: s.title,
        customerName: s.customerName,
        status: s.status,
        salePrice: summary.salePrice,
        materialsCost: summary.materialsCost,
        laborCost: summary.laborCost,
        additionalCost: summary.additionalExpensesCost,
        totalCost: summary.totalCost,
        profit: summary.grossProfit,
        margin: summary.marginPercent,
      };
    });
  }, [db.services]);

  // Desempenho por Cliente
  const customerPerformance = useMemo(() => {
    return db.customers.map((c) => {
      const services = db.services.filter((s) => s.customerId === c.id);
      const totalContracted = services.reduce((acc, s) => acc + (s.contractedValue || 0), 0);
      const transactions = db.transactions.filter((t) => t.customerId === c.id);
      const totalPaid = transactions
        .filter((t) => t.type === "entrada" && t.status === "efetivado")
        .reduce((acc, t) => acc + t.amount, 0);
      const totalPending = transactions
        .filter((t) => t.type === "entrada" && t.status === "pendente")
        .reduce((acc, t) => acc + t.amount, 0);

      return {
        id: c.id,
        name: c.name,
        personType: c.personType,
        servicesCount: services.length,
        totalContracted,
        totalPaid,
        totalPending,
      };
    });
  }, [db.customers, db.services, db.transactions]);

  // Mão de Obra e Diárias
  const laborReport = useMemo(() => {
    return db.collaborators.map((c) => {
      let days = 0;
      let totalCost = 0;
      const servicesWorked: string[] = [];

      for (const s of db.services) {
        for (const m of s.team || []) {
          if (m.collaboratorId === c.id) {
            days += m.daysWorked || 0;
            totalCost += m.totalCost || 0;
            if (!servicesWorked.includes(s.code)) {
              servicesWorked.push(s.code);
            }
          }
        }
      }

      return {
        id: c.id,
        name: c.name,
        role: c.role,
        hiringType: c.hiringType,
        dailyRate: c.dailyRate,
        daysWorked: days,
        totalPaid: totalCost,
        servicesCount: servicesWorked.length,
      };
    });
  }, [db.collaborators, db.services]);

  // Exportação para CSV / Excel
  const handleExportCSV = () => {
    let filename = `relatorio_${selectedReport}_${new Date().toISOString().split("T")[0]}.csv`;
    let csvRows: string[][] = [];

    if (selectedReport === "rentabilidade_obras") {
      csvRows.push([
        "Codigo OS",
        "Servico",
        "Cliente",
        "Status",
        "Preco Venda (R$)",
        "Materiais (R$)",
        "Mao de Obra (R$)",
        "Despesas (R$)",
        "Custo Total (R$)",
        "Lucro Bruto (R$)",
        "Margem (%)",
      ]);
      servicesProfitability.forEach((s) => {
        csvRows.push([
          s.code,
          `"${s.title.replace(/"/g, '""')}"`,
          `"${s.customerName.replace(/"/g, '""')}"`,
          s.status,
          s.salePrice.toFixed(2),
          s.materialsCost.toFixed(2),
          s.laborCost.toFixed(2),
          s.additionalCost.toFixed(2),
          s.totalCost.toFixed(2),
          s.profit.toFixed(2),
          s.margin.toFixed(2),
        ]);
      });
    } else if (selectedReport === "desempenho_clientes") {
      csvRows.push([
        "Cliente",
        "Tipo",
        "Qtd Obras",
        "Total Contratado (R$)",
        "Efetivamente Pago (R$)",
        "Saldo Pendente (R$)",
      ]);
      customerPerformance.forEach((c) => {
        csvRows.push([
          `"${c.name.replace(/"/g, '""')}"`,
          c.personType,
          String(c.servicesCount),
          c.totalContracted.toFixed(2),
          c.totalPaid.toFixed(2),
          c.totalPending.toFixed(2),
        ]);
      });
    } else if (selectedReport === "mao_de_obra") {
      csvRows.push([
        "Colaborador",
        "Funcao",
        "Contratacao",
        "Diaria Padrao (R$)",
        "Dias Trabalhados",
        "Total Pago (R$)",
      ]);
      laborReport.forEach((l) => {
        csvRows.push([
          `"${l.name.replace(/"/g, '""')}"`,
          `"${l.role.replace(/"/g, '""')}"`,
          l.hiringType,
          l.dailyRate.toFixed(2),
          String(l.daysWorked),
          l.totalPaid.toFixed(2),
        ]);
      });
    } else {
      // DRE
      csvRows.push(["Demonstrativo de Resultado do Exercicio (DRE Operacional)", "Valor (R$)"]);
      csvRows.push(["Receita Bruta Operacional (Entradas Realizadas)", dreData.totalRevenue.toFixed(2)]);
      csvRows.push(["(-) Custos com Materiais Eletricos", dreData.materialExpenses.toFixed(2)]);
      csvRows.push(["(-) Custos com Mao de Obra e Diarias", dreData.laborExpenses.toFixed(2)]);
      csvRows.push(["(=) Margem Bruta Operacional", dreData.grossMargin.toFixed(2)]);
      csvRows.push(["(-) Despesas com Transporte e Ferramentas", dreData.vehicleToolsExpenses.toFixed(2)]);
      csvRows.push(["(-) Despesas Fixas Administrativas (Aluguel/Luz)", dreData.fixedAdminExpenses.toFixed(2)]);
      csvRows.push(["(-) Impostos e Tributos (Simples Nacional)", dreData.taxExpenses.toFixed(2)]);
      csvRows.push(["(=) Lucro Liquido Operacional", dreData.netProfit.toFixed(2)]);
      csvRows.push(["Margem Liquida (%)", dreData.netMarginPercent.toFixed(2) + "%"]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      csvRows.map((e) => e.join(";")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Seleção de Relatório e Ações */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedReport("dre")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              selectedReport === "dre"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            DRE Operacional
          </button>
          <button
            onClick={() => setSelectedReport("rentabilidade_obras")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              selectedReport === "rentabilidade_obras"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Rentabilidade por Obra
          </button>
          <button
            onClick={() => setSelectedReport("desempenho_clientes")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              selectedReport === "desempenho_clientes"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Desempenho por Cliente
          </button>
          <button
            onClick={() => setSelectedReport("mao_de_obra")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              selectedReport === "mao_de_obra"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Custos de Mão de Obra
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Exportar dados para planilha Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Gerar arquivo PDF ou imprimir relatório com logotipo"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Exportar PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Cabeçalho da Empresa visível apenas na impressão / PDF */}
      <div className="hidden print:flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-white p-1.5 flex items-center justify-center shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={db.settings.logoUrl || "/images/logo.jpg"}
              alt={db.settings.companyName}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              {db.settings.companyName}
            </h1>
            <p className="text-slate-600 font-medium text-[11px]">
              {db.settings.tradeName}
            </p>
            <p className="text-slate-500 text-[10px] mt-1 font-mono">
              CNPJ: {db.settings.cnpj} · IE: {db.settings.stateRegistration || "Isento"}
            </p>
            <p className="text-slate-500 text-[10px]">
              {db.settings.address} - {db.settings.city}/{db.settings.state} · Tel: {db.settings.phone}
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[11px] text-slate-600 space-y-1">
          <div className="font-bold text-slate-900 text-xs uppercase">
            {selectedReport.replace(/_/g, " ")}
          </div>
          <div>Emissão: {new Intl.DateTimeFormat("pt-BR").format(new Date())}</div>
          <div>NEXT GESTÃO ERP · Serviços Elétricos</div>
        </div>
      </div>

      {/* 2. Visualizador do Relatório Selecionado */}

      {/* RELATÓRIO 1: DRE OPERACIONAL */}
      {selectedReport === "dre" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span>Demonstrativo do Resultado do Exercício (DRE Operacional)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Competência: Exercício 2026 · Regime de Caixa Realizado
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
              Margem Líquida: {formatNumber(dreData.netMarginPercent)}%
            </span>
          </div>

          <div className="max-w-3xl divide-y divide-slate-800/80 text-xs">
            <div className="py-2.5 flex justify-between font-bold text-slate-100 text-sm">
              <span>(+) Receita Operacional Bruta (Entradas Realizadas)</span>
              <span className="font-mono text-emerald-400 tabular-nums">
                {formatCurrency(dreData.totalRevenue)}
              </span>
            </div>

            <div className="py-2 pl-4 flex justify-between text-slate-300">
              <span>(-) Custos Diretos de Materiais Elétricos</span>
              <span className="font-mono text-rose-400 tabular-nums">
                {formatCurrency(dreData.materialExpenses)}
              </span>
            </div>

            <div className="py-2 pl-4 flex justify-between text-slate-300">
              <span>(-) Custos com Diárias e Mão de Obra Técnica</span>
              <span className="font-mono text-rose-400 tabular-nums">
                {formatCurrency(dreData.laborExpenses)}
              </span>
            </div>

            <div className="py-2.5 flex justify-between font-bold text-slate-200 bg-slate-950/40 px-2 rounded">
              <span>(=) Lucro Bruto Operacional</span>
              <span className="font-mono text-emerald-400 tabular-nums">
                {formatCurrency(dreData.grossMargin)}
              </span>
            </div>

            <div className="py-2 pl-4 flex justify-between text-slate-300">
              <span>(-) Despesas de Deslocamento e Combustível</span>
              <span className="font-mono text-rose-400 tabular-nums">
                {formatCurrency(dreData.vehicleToolsExpenses)}
              </span>
            </div>

            <div className="py-2 pl-4 flex justify-between text-slate-300">
              <span>(-) Despesas Fixas Administrativas (Galpão, Luz, Internet)</span>
              <span className="font-mono text-rose-400 tabular-nums">
                {formatCurrency(dreData.fixedAdminExpenses)}
              </span>
            </div>

            <div className="py-2 pl-4 flex justify-between text-slate-300">
              <span>(-) Impostos e Tributos Operacionais (Simples/ISS)</span>
              <span className="font-mono text-rose-400 tabular-nums">
                {formatCurrency(dreData.taxExpenses)}
              </span>
            </div>

            <div className="pt-3 pb-1 flex justify-between font-extrabold text-sm text-slate-100 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="uppercase text-amber-400">(=) Lucro Líquido Operacional em Caixa:</span>
              <span
                className={`font-mono text-base tabular-nums ${
                  dreData.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatCurrency(dreData.netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* RELATÓRIO 2: RENTABILIDADE POR OBRA */}
      {selectedReport === "rentabilidade_obras" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Relatório de Custos e Rentabilidade por Serviço
              </h2>
              <p className="text-xs text-slate-400">
                Comparativo de preço de venda contratado, soma de custos e margem real
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Serviço / Cliente</th>
                  <th className="py-2.5 px-3 text-right">Valor Venda</th>
                  <th className="py-2.5 px-3 text-right">Materiais</th>
                  <th className="py-2.5 px-3 text-right">Mão de Obra</th>
                  <th className="py-2.5 px-3 text-right">Despesas</th>
                  <th className="py-2.5 px-3 text-right">Custo Total</th>
                  <th className="py-2.5 px-3 text-right">Lucro Bruto</th>
                  <th className="py-2.5 px-3 text-right">Margem %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {servicesProfitability.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                      {s.code}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-200 truncate max-w-xs">{s.title}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">{s.customerName}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                      {formatCurrency(s.salePrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(s.materialsCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(s.laborCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {formatCurrency(s.additionalCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                      {formatCurrency(s.totalCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(s.profit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={s.margin >= 30 ? "text-emerald-400" : "text-amber-400"}>
                        {formatNumber(s.margin)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RELATÓRIO 3: DESEMPENHO POR CLIENTE */}
      {selectedReport === "desempenho_clientes" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-100">
              Relatório de Faturamento por Cliente
            </h2>
            <p className="text-xs text-slate-400">
              Total contratado, faturamento já recebido e contas pendentes por contratante
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-center">Obras Cadastradas</th>
                  <th className="py-2.5 px-3 text-right">Total Contratado</th>
                  <th className="py-2.5 px-3 text-right">Efetivamente Pago</th>
                  <th className="py-2.5 px-3 text-right">Saldo Pendente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customerPerformance.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{c.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{c.personType}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">
                      {c.servicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                      {formatCurrency(c.totalContracted)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(c.totalPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                      {formatCurrency(c.totalPending)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RELATÓRIO 4: MÃO DE OBRA E DIÁRIAS */}
      {selectedReport === "mao_de_obra" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-100">
              Relatório de Custos de Mão de Obra e Diárias
            </h2>
            <p className="text-xs text-slate-400">
              Acompanhamento de dias trabalhados e custo total por eletricista e encarregado
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">Função / Cargo</th>
                  <th className="py-2.5 px-3">Contratação</th>
                  <th className="py-2.5 px-3 text-right">Diária Padrão</th>
                  <th className="py-2.5 px-3 text-center">Dias em Canteiro</th>
                  <th className="py-2.5 px-3 text-right">Total Apurado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {laborReport.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{l.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{l.role}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{l.hiringType}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(l.dailyRate)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                      {l.daysWorked} {l.daysWorked === 1 ? "dia" : "dias"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                      {formatCurrency(l.totalPaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
