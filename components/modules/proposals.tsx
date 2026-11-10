"use client";

import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  Edit2,
  MessageCircle,
  FileText,
  DollarSign,
  Layers,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import { formatCurrency, formatDate, toInputDate, fromInputDate, generateId } from "@/lib/utils";
import { ProposalPrintView } from "./proposal-print-view";
import type { CommercialProposal, ProposalStatus, ProposalItem } from "@/lib/types";

interface ProposalsProps {
  onOpenService?: (serviceId: string) => void;
}

export function Proposals({ onOpenService }: ProposalsProps) {
  const { db, saveProposal, deleteProposal, convertProposalToService } = useERP();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Visualização de impressão / PDF
  const [viewingProposal, setViewingProposal] = useState<CommercialProposal | null>(null);

  // Modal de edição / criação
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<CommercialProposal | null>(null);

  const [formData, setFormData] = useState<{
    id?: string;
    code: string;
    customerId: string;
    customerName: string;
    serviceId: string;
    serviceTitle: string;
    issueDate: string;
    validUntil: string;
    scopeOfWork: string;
    includedMaterials: string;
    includedServices: string;
    executionDeadline: string;
    paymentTerms: string;
    warrantyTerms: string;
    totalValue: number;
    status: ProposalStatus;
    items: ProposalItem[];
    notes: string;
  }>({
    code: "",
    customerId: "",
    customerName: "",
    serviceId: "",
    serviceTitle: "",
    issueDate: "",
    validUntil: "",
    scopeOfWork: "",
    includedMaterials: "",
    includedServices: "Mão de obra técnica especializada, emissão de ART no CREA e ensaios NBR 5410.",
    executionDeadline: "3 a 5 dias úteis",
    paymentTerms: "50% de entrada no início e 50% na conclusão da obra",
    warrantyTerms: "12 meses de garantia de instalação",
    totalValue: 0,
    status: "em_elaboracao",
    items: [],
    notes: "",
  });

  // Novo item temporário no formulário
  const [newItem, setNewItem] = useState<{
    type: "servico" | "material";
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>({
    type: "servico",
    description: "",
    quantity: 1,
    unit: "un",
    unitPrice: 0,
  });

  const filteredProposals = useMemo(() => {
    return db.proposals.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const codeMatch = p.code.toLowerCase().includes(q);
        const titleMatch = p.serviceTitle.toLowerCase().includes(q);
        const custMatch = p.customerName.toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !custMatch) return false;
      }
      return true;
    });
  }, [db.proposals, statusFilter, searchTerm]);

  // Recalcular valor total dos itens
  const currentItemsTotal = useMemo(() => {
    return formData.items.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
  }, [formData.items]);

  const handleOpenNew = () => {
    const today = new Date().toISOString().split("T")[0];
    const valid = new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0];

    setEditingProposal(null);
    setFormData({
      code: "",
      customerId: db.customers[0]?.id || "",
      customerName: db.customers[0]?.name || "",
      serviceId: "",
      serviceTitle: "",
      issueDate: today,
      validUntil: valid,
      scopeOfWork: "",
      includedMaterials: "Conforme relação discriminada de materiais.",
      includedServices: "Mão de obra técnica qualificada com emissão de ART de execução.",
      executionDeadline: "3 a 5 dias úteis",
      paymentTerms: "50% de entrada e 50% na entrega técnica",
      warrantyTerms: "12 meses de garantia contra defeitos de execução",
      totalValue: 0,
      status: "em_elaboracao",
      items: [],
      notes: db.settings.proposalTemplateNotes || "",
    });
    setModalOpen(true);
  };

  const handleEdit = (p: CommercialProposal) => {
    setEditingProposal(p);
    setFormData({
      id: p.id,
      code: p.code,
      customerId: p.customerId,
      customerName: p.customerName,
      serviceId: p.serviceId || "",
      serviceTitle: p.serviceTitle,
      issueDate: toInputDate(p.issueDate),
      validUntil: toInputDate(p.validUntil),
      scopeOfWork: p.scopeOfWork,
      includedMaterials: p.includedMaterials,
      includedServices: p.includedServices,
      executionDeadline: p.executionDeadline,
      paymentTerms: p.paymentTerms,
      warrantyTerms: p.warrantyTerms,
      totalValue: p.totalValue,
      status: p.status,
      items: p.items || [],
      notes: p.notes || "",
    });
    setModalOpen(true);
  };

  const handleAddItem = () => {
    if (!newItem.description || newItem.unitPrice <= 0) {
      alert("Informe a descrição e valor unitário válido do item.");
      return;
    }
    const item: ProposalItem = {
      id: generateId("pi"),
      type: newItem.type,
      description: newItem.description,
      quantity: Number(newItem.quantity) || 1,
      unit: newItem.unit,
      unitPrice: Number(newItem.unitPrice) || 0,
      totalPrice: (Number(newItem.quantity) || 1) * (Number(newItem.unitPrice) || 0),
    };
    const updatedItems = [...formData.items, item];
    const newTotal = updatedItems.reduce((acc, it) => acc + it.totalPrice, 0);

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
      totalValue: newTotal,
    }));

    setNewItem({
      type: "servico",
      description: "",
      quantity: 1,
      unit: "un",
      unitPrice: 0,
    });
  };

  const handleRemoveItem = (id: string) => {
    const updated = formData.items.filter((it) => it.id !== id);
    const newTotal = updated.reduce((acc, it) => acc + it.totalPrice, 0);
    setFormData((prev) => ({ ...prev, items: updated, totalValue: newTotal }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = db.customers.find((c) => c.id === formData.customerId);

    const proposal: CommercialProposal = {
      id: editingProposal ? editingProposal.id : generateId("prop"),
      code: formData.code,
      customerId: formData.customerId,
      customerName: customer?.name || formData.customerName,
      serviceId: formData.serviceId || undefined,
      serviceTitle: formData.serviceTitle,
      issueDate: fromInputDate(formData.issueDate),
      validUntil: fromInputDate(formData.validUntil),
      scopeOfWork: formData.scopeOfWork,
      includedMaterials: formData.includedMaterials,
      includedServices: formData.includedServices,
      executionDeadline: formData.executionDeadline,
      paymentTerms: formData.paymentTerms,
      warrantyTerms: formData.warrantyTerms,
      totalValue: formData.totalValue > 0 ? formData.totalValue : currentItemsTotal,
      status: formData.status,
      items: formData.items,
      notes: formData.notes,
      createdAt: editingProposal?.createdAt || new Date().toISOString(),
    };

    await saveProposal(proposal);
    setModalOpen(false);
  };

  // Conversão em Serviço
  const handleConvert = async (proposalId: string) => {
    if (
      confirm(
        "Deseja aprovar e converter esta proposta em uma Ordem de Serviço (OS)?\nTodos os materiais e valores serão aproveitados automaticamente."
      )
    ) {
      const createdServiceId = await convertProposalToService(proposalId);
      if (createdServiceId && onOpenService) {
        onOpenService(createdServiceId);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Barra de Ações & Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === "all"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Todas ({db.proposals.length})
          </button>
          <button
            onClick={() => setStatusFilter("aguardando_aprovacao")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === "aguardando_aprovacao"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Aguardando Aprovação
          </button>
          <button
            onClick={() => setStatusFilter("aprovada")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === "aprovada"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Aprovadas (Convertidas)
          </button>
          <button
            onClick={() => setStatusFilter("enviada")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === "enviada"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Enviadas
          </button>
          <button
            onClick={() => setStatusFilter("em_elaboracao")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === "em_elaboracao"
                ? "bg-slate-700 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Em Elaboração
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, cliente ou serviço..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => {
              const csvRows = [
                ["Relatório de Propostas Comerciais Emitidas"],
                ["Empresa", db.settings.companyName],
                ["Data de Emissao", new Intl.DateTimeFormat("pt-BR").format(new Date())],
                ["Total de Propostas", filteredProposals.length.toString()],
                [],
                [
                  "Codigo Proposta",
                  "Cliente",
                  "Titulo do Servico / Obra",
                  "Data Emissao",
                  "Validade",
                  "Valor Total (R$)",
                  "Status",
                  "Qtd Itens",
                  "Prazo de Execucao",
                  "Condicoes Pagamento",
                  "Garantia",
                ],
              ];

              filteredProposals.forEach((p) => {
                csvRows.push([
                  p.code,
                  `"${p.customerName.replace(/"/g, '""')}"`,
                  `"${p.serviceTitle.replace(/"/g, '""')}"`,
                  p.issueDate,
                  p.validUntil,
                  p.totalValue.toFixed(2),
                  p.status,
                  (p.items || []).length.toString(),
                  `"${(p.executionDeadline || "").replace(/"/g, '""')}"`,
                  `"${(p.paymentTerms || "").replace(/"/g, '""')}"`,
                  `"${(p.warrantyTerms || "").replace(/"/g, '""')}"`,
                ]);
              });

              const csvContent = "\uFEFF" + csvRows.map((e) => e.join(";")).join("\n");
              const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `propostas_${new Date().toISOString().split("T")[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Exportar lista de propostas para Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Proposta Comercial</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de Propostas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProposals.map((p) => {
          const customer = db.customers.find((c) => c.id === p.customerId);
          const cleanPhone = (customer?.whatsapp || customer?.phone || "").replace(/\D/g, "");
          const isApproved = p.status === "aprovada";

          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-400 block">
                      {p.code}
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm leading-tight mt-0.5">
                      {p.serviceTitle}
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-semibold shrink-0 ${
                      p.status === "aprovada"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : p.status === "aguardando_aprovacao"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : p.status === "enviada"
                        ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {p.status.replace("_", " ")}
                  </span>
                </div>

                <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="text-slate-200 font-semibold truncate max-w-[170px]">
                      {p.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Emissão / Validade:</span>
                    <span className="font-mono text-slate-300">
                      {formatDate(p.issueDate)} · {formatDate(p.validUntil)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prazo de Obra:</span>
                    <span className="text-slate-300">{p.executionDeadline || "3 a 5 dias"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                    <span className="text-slate-300 font-semibold">Valor Total Proposto:</span>
                    <span className="font-mono font-bold text-base text-amber-400">
                      {formatCurrency(p.totalValue)}
                    </span>
                  </div>
                </div>

                {p.convertedServiceId && (
                  <div className="mt-3 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center justify-between">
                    <span>Obra gerada no ERP</span>
                    <button
                      onClick={() => onOpenService?.(p.convertedServiceId!)}
                      className="font-bold underline cursor-pointer"
                    >
                      Ver OS →
                    </button>
                  </div>
                )}
              </div>

              {/* Ações da Proposta */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setViewingProposal(p)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Imprimir proposta em PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Visualizar PDF</span>
                  </button>

                  <button
                    onClick={() => handleEdit(p)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Editar proposta"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Excluir a proposta ${p.code}?`)) {
                        deleteProposal(p.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {!isApproved && (
                  <button
                    onClick={() => handleConvert(p.id)}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                    title="Aprovar e gerar Ordem de Serviço"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aprovar Obra</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Modal de Visualização para Impressão */}
      {viewingProposal && (
        <ProposalPrintView
          proposal={viewingProposal}
          customer={db.customers.find((c) => c.id === viewingProposal.customerId)}
          settings={db.settings}
          onClose={() => setViewingProposal(null)}
        />
      )}

      {/* 4. Modal de Elaboração de Proposta */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>
                  {editingProposal ? `Editar Proposta ${editingProposal.code}` : "Nova Proposta Comercial"}
                </span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cliente *
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => {
                      const c = db.customers.find((cust) => cust.id === e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        customerId: e.target.value,
                        customerName: c?.name || "",
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    {db.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.document})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Título do Serviço / Objeto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.serviceTitle}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, serviceTitle: e.target.value }))
                    }
                    placeholder="Ex: Reforma Elétrica QGBT ou Adequação NR-10"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, issueDate: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Validade da Proposta
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.validUntil}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, validUntil: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Status da Proposta
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as ProposalStatus,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="em_elaboracao">Em Elaboração</option>
                    <option value="enviada">Enviada ao Cliente</option>
                    <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                    <option value="aprovada">Aprovada</option>
                    <option value="recusada">Recusada</option>
                    <option value="expirada">Expirada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Escopo Detalhado dos Trabalhos
                </label>
                <textarea
                  rows={3}
                  value={formData.scopeOfWork}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, scopeOfWork: e.target.value }))
                  }
                  placeholder="Detalhamento técnico da execução, normas e equipamentos utilizados..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200"
                />
              </div>

              {/* Inclusão de Itens e Discriminação de Preços */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200">
                  Itens da Proposta (Materiais e Mão de Obra)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Descrição do item ou material"
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <select
                      value={newItem.type}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          type: e.target.value as any,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="servico">Serviço</option>
                      <option value="material">Material</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Valor Unit. (R$)"
                      value={newItem.unitPrice || ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          unitPrice: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      + Item
                    </button>
                  </div>
                </div>

                {/* Tabela de itens */}
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="py-2 px-2.5">Item</th>
                        <th className="py-2 px-2.5 text-center">Tipo</th>
                        <th className="py-2 px-2.5 text-center">Qtd</th>
                        <th className="py-2 px-2.5 text-right">Unitário</th>
                        <th className="py-2 px-2.5 text-right">Total</th>
                        <th className="py-2 px-2.5 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {formData.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-500">
                            Nenhum item adicionado ainda.
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((it) => (
                          <tr key={it.id}>
                            <td className="py-2 px-2.5 font-medium text-slate-200">
                              {it.description}
                            </td>
                            <td className="py-2 px-2.5 text-center uppercase text-[10px] text-slate-400 font-mono">
                              {it.type}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono text-slate-300">
                              {it.quantity} {it.unit}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-300">
                              {formatCurrency(it.unitPrice)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-400">
                              {formatCurrency(it.totalPrice)}
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                className="text-slate-500 hover:text-rose-400"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-900 border-t border-slate-800 font-bold">
                      <tr>
                        <td colSpan={4} className="py-2 px-2.5 text-right text-slate-300">
                          Valor Total da Proposta:
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-amber-400 text-sm">
                          {formatCurrency(formData.totalValue > 0 ? formData.totalValue : currentItemsTotal)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Condições comerciais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Prazo de Execução
                  </label>
                  <input
                    type="text"
                    value={formData.executionDeadline}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, executionDeadline: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Condições de Pagamento
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Garantia
                  </label>
                  <input
                    type="text"
                    value={formData.warrantyTerms}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, warrantyTerms: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              {/* Botões */}
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
                  Gravar Proposta Comercial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
