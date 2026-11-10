"use client";

import React, { useState, useMemo } from "react";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  Edit,
  DollarSign,
  TrendingUp,
  Printer,
  Download,
  X,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import { formatCurrency, formatNumber, formatDate, getServiceCostSummary } from "@/lib/utils";
import type { ElectricalService, ServiceStatus } from "@/lib/types";

interface ServicesProps {
  onOpenService: (serviceId: string) => void;
  onNewService: () => void;
}

export function Services({ onOpenService, onNewService }: ServicesProps) {
  const { db, deleteService } = useERP();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const servicesWithMetrics = useMemo(() => {
    return db.services.map((s) => {
      const summary = getServiceCostSummary(s);
      return {
        ...s,
        summary,
      };
    });
  }, [db.services]);

  const filteredServices = useMemo(() => {
    return servicesWithMetrics.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const codeMatch = s.code.toLowerCase().includes(q);
        const titleMatch = s.title.toLowerCase().includes(q);
        const custMatch = s.customerName.toLowerCase().includes(q);
        const addressMatch = s.executionAddress.toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !custMatch && !addressMatch) return false;
      }
      return true;
    });
  }, [servicesWithMetrics, statusFilter, searchTerm]);

  const handleExportCSV = () => {
    const csvRows = [
      ["Relatório Geral de Ordens de Serviço & Obras Elétricas"],
      ["Empresa", db.settings.companyName],
      ["Data de Emissao", new Intl.DateTimeFormat("pt-BR").format(new Date())],
      ["Total de Obras Filtradas", filteredServices.length.toString()],
      [],
      [
        "Codigo OS",
        "Titulo da Obra",
        "Cliente",
        "Status",
        "Endereco",
        "Responsavel Tecnico",
        "Inicio Previsto",
        "Fim Previsto",
        "Preco Venda (R$)",
        "Custo Materiais (R$)",
        "Custo Mao de Obra (R$)",
        "Despesas (R$)",
        "Custo Total (R$)",
        "Lucro Estimado (R$)",
        "Margem (%)",
      ],
    ];

    filteredServices.forEach((s) => {
      csvRows.push([
        s.code,
        `"${s.title.replace(/"/g, '""')}"`,
        `"${s.customerName.replace(/"/g, '""')}"`,
        s.status,
        `"${s.executionAddress.replace(/"/g, '""')}"`,
        `"${s.technicalLead.replace(/"/g, '""')}"`,
        s.expectedStartDate || "-",
        s.expectedEndDate || "-",
        s.contractedValue.toFixed(2),
        s.summary.materialsCost.toFixed(2),
        s.summary.laborCost.toFixed(2),
        s.summary.additionalExpensesCost.toFixed(2),
        s.summary.totalCost.toFixed(2),
        s.summary.grossProfit.toFixed(2),
        s.summary.marginPercent.toFixed(2),
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(";")).join("\n");
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_obras_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Totais rápidos
  const totalValue = servicesWithMetrics.reduce(
    (acc, s) => acc + (s.contractedValue || 0),
    0
  );
  const totalCost = servicesWithMetrics.reduce(
    (acc, s) => acc + s.summary.totalCost,
    0
  );
  const totalProfit = totalValue - totalCost;
  const overallMargin = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 1. KPIs Rápidos do Módulo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">
            Total de Serviços & Obras
          </span>
          <div className="text-xl lg:text-2xl font-bold font-mono text-slate-100">
            {db.services.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {db.services.filter((s) => s.status === "em_andamento").length} em andamento ·{" "}
            {db.services.filter((s) => s.status === "concluido").length} concluídos
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">
            Valor Total Contratado
          </span>
          <div className="text-xl lg:text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {formatCurrency(totalValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Soma de todos os contratos e orçamentos
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">
            Custo Operacional Total
          </span>
          <div className="text-xl lg:text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {formatCurrency(totalCost)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Materiais, equipe técnica e despesas
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <span className="text-xs text-slate-400 block mb-1">
            Lucro Bruto Médio / Margem
          </span>
          <div className="text-xl lg:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {formatCurrency(totalProfit)}
          </div>
          <p className="text-[11px] text-emerald-400 font-mono mt-1 font-semibold">
            Margem Geral: {formatNumber(overallMargin)}%
          </p>
        </div>
      </div>

      {/* 2. Barra de Filtros e Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status segmented filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === "all"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Todos ({db.services.length})
          </button>
          <button
            onClick={() => setStatusFilter("em_andamento")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === "em_andamento"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Em Andamento
          </button>
          <button
            onClick={() => setStatusFilter("aprovado")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === "aprovado"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Aprovados
          </button>
          <button
            onClick={() => setStatusFilter("concluido")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === "concluido"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Concluídos
          </button>
          <button
            onClick={() => setStatusFilter("orcamento")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === "orcamento"
                ? "bg-slate-700 text-slate-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Orçamentos
          </button>
        </div>

        {/* Busca e botão de criar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, serviço ou cliente..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Exportar todas as obras para planilha Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Excel (CSV)</span>
            </button>

            <button
              onClick={() => setPdfModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Exportar Relatório Geral de Obras em PDF com Logotipo"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={onNewService}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Ordem de Serviço</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tabela de Serviços e Obras */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-3.5">Código / OS</th>
                <th className="py-3 px-3.5">Serviço & Endereço</th>
                <th className="py-3 px-3.5">Cliente</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Prazo Previsto</th>
                <th className="py-3 px-3.5 text-right">Valor Venda</th>
                <th className="py-3 px-3.5 text-right">Custo Total</th>
                <th className="py-3 px-3.5 text-right">Lucro Estimado</th>
                <th className="py-3 px-3.5 text-right">Margem</th>
                <th className="py-3 px-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    Nenhum serviço encontrado. Clique em &quot;Nova Ordem de Serviço&quot; para cadastrar.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => {
                  return (
                    <tr
                      key={srv.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Código OS */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <button
                          onClick={() => onOpenService(srv.id)}
                          className="font-mono font-bold text-amber-400 hover:underline cursor-pointer"
                        >
                          {srv.code}
                        </button>
                      </td>

                      {/* Título & Endereço */}
                      <td className="py-3 px-3.5">
                        <p className="font-semibold text-slate-200 truncate max-w-xs">
                          {srv.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">
                          {srv.executionAddress || "Endereço não informado"}
                        </p>
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-3.5">
                        <p className="font-medium text-slate-300 truncate max-w-[160px]">
                          {srv.customerName}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded-sm font-medium ${
                            srv.status === "concluido"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : srv.status === "em_andamento"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : srv.status === "aprovado"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {srv.status === "concluido"
                            ? "Concluído"
                            : srv.status === "em_andamento"
                            ? "Em Andamento"
                            : srv.status === "aprovado"
                            ? "Aprovado"
                            : srv.status === "orcamento"
                            ? "Orçamento"
                            : srv.status === "aguardando_aprovacao"
                            ? "Aguard. Aprovação"
                            : srv.status}
                        </span>
                      </td>

                      {/* Prazo */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-300">
                        {formatDate(srv.expectedEndDate)}
                      </td>

                      {/* Valor Venda */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-200 tabular-nums whitespace-nowrap">
                        {formatCurrency(srv.contractedValue)}
                      </td>

                      {/* Custo Total */}
                      <td className="py-3 px-3.5 text-right font-mono text-rose-300 tabular-nums whitespace-nowrap">
                        {formatCurrency(srv.summary.totalCost)}
                      </td>

                      {/* Lucro Estimado */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                        {formatCurrency(srv.summary.grossProfit)}
                      </td>

                      {/* Margem % */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                        <span
                          className={
                            srv.summary.marginPercent >= 30
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }
                        >
                          {formatNumber(srv.summary.marginPercent)}%
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenService(srv.id)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors cursor-pointer"
                          >
                            Abrir 9 Abas
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir a OS ${srv.code} (${srv.title})?`)) {
                                deleteService(srv.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Excluir OS"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal / Folha Imprimível de Relatório Geral de Obras com Logo */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-2 sm:p-6 flex flex-col items-center">
          {/* Barra de controle (oculta durante impressão) */}
          <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400">
                RELATÓRIO GERAL DE OBRAS
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {filteredServices.length} ordens de serviço listadas
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar Excel (CSV)</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </button>

              <button
                onClick={() => setPdfModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Folha A4 Imprimível com Logotipo da Empresa */}
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 space-y-6 print-page font-sans text-xs">
            {/* Cabeçalho com Logo Oficial */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
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

              <div className="sm:text-right font-mono text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-900 text-xs">
                  RELATÓRIO GERAL DE OBRAS & SERVIÇOS
                </div>
                <div>Emissão: {new Intl.DateTimeFormat("pt-BR").format(new Date())}</div>
                <div>Responsável Técnico: {db.settings.technicalLead}</div>
              </div>
            </div>

            {/* Resumo Consolidado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Total Contratado
                </span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatCurrency(totalValue)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Custo Operacional
                </span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Lucro Operacional
                </span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {formatCurrency(totalProfit)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Margem Média
                </span>
                <span className="font-mono font-bold text-sm text-amber-700">
                  {formatNumber(overallMargin)}%
                </span>
              </div>
            </div>

            {/* Tabela de Obras */}
            <div>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-bold bg-slate-100">
                    <th className="py-2 px-2">Código</th>
                    <th className="py-2 px-2">Obra / Serviço</th>
                    <th className="py-2 px-2">Cliente</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Valor Venda</th>
                    <th className="py-2 px-2 text-right">Custo Total</th>
                    <th className="py-2 px-2 text-right">Lucro Est.</th>
                    <th className="py-2 px-2 text-right">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredServices.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {s.code}
                      </td>
                      <td className="py-2 px-2">
                        <div className="font-semibold text-slate-900">{s.title}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">
                          {s.executionAddress}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-slate-700">{s.customerName}</td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold whitespace-nowrap">
                        {formatCurrency(s.contractedValue)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-rose-700 whitespace-nowrap">
                        {formatCurrency(s.summary.totalCost)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                        {formatCurrency(s.summary.grossProfit)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold whitespace-nowrap">
                        {formatNumber(s.summary.marginPercent)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé e assinatura técnica */}
            <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
              <div>
                <p>NEXT GESTÃO ERP · Sistema de Gestão Empresarial para Instalações Elétricas</p>
                <p>Documento oficial emitido sob supervisão técnica</p>
              </div>
              <div className="text-center w-64 border-t border-slate-400 pt-2 font-medium text-slate-700">
                {db.settings.technicalLead}
                <br />
                Responsável Técnico · CREA {db.settings.creaNumber}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
