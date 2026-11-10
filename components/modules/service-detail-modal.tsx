"use client";

import React, { useState, useMemo } from "react";
import {
  Wrench,
  Users,
  Package,
  HardHat,
  Truck,
  DollarSign,
  Calculator,
  FileSpreadsheet,
  History,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Save,
  ArrowRight,
  TrendingUp,
  Percent,
  Printer,
  Download,
  X,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  toInputDate,
  fromInputDate,
  calculatePriceFromMargin,
  calculateMarginFromPrice,
  getServiceCostSummary,
  generateId,
} from "@/lib/utils";
import type {
  ElectricalService,
  ServiceStatus,
  ServiceMaterial,
  ServiceTeamMember,
  ServiceAdditionalExpense,
  ServiceAttachment,
} from "@/lib/types";

interface ServiceDetailModalProps {
  serviceId: string;
  onClose: () => void;
  onNavigateToProposals?: () => void;
  onNavigateToCashflow?: (serviceId: string) => void;
}

type TabKey =
  | "dados_gerais"
  | "equipe"
  | "materiais"
  | "mao_de_obra"
  | "despesas"
  | "financeiro"
  | "rentabilidade"
  | "proposta"
  | "historico";

export function ServiceDetailModal({
  serviceId,
  onClose,
  onNavigateToProposals,
  onNavigateToCashflow,
}: ServiceDetailModalProps) {
  const { db, saveService, saveProposal, showToast } = useERP();

  const originalService = useMemo(
    () => db.services.find((s) => s.id === serviceId),
    [db.services, serviceId]
  );

  const [activeTab, setActiveTab] = useState<TabKey>("dados_gerais");
  const [service, setService] = useState<ElectricalService>(
    originalService || {
      id: generateId("serv"),
      code: "OS-2026-NOVA",
      title: "",
      description: "",
      customerId: db.customers[0]?.id || "",
      customerName: db.customers[0]?.name || "",
      executionAddress: "",
      status: "orcamento",
      technicalLead: db.settings.technicalLead,
      openingDate: new Intl.DateTimeFormat("pt-BR").format(new Date()),
      expectedStartDate: new Intl.DateTimeFormat("pt-BR").format(new Date()),
      expectedEndDate: new Intl.DateTimeFormat("pt-BR").format(new Date()),
      contractedValue: 0,
      pricingMode: "target_margin",
      targetMarginPercent: db.settings.defaultTargetMargin,
      taxPercent: db.settings.defaultTaxPercent,
      cardFeePercent: 0,
      team: [],
      materials: [],
      additionalExpenses: [],
      attachments: [],
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  // New item temp states for tabs
  const [newMaterial, setNewMaterial] = useState<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    supplierId: string;
  }>({
    name: "",
    quantity: 1,
    unit: "un",
    unitPrice: 0,
    supplierId: "",
  });

  const [newTeamMember, setNewTeamMember] = useState<{
    collaboratorId: string;
    role: string;
    daysWorked: number;
    hoursWorked: number;
    rateType: "diaria" | "hora";
    rateValue: number;
  }>({
    collaboratorId: db.collaborators[0]?.id || "",
    role: db.collaborators[0]?.role || "Eletricista",
    daysWorked: 1,
    hoursWorked: 8,
    rateType: "diaria",
    rateValue: db.collaborators[0]?.dailyRate || 250,
  });

  const [newExpense, setNewExpense] = useState<{
    description: string;
    category: string;
    amount: number;
    isRealized: boolean;
  }>({
    description: "",
    category: "Combustível e transporte",
    amount: 0,
    isRealized: true,
  });

  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentType, setNewAttachmentType] = useState<"foto" | "documento" | "nota_fiscal" | "art_laudo">("foto");
  const [pdfDossierOpen, setPdfDossierOpen] = useState(false);

  // Summary calculation
  const summary = useMemo(() => getServiceCostSummary(service), [service]);

  const handleExportOSCSV = () => {
    const csvRows = [
      ["Dossiê de Custos e Execução da Obra Elétrica", service.code],
      ["Título da Obra", `"${service.title.replace(/"/g, '""')}"`],
      ["Cliente", `"${service.customerName.replace(/"/g, '""')}"`],
      ["Endereço", `"${service.executionAddress.replace(/"/g, '""')}"`],
      ["Status", service.status],
      ["Responsável Técnico", service.technicalLead],
      ["Data de Abertura", service.openingDate],
      ["Início Previsto", service.expectedStartDate],
      ["Conclusão Prevista", service.expectedEndDate],
      [],
      ["RESUMO FINANCEIRO DA OBRA"],
      ["Preço de Venda Contratado (R$)", service.contractedValue.toFixed(2)],
      ["Custo Direto de Materiais (R$)", summary.materialsCost.toFixed(2)],
      ["Custo de Equipe e Mão de Obra (R$)", summary.laborCost.toFixed(2)],
      ["Despesas Adicionais / Transporte (R$)", summary.additionalExpensesCost.toFixed(2)],
      ["Custo Total Consolidado (R$)", summary.totalCost.toFixed(2)],
      ["Lucro Bruto Operacional (R$)", summary.grossProfit.toFixed(2)],
      ["Margem de Lucro Bruta (%)", summary.marginPercent.toFixed(2)],
      [],
      ["RELAÇÃO DE MATERIAIS UTILIZADOS"],
      ["Material / Insumo", "Quantidade", "Unidade", "Preço Unitário (R$)", "Total (R$)"],
      ...service.materials.map((m) => [
        `"${m.name.replace(/"/g, '""')}"`,
        m.quantity.toString(),
        m.unit,
        m.unitPrice.toFixed(2),
        (m.totalPrice || m.quantity * m.unitPrice).toFixed(2),
      ]),
      [],
      ["EQUIPE TÉCNICA ALOCADA"],
      ["Colaborador", "Função", "Dias Alocados", "Diária / Taxa (R$)", "Custo Total (R$)"],
      ...service.team.map((t) => [
        `"${t.collaboratorName.replace(/"/g, '""')}"`,
        `"${t.role.replace(/"/g, '""')}"`,
        t.daysWorked.toString(),
        t.rateValue.toFixed(2),
        t.totalCost.toFixed(2),
      ]),
    ];

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(";")).join("\n");
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dossie_os_${service.code}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Transações vinculadas
  const linkedTransactions = useMemo(
    () => db.transactions.filter((t) => t.serviceId === service.id),
    [db.transactions, service.id]
  );

  const receivedFromClient = useMemo(
    () =>
      linkedTransactions
        .filter((t) => t.type === "entrada" && t.status === "efetivado")
        .reduce((acc, t) => acc + t.amount, 0),
    [linkedTransactions]
  );

  const pendingFromClient = useMemo(
    () =>
      linkedTransactions
        .filter((t) => t.type === "entrada" && t.status === "pendente")
        .reduce((acc, t) => acc + t.amount, 0),
    [linkedTransactions]
  );

  const expensesPaid = useMemo(
    () =>
      linkedTransactions
        .filter((t) => t.type === "saida" && t.status === "efetivado")
        .reduce((acc, t) => acc + t.amount, 0),
    [linkedTransactions]
  );

  // Tab 7 Calculator State
  const [calcMarginTarget, setCalcMarginTarget] = useState<number>(
    service.targetMarginPercent || 35
  );

  const calculatedSuggestion = useMemo(() => {
    return calculatePriceFromMargin(
      summary.totalCost,
      calcMarginTarget,
      service.taxPercent || 0,
      service.cardFeePercent || 0
    );
  }, [summary.totalCost, calcMarginTarget, service.taxPercent, service.cardFeePercent]);

  // Salvar serviço
  const handleSaveAll = async () => {
    const updated: ElectricalService = {
      ...service,
      updatedAt: new Date().toISOString(),
    };
    await saveService(updated);
    onClose();
  };

  // 1. Add Material
  const handleAddMaterial = () => {
    if (!newMaterial.name || newMaterial.unitPrice <= 0) {
      alert("Preencha o nome do material e valor unitário válido.");
      return;
    }
    const item: ServiceMaterial = {
      id: generateId("mat"),
      name: newMaterial.name,
      quantity: Number(newMaterial.quantity) || 1,
      unit: newMaterial.unit,
      unitPrice: Number(newMaterial.unitPrice) || 0,
      totalPrice: (Number(newMaterial.quantity) || 1) * (Number(newMaterial.unitPrice) || 0),
      supplierId: newMaterial.supplierId || undefined,
      isRealized: true,
    };

    setService((prev) => ({
      ...prev,
      materials: [...(prev.materials || []), item],
      history: [
        {
          id: generateId("log"),
          date: new Intl.DateTimeFormat("pt-BR").format(new Date()),
          author: "Administrador",
          action: "Material Adicionado",
          details: `Adicionado material: ${item.name} (${item.quantity} ${item.unit})`,
        },
        ...(prev.history || []),
      ],
    }));

    setNewMaterial({
      name: "",
      quantity: 1,
      unit: "un",
      unitPrice: 0,
      supplierId: "",
    });
  };

  const handleRemoveMaterial = (id: string) => {
    setService((prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m.id !== id),
    }));
  };

  // 2. Add Team Member
  const handleAddTeamMember = () => {
    const collab = db.collaborators.find((c) => c.id === newTeamMember.collaboratorId);
    if (!collab) return;

    const totalCost =
      newTeamMember.rateType === "diaria"
        ? (Number(newTeamMember.daysWorked) || 1) * (Number(newTeamMember.rateValue) || 0)
        : (Number(newTeamMember.hoursWorked) || 8) * (Number(newTeamMember.rateValue) || 0);

    const member: ServiceTeamMember = {
      id: generateId("tm"),
      collaboratorId: collab.id,
      collaboratorName: collab.name,
      role: newTeamMember.role || collab.role,
      daysWorked: Number(newTeamMember.daysWorked) || 0,
      hoursWorked: Number(newTeamMember.hoursWorked) || 0,
      rateType: newTeamMember.rateType,
      rateValue: Number(newTeamMember.rateValue),
      totalCost,
    };

    setService((prev) => ({
      ...prev,
      team: [...(prev.team || []), member],
      history: [
        {
          id: generateId("log"),
          date: new Intl.DateTimeFormat("pt-BR").format(new Date()),
          author: "Administrador",
          action: "Alocação de Colaborador",
          details: `Alocado ${member.collaboratorName} (${member.role})`,
        },
        ...(prev.history || []),
      ],
    }));
  };

  const handleRemoveTeamMember = (id: string) => {
    setService((prev) => ({
      ...prev,
      team: prev.team.filter((t) => t.id !== id),
    }));
  };

  // 3. Add Additional Expense
  const handleAddExpense = () => {
    if (!newExpense.description || newExpense.amount <= 0) {
      alert("Preencha a descrição e valor da despesa.");
      return;
    }
    const exp: ServiceAdditionalExpense = {
      id: generateId("exp"),
      description: newExpense.description,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      date: new Intl.DateTimeFormat("pt-BR").format(new Date()),
      isRealized: newExpense.isRealized,
    };

    setService((prev) => ({
      ...prev,
      additionalExpenses: [...(prev.additionalExpenses || []), exp],
    }));

    setNewExpense({
      description: "",
      category: "Combustível e transporte",
      amount: 0,
      isRealized: true,
    });
  };

  const handleRemoveExpense = (id: string) => {
    setService((prev) => ({
      ...prev,
      additionalExpenses: prev.additionalExpenses.filter((e) => e.id !== id),
    }));
  };

  // 4. Add Attachment
  const handleAddAttachment = () => {
    if (!newAttachmentName) {
      alert("Informe o nome do arquivo ou documento.");
      return;
    }
    const att: ServiceAttachment = {
      id: generateId("att"),
      name: newAttachmentName,
      type: newAttachmentType,
      url: "/images/logo.jpg",
      uploadDate: new Intl.DateTimeFormat("pt-BR").format(new Date()),
      notes: "Documento anexado no ERP",
    };
    setService((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), att],
      history: [
        {
          id: generateId("log"),
          date: new Intl.DateTimeFormat("pt-BR").format(new Date()),
          author: "Administrador",
          action: "Arquivo Anexado",
          details: `Anexado arquivo: ${att.name}`,
        },
        ...(prev.history || []),
      ],
    }));
    setNewAttachmentName("");
  };

  // 5. Generate Commercial Proposal from Service
  const handleGenerateProposal = async () => {
    const propId = generateId("prop");
    const today = new Intl.DateTimeFormat("pt-BR").format(new Date());

    const items = [
      ...service.materials.map((m) => ({
        id: generateId("pi"),
        type: "material" as const,
        description: m.name,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.unitPrice,
        totalPrice: m.totalPrice,
      })),
      {
        id: generateId("pi"),
        type: "servico" as const,
        description: `Mão de obra e execução técnica especializada: ${service.title}`,
        quantity: 1,
        unit: "serviço",
        unitPrice: summary.laborCost + summary.additionalExpensesCost + summary.grossProfit,
        totalPrice: summary.laborCost + summary.additionalExpensesCost + summary.grossProfit,
      },
    ];

    await saveProposal({
      id: propId,
      code: `PROP-2026-${Math.floor(100 + Math.random() * 900)}`,
      customerId: service.customerId,
      customerName: service.customerName,
      serviceId: service.id,
      serviceTitle: service.title,
      issueDate: today,
      validUntil: today,
      scopeOfWork: service.description,
      includedMaterials: service.materials.map((m) => `${m.quantity} ${m.unit} ${m.name}`).join(", ") || "Conforme relação de materiais",
      includedServices: "Mão de obra especializada, supervisão técnica de Engenheiro Eletricista com ART e testes de conformidade NBR 5410.",
      executionDeadline: "A combinar com o cliente",
      paymentTerms: "50% de entrada e 50% na conclusão da obra",
      warrantyTerms: "12 meses de garantia sobre a instalação",
      totalValue: service.contractedValue,
      status: "em_elaboracao",
      items,
      createdAt: new Date().toISOString(),
    });

    setService((prev) => ({ ...prev, proposalId: propId }));
    showToast("Proposta comercial vinculada gerada com sucesso!", "success");
    setActiveTab("proposta");
  };

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "dados_gerais", label: "1. Dados Gerais", icon: Wrench },
    { key: "equipe", label: "2. Equipe Técnica", icon: HardHat },
    { key: "materiais", label: "3. Materiais", icon: Package },
    { key: "mao_de_obra", label: "4. Mão de Obra", icon: Users },
    { key: "despesas", label: "5. Despesas Adicionais", icon: Truck },
    { key: "financeiro", label: "6. Financeiro", icon: DollarSign },
    { key: "rentabilidade", label: "7. Custos & Rentabilidade", icon: Calculator },
    { key: "proposta", label: "8. Proposta Comercial", icon: FileSpreadsheet },
    { key: "historico", label: "9. Histórico & Anexos", icon: History },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[94vh] overflow-hidden">
        {/* Header do Modal com Código, Título e Salvar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-slate-950 bg-amber-400 px-2 py-1 rounded-md">
              {service.code}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{service.title || "Novo Serviço Elétrico"}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Cliente: <strong className="text-slate-200">{service.customerName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportOSCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Exportar planilha de custos da obra para Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar Excel (CSV)</span>
            </button>

            <button
              onClick={() => setPdfDossierOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Gerar Dossiê da Obra em PDF com Logotipo"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimir Dossiê (PDF)</span>
            </button>

            <button
              onClick={handleSaveAll}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de Navegação das 9 Abas */}
        <div className="flex items-center gap-1 overflow-x-auto p-1.5 bg-slate-950 border-b border-slate-800 text-xs no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo das Abas (Rolável) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-900/60">
          {/* ============================================================== */}
          {/* ABA 1: DADOS GERAIS */}
          {/* ============================================================== */}
          {activeTab === "dados_gerais" && (
            <div className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome / Título do Serviço *
                  </label>
                  <input
                    type="text"
                    value={service.title}
                    onChange={(e) =>
                      setService((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Ex: Reforma Completa do QGBT ou Instalação Trifásica"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cliente Relacionado *
                  </label>
                  <select
                    value={service.customerId}
                    onChange={(e) => {
                      const cust = db.customers.find((c) => c.id === e.target.value);
                      setService((prev) => ({
                        ...prev,
                        customerId: e.target.value,
                        customerName: cust?.name || "",
                        executionAddress: cust?.address || prev.executionAddress,
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
                  >
                    {db.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.document})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Endereço Completo de Execução
                </label>
                <input
                  type="text"
                  value={service.executionAddress}
                  onChange={(e) =>
                    setService((prev) => ({ ...prev, executionAddress: e.target.value }))
                  }
                  placeholder="Ex: Rua Bela Cintra, 840 - Subsolo 2 - Painel Geral"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status da Ordem de Serviço
                  </label>
                  <select
                    value={service.status}
                    onChange={(e) =>
                      setService((prev) => ({
                        ...prev,
                        status: e.target.value as ServiceStatus,
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="orcamento">Orçamento</option>
                    <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="aguardando_execucao">Aguardando Execução</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Responsável Técnico (CREA/CFT)
                  </label>
                  <input
                    type="text"
                    value={service.technicalLead}
                    onChange={(e) =>
                      setService((prev) => ({ ...prev, technicalLead: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">
                    Valor Contratado (Preço Venda R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={service.contractedValue}
                    onChange={(e) =>
                      setService((prev) => ({
                        ...prev,
                        contractedValue: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Data de Abertura
                  </label>
                  <input
                    type="date"
                    value={toInputDate(service.openingDate)}
                    onChange={(e) =>
                      setService((prev) => ({
                        ...prev,
                        openingDate: fromInputDate(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Data Prevista de Início
                  </label>
                  <input
                    type="date"
                    value={toInputDate(service.expectedStartDate)}
                    onChange={(e) =>
                      setService((prev) => ({
                        ...prev,
                        expectedStartDate: fromInputDate(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Data Prevista de Conclusão
                  </label>
                  <input
                    type="date"
                    value={toInputDate(service.expectedEndDate)}
                    onChange={(e) =>
                      setService((prev) => ({
                        ...prev,
                        expectedEndDate: fromInputDate(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição Técnica Detalhada do Escopo
                </label>
                <textarea
                  rows={4}
                  value={service.description}
                  onChange={(e) =>
                    setService((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Detalhamento técnico dos circuitos, disjuntores, ensaios e normas aplicáveis (ex: ABNT NBR 5410, NR-10)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 2: EQUIPE TÉCNICA */}
          {/* ============================================================== */}
          {activeTab === "equipe" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-amber-400" />
                  <span>Alocar Colaborador no Serviço</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Colaborador
                    </label>
                    <select
                      value={newTeamMember.collaboratorId}
                      onChange={(e) => {
                        const c = db.collaborators.find((col) => col.id === e.target.value);
                        setNewTeamMember((prev) => ({
                          ...prev,
                          collaboratorId: e.target.value,
                          role: c?.role || prev.role,
                          rateValue: c?.dailyRate || prev.rateValue,
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      {db.collaborators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.role} - R$ {c.dailyRate}/dia)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Função na Obra
                    </label>
                    <input
                      type="text"
                      value={newTeamMember.role}
                      onChange={(e) =>
                        setNewTeamMember((prev) => ({ ...prev, role: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Dias Trabalhados
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newTeamMember.daysWorked}
                      onChange={(e) =>
                        setNewTeamMember((prev) => ({
                          ...prev,
                          daysWorked: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddTeamMember}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Alocar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabela de Equipe */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Profissional</th>
                      <th className="py-2.5 px-3">Função</th>
                      <th className="py-2.5 px-3 text-center">Dias Alocados</th>
                      <th className="py-2.5 px-3 text-right">Valor Diária</th>
                      <th className="py-2.5 px-3 text-right">Custo Total</th>
                      <th className="py-2.5 px-3 text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {service.team.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          Nenhum colaborador alocado neste serviço.
                        </td>
                      </tr>
                    ) : (
                      service.team.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">
                            {member.collaboratorName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{member.role}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-300">
                            {member.daysWorked} {member.daysWorked === 1 ? "dia" : "dias"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {formatCurrency(member.rateValue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                            {formatCurrency(member.totalCost)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveTeamMember(member.id)}
                              className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {service.team.length > 0 && (
                    <tfoot className="bg-slate-950 font-bold border-t border-slate-800">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-300">
                          Total Mão de Obra Equipe:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-400 text-sm">
                          {formatCurrency(summary.laborCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 3: MATERIAIS UTILIZADOS */}
          {/* ============================================================== */}
          {activeTab === "materiais" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-400" />
                  <span>Adicionar Material / Componente Elétrico</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Descrição do Material (Fios, Cabos, Disjuntores, etc.)
                    </label>
                    <input
                      type="text"
                      value={newMaterial.name}
                      onChange={(e) =>
                        setNewMaterial((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Ex: Cabo Cobre 10mm² Prysmian ou DPS Clamper"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0.1"
                      value={newMaterial.quantity}
                      onChange={(e) =>
                        setNewMaterial((prev) => ({
                          ...prev,
                          quantity: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Unidade
                    </label>
                    <select
                      value={newMaterial.unit}
                      onChange={(e) =>
                        setNewMaterial((prev) => ({ ...prev, unit: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="un">un (Unidade)</option>
                      <option value="metros">metros</option>
                      <option value="barras">barras</option>
                      <option value="rolo">rolo</option>
                      <option value="kit">kit</option>
                      <option value="par">par</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Preço Unitário (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newMaterial.unitPrice || ""}
                      onChange={(e) =>
                        setNewMaterial((prev) => ({
                          ...prev,
                          unitPrice: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddMaterial}
                      className="w-full py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Inserir</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabela de Materiais */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Item / Material</th>
                      <th className="py-2.5 px-3 text-center">Quantidade</th>
                      <th className="py-2.5 px-3 text-center">Unidade</th>
                      <th className="py-2.5 px-3 text-right">Preço Unitário</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {service.materials.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          Nenhum material lançado para este serviço.
                        </td>
                      </tr>
                    ) : (
                      service.materials.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">
                            {m.name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {m.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400">
                            {m.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {formatCurrency(m.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-400">
                            {formatCurrency(m.totalPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveMaterial(m.id)}
                              className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {service.materials.length > 0 && (
                    <tfoot className="bg-slate-950 font-bold border-t border-slate-800">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-300">
                          Custo Total dos Materiais:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-sky-400 text-sm">
                          {formatCurrency(summary.materialsCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 4: MÃO DE OBRA */}
          {/* ============================================================== */}
          {activeTab === "mao_de_obra" && (
            <div className="space-y-4 max-w-2xl">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-slate-200">
                  Resumo de Mão de Obra e Diárias
                </h4>
                <p className="text-xs text-slate-400">
                  O custo da mão de obra é alimentado diretamente pelos colaboradores alocados na aba &quot;Equipe Técnica&quot;.
                </p>

                <div className="p-3 bg-slate-900 rounded-lg flex items-center justify-between border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-300 font-medium">
                      Colaboradores na Obra:
                    </span>
                    <p className="text-xs text-slate-400">
                      {service.team.length} profissionais alocados
                    </p>
                  </div>
                  <span className="text-lg font-mono font-bold text-amber-400">
                    {formatCurrency(summary.laborCost)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 5: DESPESAS ADICIONAIS */}
          {/* ============================================================== */}
          {activeTab === "despesas" && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span>Lançar Despesa Operacional (Combustível, Andaime, Alimentação)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Descrição da Despesa
                    </label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Ex: Locação de andaime ou Combustível da van"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Categoria
                    </label>
                    <select
                      value={newExpense.category}
                      onChange={(e) =>
                        setNewExpense((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="Combustível e transporte">Combustível</option>
                      <option value="Locação de ferramentas">Locação Equipamentos</option>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Terceirizados">Terceirizados</option>
                      <option value="Taxas e ART">Taxas e ART</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newExpense.amount || ""}
                      onChange={(e) =>
                        setNewExpense((prev) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddExpense}
                      className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabela de despesas */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-3 text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {service.additionalExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          Nenhuma despesa adicional vinculada.
                        </td>
                      </tr>
                    ) : (
                      service.additionalExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">
                            {exp.description}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{exp.category}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {formatDate(exp.date)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                            {formatCurrency(exp.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveExpense(exp.id)}
                              className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {service.additionalExpenses.length > 0 && (
                    <tfoot className="bg-slate-950 font-bold border-t border-slate-800">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right text-slate-300">
                          Total Despesas Adicionais:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-400 text-sm">
                          {formatCurrency(summary.additionalExpensesCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 6: FINANCEIRO DO SERVIÇO */}
          {/* ============================================================== */}
          {activeTab === "financeiro" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">
                    Valor Total Contratado
                  </span>
                  <span className="text-xl font-mono font-bold text-slate-100">
                    {formatCurrency(service.contractedValue)}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">
                    Recebido Efetivamente (PIX/Conta)
                  </span>
                  <span className="text-xl font-mono font-bold text-emerald-400">
                    {formatCurrency(receivedFromClient)}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">
                    Saldo Restante a Receber
                  </span>
                  <span className="text-xl font-mono font-bold text-amber-400">
                    {formatCurrency(Math.max(0, service.contractedValue - receivedFromClient))}
                  </span>
                </div>
              </div>

              {/* Lançamentos vinculados */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-200">
                    Movimentações Financeiras Vinculadas no Fluxo de Caixa
                  </h4>
                  {onNavigateToCashflow && (
                    <button
                      onClick={() => onNavigateToCashflow(service.id)}
                      className="text-xs text-amber-400 hover:underline font-medium"
                    >
                      Abrir no Fluxo de Caixa →
                    </button>
                  )}
                </div>

                {linkedTransactions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    Nenhum lançamento no fluxo de caixa explicitamente vinculado a esta OS ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedTransactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                                t.type === "entrada"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {t.type}
                            </span>
                            <span className="font-semibold text-slate-200">
                              {t.description}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDate(t.date)} · Status: {t.status}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold text-xs ${
                            t.type === "entrada" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {t.type === "entrada" ? "+" : "-"} {formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 7: CUSTOS E RENTABILIDADE (CALCULADORA AUTOMÁTICA) */}
          {/* ============================================================== */}
          {activeTab === "rentabilidade" && (
            <div className="space-y-6">
              {/* Painel visual de formação de preços */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Custo Total da Obra</span>
                  <span className="text-xl font-mono font-bold text-rose-400">
                    {formatCurrency(summary.totalCost)}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                    <div>Materiais: {formatCurrency(summary.materialsCost)}</div>
                    <div>Mão de Obra: {formatCurrency(summary.laborCost)}</div>
                    <div>Despesas: {formatCurrency(summary.additionalExpensesCost)}</div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Preço de Venda Definido</span>
                  <span className="text-xl font-mono font-bold text-slate-100">
                    {formatCurrency(service.contractedValue)}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                    <div>Impostos ({service.taxPercent || 0}%): {formatCurrency(summary.taxesAmount)}</div>
                    <div>Taxas Cartão: {formatCurrency(summary.feesAmount)}</div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Lucro Bruto Apurado</span>
                  <span
                    className={`text-xl font-mono font-bold ${
                      summary.grossProfit >= 0 ? "text-emerald-400" : "text-rose-500"
                    }`}
                  >
                    {formatCurrency(summary.grossProfit)}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Valor Venda - Custos Totais - Impostos
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Margem de Lucro Real</span>
                  <span
                    className={`text-2xl font-mono font-black ${
                      summary.marginPercent >= 30 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {formatNumber(summary.marginPercent)}%
                  </span>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Sobre o valor de venda total
                  </p>
                </div>
              </div>

              {/* Calculadora Interativa - Dois Modos */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-amber-400" />
                      <span>Calculadora de Formação de Preço de Venda</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Fórmula comercial padrão: <code>Preço de Venda = Custo Total / (1 - Margem Desejada)</code>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Modo A: Margem Desejada -> Preço Sugerido */}
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold text-amber-400">
                      Modo 1: Definir Margem de Lucro Desejada
                    </h5>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Margem Alvo (%)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="80"
                        value={calcMarginTarget}
                        onChange={(e) => setCalcMarginTarget(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 font-bold"
                      />
                    </div>

                    <div className="p-3 bg-slate-950 rounded-md space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Custo Total:</span>
                        <span className="font-mono text-slate-200">{formatCurrency(summary.totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Preço de Venda Sugerido:</span>
                        <span className="font-mono font-bold text-amber-400 text-sm">
                          {formatCurrency(calculatedSuggestion.salePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Lucro Bruto Projetado:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {formatCurrency(calculatedSuggestion.grossProfit)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setService((prev) => ({
                          ...prev,
                          contractedValue: calculatedSuggestion.salePrice,
                          targetMarginPercent: calcMarginTarget,
                        }));
                        showToast("Preço de venda atualizado com a margem calculada!", "success");
                      }}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Aplicar Este Preço de Venda na OS
                    </button>
                  </div>

                  {/* Modo B: Valor de Venda Informado -> Lucro e Margem */}
                  <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold text-sky-400">
                      Modo 2: Informar Preço de Venda Negociado
                    </h5>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Valor de Venda Acordado com Cliente (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={service.contractedValue}
                        onChange={(e) =>
                          setService((prev) => ({
                            ...prev,
                            contractedValue: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 font-bold"
                      />
                    </div>

                    <div className="p-3 bg-slate-950 rounded-md space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Custo Total:</span>
                        <span className="font-mono text-slate-200">{formatCurrency(summary.totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Margem de Lucro Resultante:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {formatNumber(summary.marginPercent)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Lucro Bruto Restante:</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {formatCurrency(summary.grossProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 8: PROPOSTA COMERCIAL VINCULADA */}
          {/* ============================================================== */}
          {activeTab === "proposta" && (
            <div className="space-y-4 max-w-2xl">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span>Proposta Comercial deste Serviço</span>
                  </h4>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Gere um orçamento formal com logotipo da empresa, relação discriminada de materiais, prazos e espaço para assinatura do contratante.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateProposal}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Gerar / Atualizar Proposta Comercial Formal</span>
                  </button>
                </div>

                {service.proposalId && (
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-emerald-400 font-semibold block">
                        Proposta vinculada existente
                      </span>
                      <span className="text-slate-400">
                        Pronta para visualização, impressão ou envio via WhatsApp.
                      </span>
                    </div>
                    {onNavigateToProposals && (
                      <button
                        onClick={onNavigateToProposals}
                        className="text-xs text-amber-400 hover:underline font-bold"
                      >
                        Abrir Propostas →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 9: HISTÓRICO E ANEXOS */}
          {/* ============================================================== */}
          {activeTab === "historico" && (
            <div className="space-y-6">
              {/* Anexos */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-amber-400" />
                  <span>Anexar Fotos, Documentos, NF ou ART</span>
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newAttachmentName}
                    onChange={(e) => setNewAttachmentName(e.target.value)}
                    placeholder="Nome do arquivo (ex: Foto_Quadro_Antes.jpg ou ART_CREA.pdf)"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 min-w-[200px]"
                  />
                  <select
                    value={newAttachmentType}
                    onChange={(e) =>
                      setNewAttachmentType(
                        e.target.value as "foto" | "documento" | "nota_fiscal" | "art_laudo"
                      )
                    }
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="foto">Foto de Obra</option>
                    <option value="documento">Documento Técnico</option>
                    <option value="nota_fiscal">Nota Fiscal (NF-e)</option>
                    <option value="art_laudo">ART / Laudo Técnico</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Anexar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {service.attachments.length === 0 ? (
                    <p className="text-xs text-slate-500 col-span-full">
                      Nenhum anexo adicionado ainda.
                    </p>
                  ) : (
                    service.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 truncate">
                            {att.name}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {att.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{att.uploadDate}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Histórico de alterações */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <span>Histórico e Log de Alterações da Obra</span>
                </h4>

                <div className="space-y-2">
                  {service.history.length === 0 ? (
                    <p className="text-xs text-slate-500">Sem registros de histórico.</p>
                  ) : (
                    service.history.map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                          <span className="font-semibold text-amber-400">{h.action}</span>
                          <span className="font-mono">{h.date}</span>
                        </div>
                        <p className="text-slate-200">{h.details}</p>
                        <span className="text-[10px] text-slate-500">Por: {h.author}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Folha Imprimível de Dossiê da Obra com Logo Oficial */}
      {pdfDossierOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-2 sm:p-6 flex flex-col items-center">
          {/* Barra de controle */}
          <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400">
                DOSSIÊ TÉCNICO · {service.code}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {service.title}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportOSCSV}
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
                onClick={() => setPdfDossierOpen(false)}
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
                  DOSSIÊ DE ORDEM DE SERVIÇO #{service.code}
                </div>
                <div>Emissão: {new Intl.DateTimeFormat("pt-BR").format(new Date())}</div>
                <div>Status: {service.status.toUpperCase()}</div>
              </div>
            </div>

            {/* Dados da Obra & Localização */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold">Obra / Título:</p>
                <p className="text-sm font-bold text-slate-900">{service.title}</p>
                <p className="text-slate-500 text-[10px] uppercase font-bold mt-2">Cliente:</p>
                <p className="text-xs font-semibold text-slate-800">{service.customerName}</p>
                <p className="text-slate-500 text-[10px] uppercase font-bold mt-2">Endereço de Execução:</p>
                <p className="text-xs text-slate-700">{service.executionAddress}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold">Responsável Técnico:</p>
                <p className="text-xs font-semibold text-slate-800">{service.technicalLead}</p>
                <p className="text-slate-500 text-[10px] uppercase font-bold mt-2">Cronograma Previsto:</p>
                <p className="text-xs text-slate-700 font-mono">
                  {service.expectedStartDate ? formatDate(service.expectedStartDate) : "-"} até{" "}
                  {service.expectedEndDate ? formatDate(service.expectedEndDate) : "-"}
                </p>
                <p className="text-slate-500 text-[10px] uppercase font-bold mt-2">Descrição Técnica:</p>
                <p className="text-xs text-slate-600 line-clamp-3">{service.description}</p>
              </div>
            </div>

            {/* Resumo Financeiro e Rentabilidade */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Preço de Venda (Contrato)
                </span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatCurrency(service.contractedValue)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Custo Total da Obra
                </span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatCurrency(summary.totalCost)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Lucro Bruto Operacional
                </span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {formatCurrency(summary.grossProfit)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">
                  Margem de Lucro
                </span>
                <span className="font-mono font-bold text-sm text-amber-700">
                  {formatNumber(summary.marginPercent)}%
                </span>
              </div>
            </div>

            {/* Relação de Materiais */}
            <div>
              <h3 className="font-bold text-slate-900 text-xs mb-2">1. Materiais e Equipamentos Utilizados</h3>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-bold bg-slate-100">
                    <th className="py-2 px-2">Item / Descrição</th>
                    <th className="py-2 px-2 text-center">Quantidade</th>
                    <th className="py-2 px-2 text-right">Preço Unit.</th>
                    <th className="py-2 px-2 text-right">Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {service.materials.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-2 px-2 text-slate-500 italic">
                        Nenhum material cadastrado
                      </td>
                    </tr>
                  ) : (
                    service.materials.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 px-2 font-medium text-slate-800">{m.name}</td>
                        <td className="py-2 px-2 text-center font-mono">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          {formatCurrency(m.unitPrice)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(m.totalPrice || m.quantity * m.unitPrice)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Equipe Técnica */}
            <div>
              <h3 className="font-bold text-slate-900 text-xs mb-2">2. Equipe Técnica e Mão de Obra Alocada</h3>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-bold bg-slate-100">
                    <th className="py-2 px-2">Profissional</th>
                    <th className="py-2 px-2">Função</th>
                    <th className="py-2 px-2 text-center">Dias Trabalhados</th>
                    <th className="py-2 px-2 text-right">Diária / Custo</th>
                    <th className="py-2 px-2 text-right">Subtotal (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {service.team.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-2 px-2 text-slate-500 italic">
                        Nenhum colaborador registrado nesta OS
                      </td>
                    </tr>
                  ) : (
                    service.team.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2 px-2 font-bold text-slate-800">{t.collaboratorName}</td>
                        <td className="py-2 px-2 text-slate-600">{t.role}</td>
                        <td className="py-2 px-2 text-center font-mono">{t.daysWorked} dias</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          {formatCurrency(t.rateValue)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(t.totalCost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Termo de Encerramento e Assinaturas */}
            <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-[10px] text-slate-600">
              <div className="text-center border-t border-slate-400 pt-3">
                <p className="font-bold text-slate-800">{db.settings.companyName}</p>
                <p>{service.technicalLead} · Responsável Técnico</p>
                <p>CREA: {db.settings.creaNumber}</p>
              </div>

              <div className="text-center border-t border-slate-400 pt-3">
                <p className="font-bold text-slate-800">{service.customerName}</p>
                <p>Aceite Técnico e Conclusão dos Serviços</p>
                <p>Data: ____/____/________</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
