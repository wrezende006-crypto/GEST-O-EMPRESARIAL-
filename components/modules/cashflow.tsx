"use client";

import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Check,
  FileSpreadsheet,
  Printer,
  Download,
  X,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import {
  formatCurrency,
  formatDate,
  toInputDate,
  fromInputDate,
  generateId,
} from "@/lib/utils";
import type { FinancialTransaction, PaymentMethod } from "@/lib/types";

interface CashflowProps {
  initialServiceFilter?: string;
  onNavigateToService?: (serviceId: string) => void;
}

export function Cashflow({ initialServiceFilter, onNavigateToService }: CashflowProps) {
  const { db, saveTransaction, deleteTransaction, toggleTransactionStatus } = useERP();

  // Filtros
  const [typeFilter, setTypeFilter] = useState<"all" | "entrada" | "saida">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "efetivado" | "pendente">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>(initialServiceFilter || "all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de edição / criação
  const [modalOpen, setModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    id?: string;
    type: "entrada" | "saida";
    description: string;
    customerId: string;
    supplierId: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
    dueDate: string; // YYYY-MM-DD
    paymentDate: string; // YYYY-MM-DD
    amount: string;
    paymentMethod: PaymentMethod;
    category: string;
    isFixedExpense: boolean;
    status: "efetivado" | "pendente";
    notes: string;
  }>({
    type: "entrada",
    description: "",
    customerId: "",
    supplierId: "",
    serviceId: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: new Date().toISOString().split("T")[0],
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "pix",
    category: "Serviços de instalação elétrica",
    isFixedExpense: false,
    status: "efetivado",
    notes: "",
  });

  // Lista filtrada
  const filteredTransactions = useMemo(() => {
    return db.transactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (serviceFilter !== "all" && t.serviceId !== serviceFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(query);
        const clientMatch = t.customerName?.toLowerCase().includes(query);
        const supplierMatch = t.supplierName?.toLowerCase().includes(query);
        const serviceMatch = t.serviceCode?.toLowerCase().includes(query);
        if (!descMatch && !clientMatch && !supplierMatch && !serviceMatch) {
          return false;
        }
      }
      return true;
    });
  }, [db.transactions, typeFilter, statusFilter, categoryFilter, serviceFilter, searchTerm]);

  // Totais consolidados
  const totals = useMemo(() => {
    // Efetivados
    const realIncome = db.transactions
      .filter((t) => t.type === "entrada" && t.status === "efetivado")
      .reduce((acc, t) => acc + t.amount, 0);

    const realExpense = db.transactions
      .filter((t) => t.type === "saida" && t.status === "efetivado")
      .reduce((acc, t) => acc + t.amount, 0);

    const currentBalance = realIncome - realExpense;

    // Pendentes
    const pendingIncome = db.transactions
      .filter((t) => t.type === "entrada" && t.status === "pendente")
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingExpense = db.transactions
      .filter((t) => t.type === "saida" && t.status === "pendente")
      .reduce((acc, t) => acc + t.amount, 0);

    const projectedBalance = currentBalance + pendingIncome - pendingExpense;

    return {
      realIncome,
      realExpense,
      currentBalance,
      pendingIncome,
      pendingExpense,
      projectedBalance,
    };
  }, [db.transactions]);

  // Abertura do modal para novo lançamento
  const handleOpenNew = (type: "entrada" | "saida" = "entrada") => {
    const today = new Date().toISOString().split("T")[0];
    setEditingTransaction(null);
    setFormData({
      type,
      description: "",
      customerId: "",
      supplierId: "",
      serviceId: serviceFilter !== "all" ? serviceFilter : "",
      date: today,
      dueDate: today,
      paymentDate: today,
      amount: "",
      paymentMethod: "pix",
      category:
        type === "entrada"
          ? db.settings.categoriesIncome[0] || "Serviços de instalação elétrica"
          : db.settings.categoriesExpense[0] || "Materiais elétricos",
      isFixedExpense: false,
      status: "efetivado",
      notes: "",
    });
    setModalOpen(true);
  };

  // Abertura do modal para editar lançamento
  const handleEdit = (t: FinancialTransaction) => {
    setEditingTransaction(t);
    setFormData({
      id: t.id,
      type: t.type,
      description: t.description,
      customerId: t.customerId || "",
      supplierId: t.supplierId || "",
      serviceId: t.serviceId || "",
      date: toInputDate(t.date),
      dueDate: toInputDate(t.dueDate),
      paymentDate: t.paymentDate ? toInputDate(t.paymentDate) : "",
      amount: String(t.amount),
      paymentMethod: t.paymentMethod,
      category: t.category,
      isFixedExpense: !!t.isFixedExpense,
      status: t.status,
      notes: t.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Informe um valor monetário válido maior que zero.");
      return;
    }

    const customer = db.customers.find((c) => c.id === formData.customerId);
    const supplier = db.suppliers.find((s) => s.id === formData.supplierId);
    const service = db.services.find((s) => s.id === formData.serviceId);

    const transaction: FinancialTransaction = {
      id: editingTransaction ? editingTransaction.id : generateId("tr"),
      type: formData.type,
      description: formData.description,
      customerId: customer?.id,
      customerName: customer?.name,
      supplierId: supplier?.id,
      supplierName: supplier?.name,
      serviceId: service?.id,
      serviceCode: service?.code,
      date: fromInputDate(formData.date),
      dueDate: fromInputDate(formData.dueDate),
      paymentDate: formData.status === "efetivado" ? fromInputDate(formData.paymentDate || formData.date) : undefined,
      amount: numAmount,
      paymentMethod: formData.paymentMethod,
      category: formData.category,
      isFixedExpense: formData.isFixedExpense,
      status: formData.status,
      notes: formData.notes,
      createdAt: editingTransaction?.createdAt || new Date().toISOString(),
    };

    await saveTransaction(transaction);
    setModalOpen(false);
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Tipo",
      "Status",
      "Data Lancamento",
      "Vencimento",
      "Data Pagamento",
      "Descricao",
      "Categoria",
      "Cliente/Fornecedor",
      "Servico/OS",
      "Forma Pagamento",
      "Valor (R$)",
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      t.type === "entrada" ? "Recebimento (Entrada)" : "Despesa (Saída)",
      t.status === "efetivado" ? "Efetivado" : "Pendente",
      t.date,
      t.dueDate,
      t.paymentDate || "-",
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${(t.type === "entrada" ? t.customerName : t.supplierName) || "-"}"`,
      t.serviceCode || "-",
      t.paymentMethod,
      t.amount.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fluxo_de_caixa_voltmaster_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header do Módulo & Totais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Efetivo Atual */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Saldo Real em Caixa</span>
            <span className="p-1 rounded bg-slate-800 text-amber-400">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div
            className={`text-xl lg:text-2xl font-bold font-mono tabular-nums ${
              totals.currentBalance >= 0 ? "text-slate-100" : "text-rose-400"
            }`}
          >
            {formatCurrency(totals.currentBalance)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Recebido ({formatCurrency(totals.realIncome)}) - Pago ({formatCurrency(totals.realExpense)})
          </p>
        </div>

        {/* Contas a Receber */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Contas a Receber (Pendente)</span>
            <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {formatCurrency(totals.pendingIncome)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Entradas futuras com previsão de recebimento
          </p>
        </div>

        {/* Contas a Pagar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Contas a Pagar (Pendente)</span>
            <span className="p-1 rounded bg-rose-500/10 text-rose-400">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {formatCurrency(totals.pendingExpense)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Fornecedores e diárias a vencer
          </p>
        </div>

        {/* Saldo Projetado */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Saldo Final Projetado</span>
            <span className="p-1 rounded bg-amber-500/10 text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl lg:text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {formatCurrency(totals.projectedBalance)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Saldo atual + Contas a Receber - Contas a Pagar
          </p>
        </div>
      </div>

      {/* 2. Barra de Ferramentas e Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented control: Tipo */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === "all"
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos ({db.transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter("entrada")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === "entrada"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setTypeFilter("saida")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                typeFilter === "saida"
                  ? "bg-rose-500 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Saídas
            </button>
          </div>

          {/* Segmented control: Status (Realizado vs Pendente) */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "all"
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos os Status
            </button>
            <button
              onClick={() => setStatusFilter("efetivado")}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "efetivado"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Efetivados (Pagos/Recebidos)
            </button>
            <button
              onClick={() => setStatusFilter("pendente")}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "pendente"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pendentes (Previsão)
            </button>
          </div>

          {/* Ações primárias */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Exportar para Excel / Planilha CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Excel (CSV)</span>
            </button>

            <button
              onClick={() => setPdfModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Exportar Extrato em PDF com Logotipo da Empresa"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={() => handleOpenNew("saida")}
              className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors flex items-center gap-1.5 border border-rose-500/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Despesa</span>
            </button>

            <button
              onClick={() => handleOpenNew("entrada")}
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Recebimento</span>
            </button>
          </div>
        </div>

        {/* Linha de filtros secundários: Categoria & Serviço Vinculado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
            >
              <option value="all">Todas as Categorias</option>
              <optgroup label="Despesas">
                {db.settings.categoriesExpense.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Receitas">
                {db.settings.categoriesIncome.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
            >
              <option value="all">Todos os Serviços / Obras</option>
              {db.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por texto, cliente ou fornecedor..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Tabela de Lançamentos */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Extrato Financeiro ({filteredTransactions.length} lançamentos)</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Clique no status para alternar entre Pendente e Efetivado
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Data / Vencimento</th>
                <th className="py-3 px-3.5">Descrição</th>
                <th className="py-3 px-3.5">Categoria</th>
                <th className="py-3 px-3.5">Vínculo (Cliente / Obra)</th>
                <th className="py-3 px-3.5">Forma</th>
                <th className="py-3 px-3.5 text-right">Valor</th>
                <th className="py-3 px-3.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isIncome = t.type === "entrada";
                  const isDone = t.status === "efetivado";

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Status interativo com 1 clique */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <button
                          onClick={() => toggleTransactionStatus(t.id)}
                          title="Clique para alternar status (Pendente / Efetivado)"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                            isDone
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30"
                          }`}
                        >
                          {isDone ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Efetivado</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Pendente</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Datas */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-mono text-slate-200 font-medium">
                          {formatDate(t.date)}
                        </div>
                        {t.dueDate && t.dueDate !== t.date && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Venc: {formatDate(t.dueDate)}
                          </div>
                        )}
                        {isDone && t.paymentDate && (
                          <div className="text-[10px] text-emerald-400/80 font-mono">
                            Pago: {formatDate(t.paymentDate)}
                          </div>
                        )}
                      </td>

                      {/* Descrição */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-200">
                          {t.description}
                        </div>
                        {t.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {t.notes}
                          </div>
                        )}
                      </td>

                      {/* Categoria & Fixo/Variável */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="text-slate-300 text-xs font-medium">
                          {t.category}
                        </span>
                        {t.isFixedExpense && (
                          <span className="ml-1.5 text-[9px] uppercase px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                            Fixo
                          </span>
                        )}
                      </td>

                      {/* Vínculo (Cliente / Fornecedor / Serviço) */}
                      <td className="py-3 px-3.5">
                        {t.type === "entrada" ? (
                          <div className="text-slate-300 font-medium truncate max-w-[150px]">
                            {t.customerName || "-"}
                          </div>
                        ) : (
                          <div className="text-slate-300 font-medium truncate max-w-[150px]">
                            {t.supplierName || "-"}
                          </div>
                        )}
                        {t.serviceCode && (
                          <button
                            onClick={() =>
                              t.serviceId && onNavigateToService?.(t.serviceId)
                            }
                            className="font-mono text-[10px] text-amber-400 hover:underline cursor-pointer block"
                          >
                            {t.serviceCode}
                          </button>
                        )}
                      </td>

                      {/* Forma de Pagamento */}
                      <td className="py-3 px-3.5 whitespace-nowrap uppercase text-[11px] font-mono text-slate-400">
                        {t.paymentMethod.replace("_", " ")}
                      </td>

                      {/* Valor formatado */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isIncome ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isIncome ? "+" : "-"} {formatCurrency(t.amount)}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(t)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir o lançamento "${t.description}"?`)) {
                                deleteTransaction(t.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Excluir lançamento"
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

      {/* 4. Modal de Criação / Edição de Lançamento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 lg:p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>
                  {editingTransaction
                    ? "Editar Lançamento Financeiro"
                    : formData.type === "entrada"
                    ? "Novo Recebimento de Cliente"
                    : "Nova Despesa / Saída"}
                </span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 lg:p-6 space-y-4 overflow-y-auto">
              {/* Tipo seletor */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: "entrada",
                      category: db.settings.categoriesIncome[0] || "Serviços",
                    }))
                  }
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                    formData.type === "entrada"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  + Entrada (Recebimento)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: "saida",
                      category: db.settings.categoriesExpense[0] || "Materiais",
                    }))
                  }
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${
                    formData.type === "saida"
                      ? "bg-rose-500/20 text-rose-400 border-rose-500"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  - Saída (Despesa / Custo)
                </button>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Ex: Recebimento 50% reforma QGBT ou Compra de Cabos 16mm"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Valor e Forma de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor Monetário (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono font-bold text-amber-400 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod: e.target.value as PaymentMethod,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="pix">PIX (Chave da Empresa)</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="transferencia">Transferência / TED</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro em Espécie</option>
                  </select>
                </div>
              </div>

              {/* Categoria e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Categoria Financeira
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    {formData.type === "entrada"
                      ? db.settings.categoriesIncome.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      : db.settings.categoriesExpense.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Situação (Status)
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as "efetivado" | "pendente",
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="efetivado">
                      Efetivado ({formData.type === "entrada" ? "Recebido em conta" : "Pago"})
                    </option>
                    <option value="pendente">
                      Pendente ({formData.type === "entrada" ? "A receber" : "A pagar"})
                    </option>
                  </select>
                </div>
              </div>

              {/* Datas: Lançamento, Vencimento, Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Data Lançamento
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Data Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {formData.status === "efetivado" && (
                  <div>
                    <label className="block text-[11px] font-medium text-emerald-400 mb-1">
                      Data do Pagamento
                    </label>
                    <input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))
                      }
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Vínculo: Cliente ou Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.type === "entrada" ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Cliente Relacionado
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, customerId: e.target.value }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="">Nenhum / Não vinculado</option>
                      {db.customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Fornecedor Relacionado
                    </label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, supplierId: e.target.value }))
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="">Nenhum / Despesa interna</option>
                      {db.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Serviço / Obra Relacionada */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Serviço / Obra Relacionada (Opcional)
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, serviceId: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="">Despesa Geral / Sem vínculo</option>
                    {db.services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Despesa Fixa vs Variável */}
              {formData.type === "saida" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isFixedExpense"
                    checked={formData.isFixedExpense}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isFixedExpense: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4"
                  />
                  <label
                    htmlFor="isFixedExpense"
                    className="text-xs text-slate-300 cursor-pointer"
                  >
                    Esta é uma despesa fixa administrativa (Aluguel, luz, internet, etc.)
                  </label>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações / Dados da Nota Fiscal
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Número de NF, dados de recibo, detalhes do pagamento..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Botões do rodapé */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  {editingTransaction ? "Salvar Alterações" : "Gravar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Folha Imprimível de Extrato em PDF com Logotipo Oficial */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-2 sm:p-6 flex flex-col items-center">
          {/* Barra de controle (oculta durante a impressão) */}
          <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400">
                EXTRATO FINANCEIRO
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {filteredTransactions.length} lançamentos filtrados
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
                  EXTRATO DE FLUXO DE CAIXA
                </div>
                <div>Emissão: {new Intl.DateTimeFormat("pt-BR").format(new Date())}</div>
                <div>Status do Filtro: {statusFilter.toUpperCase()}</div>
              </div>
            </div>

            {/* Resumo Consolidado de Saldos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Receitas Realizadas
                </span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {formatCurrency(totals.realIncome)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Despesas Pagas
                </span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatCurrency(totals.realExpense)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Saldo Líquido em Caixa
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    totals.currentBalance >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatCurrency(totals.currentBalance)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Previsão Futura
                </span>
                <span className="font-mono font-bold text-sm text-amber-700">
                  {formatCurrency(totals.pendingIncome - totals.pendingExpense)}
                </span>
              </div>
            </div>

            {/* Tabela de Lançamentos */}
            <div>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-bold bg-slate-100">
                    <th className="py-2 px-2">Data</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2">Descrição</th>
                    <th className="py-2 px-2">Categoria</th>
                    <th className="py-2 px-2">Cliente / Fornecedor</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-2 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTransactions.map((t) => {
                    const isIncome = t.type === "entrada";
                    const isDone = t.status === "efetivado";
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 font-mono whitespace-nowrap">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-2 px-2 font-medium whitespace-nowrap">
                          {isIncome ? "Recebimento" : "Despesa"}
                        </td>
                        <td className="py-2 px-2">
                          <span className="font-semibold text-slate-900">{t.description}</span>
                          {t.notes && <p className="text-[10px] text-slate-500">{t.notes}</p>}
                        </td>
                        <td className="py-2 px-2 text-slate-700">{t.category}</td>
                        <td className="py-2 px-2 text-slate-700">
                          {isIncome ? t.customerName || "-" : t.supplierName || "-"}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isDone ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isDone ? "Efetivado" : "Pendente"}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-mono font-bold whitespace-nowrap ${
                            isIncome ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {isIncome ? "+" : "-"} {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé / Assinatura */}
            <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
              <div>
                <p>NEXT GESTÃO ERP · Gestão de Serviços Elétricos</p>
                <p>Documento gerado automaticamente para controle financeiro e fiscal</p>
              </div>
              <div className="text-center w-64 border-t border-slate-400 pt-2 font-medium text-slate-700">
                {db.settings.companyName}
                <br />
                Responsável Financeiro
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
