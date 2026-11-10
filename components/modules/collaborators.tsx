"use client";

import React, { useState, useMemo } from "react";
import {
  HardHat,
  Plus,
  Search,
  Phone,
  Calendar,
  Edit2,
  Trash2,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Clock,
  FileSpreadsheet,
  Printer,
  Download,
  X,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import { formatCurrency, formatDate, toInputDate, fromInputDate, generateId } from "@/lib/utils";
import type { Collaborator } from "@/lib/types";

export function Collaborators() {
  const { db, saveCollaborator, deleteCollaborator } = useERP();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ativo" | "inativo">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);

  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    cpf: string;
    phone: string;
    role: string;
    hiringType: "CLT" | "Diarista" | "PJ" | "Autônomo";
    dailyRate: string;
    hourlyRate: string;
    admissionDate: string;
    status: "ativo" | "inativo";
    notes: string;
  }>({
    name: "",
    cpf: "",
    phone: "",
    role: "Eletricista Instalador",
    hiringType: "Diarista",
    dailyRate: "250.00",
    hourlyRate: "31.25",
    admissionDate: new Date().toISOString().split("T")[0],
    status: "ativo",
    notes: "",
  });

  // Cálculo de serviços em que cada colaborador atuou
  const collabParticipation = useMemo(() => {
    const map: Record<string, { totalDays: number; totalCost: number; serviceCount: number }> = {};
    for (const c of db.collaborators) {
      map[c.id] = { totalDays: 0, totalCost: 0, serviceCount: 0 };
    }

    for (const s of db.services) {
      for (const m of s.team || []) {
        if (!map[m.collaboratorId]) {
          map[m.collaboratorId] = { totalDays: 0, totalCost: 0, serviceCount: 0 };
        }
        map[m.collaboratorId].totalDays += m.daysWorked || 0;
        map[m.collaboratorId].totalCost += m.totalCost || 0;
        map[m.collaboratorId].serviceCount += 1;
      }
    }
    return map;
  }, [db.collaborators, db.services]);

  const filteredCollaborators = useMemo(() => {
    return db.collaborators.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(q);
        const roleMatch = c.role.toLowerCase().includes(q);
        const cpfMatch = c.cpf.toLowerCase().includes(q);
        if (!nameMatch && !roleMatch && !cpfMatch) return false;
      }
      return true;
    });
  }, [db.collaborators, statusFilter, searchTerm]);

  const handleOpenNew = () => {
    setEditingCollab(null);
    setFormData({
      name: "",
      cpf: "",
      phone: "",
      role: "Eletricista Predial",
      hiringType: "Diarista",
      dailyRate: "250.00",
      hourlyRate: "31.25",
      admissionDate: new Date().toISOString().split("T")[0],
      status: "ativo",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleEdit = (c: Collaborator) => {
    setEditingCollab(c);
    setFormData({
      id: c.id,
      name: c.name,
      cpf: c.cpf,
      phone: c.phone,
      role: c.role,
      hiringType: c.hiringType,
      dailyRate: String(c.dailyRate),
      hourlyRate: String(c.hourlyRate),
      admissionDate: toInputDate(c.admissionDate),
      status: c.status,
      notes: c.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const dRate = parseFloat(formData.dailyRate) || 0;
    const hRate = parseFloat(formData.hourlyRate) || dRate / 8;

    const collab: Collaborator = {
      id: editingCollab ? editingCollab.id : generateId("collab"),
      name: formData.name,
      cpf: formData.cpf,
      phone: formData.phone,
      role: formData.role,
      hiringType: formData.hiringType,
      dailyRate: dRate,
      hourlyRate: hRate,
      admissionDate: fromInputDate(formData.admissionDate),
      status: formData.status,
      notes: formData.notes,
    };

    await saveCollaborator(collab);
    setModalOpen(false);
  };

  const handleExportCSV = () => {
    const csvRows = [
      ["Relatório de Colaboradores & Equipe Técnica de Campo"],
      ["Empresa", db.settings.companyName],
      ["Data de Emissao", new Intl.DateTimeFormat("pt-BR").format(new Date())],
      ["Total de Colaboradores Filtrados", filteredCollaborators.length.toString()],
      [],
      [
        "Nome Completo",
        "CPF",
        "Telefone",
        "Funcao / Cargo",
        "Tipo Contratacao",
        "Data Admissao",
        "Valor Diaria (R$)",
        "Valor Hora (R$)",
        "Qtd Obras Atuadas",
        "Total Pago em Obras (R$)",
        "Situacao",
      ],
    ];

    filteredCollaborators.forEach((c) => {
      const stats = collabParticipation[c.id] || { totalDays: 0, totalCost: 0, serviceCount: 0 };
      csvRows.push([
        `"${c.name.replace(/"/g, '""')}"`,
        c.cpf || "-",
        c.phone || "-",
        `"${c.role.replace(/"/g, '""')}"`,
        c.hiringType,
        c.admissionDate || "-",
        c.dailyRate.toFixed(2),
        c.hourlyRate.toFixed(2),
        stats.serviceCount.toString(),
        stats.totalCost.toFixed(2),
        c.status.toUpperCase(),
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(";")).join("\n");
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `colaboradores_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Barra de Ações e Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "all"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos ({db.collaborators.length})
            </button>
            <button
              onClick={() => setStatusFilter("ativo")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "ativo"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter("inativo")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "inativo"
                  ? "bg-slate-700 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Inativos
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, função ou CPF..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Exportar equipe para planilha Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            onClick={() => setPdfModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Exportar Relatório da Equipe em PDF com Logotipo"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Colaborador</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de Colaboradores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCollaborators.map((c) => {
          const stats = collabParticipation[c.id] || { totalDays: 0, totalCost: 0, serviceCount: 0 };
          return (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{c.name}</h3>
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3" />
                      <span>{c.role}</span>
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-semibold ${
                      c.status === "ativo"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Contratação:</span>
                    <span className="font-semibold text-slate-200">{c.hiringType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Diária Padrão:</span>
                    <span className="font-mono font-bold text-slate-100">
                      {formatCurrency(c.dailyRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Custo / Hora:</span>
                    <span className="font-mono text-slate-300">
                      {formatCurrency(c.hourlyRate)}/h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Telefone / WhatsApp:</span>
                    <span className="font-mono text-slate-300">{c.phone || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPF:</span>
                    <span className="font-mono text-slate-400">{c.cpf || "-"}</span>
                  </div>
                </div>

                {/* Histórico na Empresa */}
                <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <div>
                    <span className="block text-slate-300 font-medium">
                      {stats.serviceCount} Obras Atuadas
                    </span>
                    <span>{stats.totalDays} dias trabalhados</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-slate-500 text-[10px]">Total Pago:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {formatCurrency(stats.totalCost)}
                    </span>
                  </div>
                </div>

                {c.notes && (
                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                    {c.notes}
                  </p>
                )}
              </div>

              {/* Ações */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleEdit(c)}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir cadastro de ${c.name}?`)) {
                      deleteCollaborator(c.id);
                    }
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Modal de Cadastro / Edição */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <HardHat className="w-4 h-4 text-amber-400" />
                <span>
                  {editingCollab ? "Editar Cadastro de Colaborador" : "Novo Colaborador"}
                </span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: Carlos Eduardo Santos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cpf}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cpf: e.target.value }))
                    }
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="(11) 98000-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Função / Cargo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, role: e.target.value }))
                    }
                    placeholder="Ex: Eletricista Chefe, Auxiliar, Técnico"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipo de Contratação
                  </label>
                  <select
                    value={formData.hiringType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hiringType: e.target.value as any,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="Diarista">Diarista (Diárias)</option>
                    <option value="CLT">CLT (Mensalista)</option>
                    <option value="PJ">PJ (Prestador com NF)</option>
                    <option value="Autônomo">Autônomo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-amber-400 mb-1">
                    Valor da Diária Padrão (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.dailyRate}
                    onChange={(e) => {
                      const d = parseFloat(e.target.value) || 0;
                      setFormData((prev) => ({
                        ...prev,
                        dailyRate: e.target.value,
                        hourlyRate: (d / 8).toFixed(2),
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Situação
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as "ativo" | "inativo",
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações e Qualificações (NR-10, NR-35, CFT, etc.)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal / Folha Imprimível de Relatório da Equipe com Logotipo Oficial */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-2 sm:p-6 flex flex-col items-center">
          {/* Barra de controle (oculta durante impressão) */}
          <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400">
                RELATÓRIO DA EQUIPE
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {filteredCollaborators.length} profissionais listados
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
                  RELATÓRIO DE COLABORADORES & DIÁRIAS
                </div>
                <div>Emissão: {new Intl.DateTimeFormat("pt-BR").format(new Date())}</div>
                <div>Status do Filtro: {statusFilter.toUpperCase()}</div>
              </div>
            </div>

            {/* Tabela de Colaboradores */}
            <div>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-bold bg-slate-100">
                    <th className="py-2 px-2">Nome do Profissional</th>
                    <th className="py-2 px-2">CPF</th>
                    <th className="py-2 px-2">Telefone</th>
                    <th className="py-2 px-2">Função / Cargo</th>
                    <th className="py-2 px-2">Contrato</th>
                    <th className="py-2 px-2 text-right">Diária (R$)</th>
                    <th className="py-2 px-2 text-center">Obras</th>
                    <th className="py-2 px-2 text-right">Total Pago</th>
                    <th className="py-2 px-2 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCollaborators.map((c) => {
                    const stats = collabParticipation[c.id] || { totalDays: 0, totalCost: 0, serviceCount: 0 };
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-bold text-slate-900">{c.name}</td>
                        <td className="py-2 px-2 font-mono text-slate-600">{c.cpf || "-"}</td>
                        <td className="py-2 px-2 font-mono text-slate-600">{c.phone || "-"}</td>
                        <td className="py-2 px-2 text-slate-800 font-medium">{c.role}</td>
                        <td className="py-2 px-2 text-slate-600">{c.hiringType}</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">
                          {formatCurrency(c.dailyRate)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{stats.serviceCount}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-amber-700">
                          {formatCurrency(stats.totalCost)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.status === "ativo"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé e assinatura */}
            <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
              <div>
                <p>NEXT GESTÃO ERP · Gestão Administrativa de Colaboradores e Diárias</p>
                <p>Documento de uso interno e prestação de contas operacionais</p>
              </div>
              <div className="text-center w-64 border-t border-slate-400 pt-2 font-medium text-slate-700">
                {db.settings.companyName}
                <br />
                Gerência Operacional
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
