"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  FileText,
  Wrench,
  Edit2,
  Trash2,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import { formatCurrency, generateId } from "@/lib/utils";
import type { Customer } from "@/lib/types";

interface CustomersProps {
  onOpenService?: (serviceId: string) => void;
}

export function Customers({ onOpenService }: CustomersProps) {
  const { db, saveCustomer, deleteCustomer } = useERP();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "PF" | "PJ">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const [formData, setFormData] = useState<Customer>({
    id: "",
    name: "",
    personType: "PJ",
    document: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    city: "São Paulo",
    state: "SP",
    contactPerson: "",
    notes: "",
    createdAt: new Date().toISOString(),
  });

  // Função para consultar dados reais do CNPJ na Receita Federal
  const handleFetchCnpj = async (cnpjToQuery?: string) => {
    const rawCnpj = cnpjToQuery || formData.document;
    const clean = rawCnpj.replace(/\D/g, "");
    if (clean.length !== 14) {
      alert("Por favor, digite um CNPJ completo com 14 dígitos.");
      return;
    }

    try {
      setLoadingCnpj(true);
      const res = await fetch(`/api/cnpj/${clean}`);
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        const formattedAddress = [d.logradouro, d.numero, d.bairro]
          .filter(Boolean)
          .join(", ");

        setFormData((prev) => ({
          ...prev,
          personType: "PJ",
          name: d.razao_social || d.nome_fantasia || prev.name,
          contactPerson: d.nome_fantasia || prev.contactPerson,
          address: formattedAddress || prev.address,
          city: d.municipio || prev.city,
          state: d.uf || prev.state,
          phone: d.telefone || prev.phone,
          whatsapp: prev.whatsapp || d.telefone || "",
          email: d.email || prev.email,
          notes: `Situação: ${d.situacao_cadastral} (Fonte: ${json.source || "Receita Federal"})${
            prev.notes ? `\n${prev.notes}` : ""
          }`,
        }));
        alert(`Dados do CNPJ encontrados com sucesso!\nRazão Social: ${d.razao_social}\nSituação: ${d.situacao_cadastral}`);
      } else {
        alert(json.error || "Não foi possível localizar este CNPJ.");
      }
    } catch (err) {
      alert("Falha na consulta do CNPJ. Verifique sua conexão com a internet.");
    } finally {
      setLoadingCnpj(false);
    }
  };

  // Métricas por cliente
  const customerStats = useMemo(() => {
    const stats: Record<
      string,
      { servicesCount: number; proposalsCount: number; totalBilled: number }
    > = {};

    for (const c of db.customers) {
      stats[c.id] = { servicesCount: 0, proposalsCount: 0, totalBilled: 0 };
    }

    for (const s of db.services) {
      if (stats[s.customerId]) {
        stats[s.customerId].servicesCount += 1;
        stats[s.customerId].totalBilled += s.contractedValue || 0;
      }
    }

    for (const p of db.proposals) {
      if (stats[p.customerId]) {
        stats[p.customerId].proposalsCount += 1;
      }
    }

    return stats;
  }, [db.customers, db.services, db.proposals]);

  const filteredCustomers = useMemo(() => {
    return db.customers.filter((c) => {
      if (typeFilter !== "all" && c.personType !== typeFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(q);
        const docMatch = c.document.toLowerCase().includes(q);
        const contactMatch = c.contactPerson?.toLowerCase().includes(q);
        const cityMatch = c.city.toLowerCase().includes(q);
        if (!nameMatch && !docMatch && !contactMatch && !cityMatch) return false;
      }
      return true;
    });
  }, [db.customers, typeFilter, searchTerm]);

  const handleOpenNew = () => {
    setEditingCustomer(null);
    setFormData({
      id: generateId("cust"),
      name: "",
      personType: "PJ",
      document: "",
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      city: "São Paulo",
      state: "SP",
      contactPerson: "",
      notes: "",
      createdAt: new Date().toISOString(),
    });
    setModalOpen(true);
  };

  const handleEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData(c);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCustomer(formData);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Barra de Ações */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              typeFilter === "all"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Todos ({db.customers.length})
          </button>
          <button
            onClick={() => setTypeFilter("PJ")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              typeFilter === "PJ"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pessoa Jurídica (Condomínios/Empresas)
          </button>
          <button
            onClick={() => setTypeFilter("PF")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              typeFilter === "PF"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pessoa Física (Residencial)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, documento ou cidade..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => {
              const csvRows = [
                ["Relatório de Clientes Cadastrados"],
                ["Empresa", db.settings.companyName],
                ["Data de Emissao", new Intl.DateTimeFormat("pt-BR").format(new Date())],
                ["Total de Clientes", filteredCustomers.length.toString()],
                [],
                ["Nome / Razao Social", "Tipo", "CNPJ / CPF", "Contato", "Telefone", "WhatsApp", "E-mail", "Endereco", "Cidade", "UF", "Obras", "Faturamento (R$)"],
              ];

              filteredCustomers.forEach((c) => {
                const stats = customerStats[c.id] || { servicesCount: 0, proposalsCount: 0, totalBilled: 0 };
                csvRows.push([
                  `"${c.name.replace(/"/g, '""')}"`,
                  c.personType,
                  c.document || "-",
                  `"${(c.contactPerson || "").replace(/"/g, '""')}"`,
                  c.phone || "-",
                  c.whatsapp || "-",
                  c.email || "-",
                  `"${(c.address || "").replace(/"/g, '""')}"`,
                  c.city,
                  c.state,
                  stats.servicesCount.toString(),
                  stats.totalBilled.toFixed(2),
                ]);
              });

              const csvContent = "\uFEFF" + csvRows.map((e) => e.join(";")).join("\n");
              const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `clientes_${new Date().toISOString().split("T")[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Exportar clientes para planilha Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((c) => {
          const stats = customerStats[c.id] || { servicesCount: 0, proposalsCount: 0, totalBilled: 0 };
          const cleanPhone = (c.whatsapp || c.phone || "").replace(/\D/g, "");

          return (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm leading-tight">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {c.personType} · {c.document}
                    </p>
                  </div>
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/55${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                      title="Chamar no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>

                <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
                  {c.contactPerson && (
                    <div className="flex justify-between">
                      <span>Contato:</span>
                      <span className="font-medium text-slate-200">{c.contactPerson}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Telefone:</span>
                    <span className="font-mono text-slate-300">{c.phone || c.whatsapp || "-"}</span>
                  </div>
                  {c.email && (
                    <div className="flex justify-between">
                      <span>E-mail:</span>
                      <span className="text-slate-300 truncate max-w-[180px]">{c.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Local:</span>
                    <span className="text-slate-300 truncate max-w-[180px]">
                      {c.address ? `${c.address}, ${c.city}` : `${c.city} - ${c.state}`}
                    </span>
                  </div>
                </div>

                {/* Histórico na Empresa */}
                <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <div>
                    <span className="block text-slate-300 font-medium">
                      {stats.servicesCount} Obras · {stats.proposalsCount} Propostas
                    </span>
                    <span>Total Contratado:</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {formatCurrency(stats.totalBilled)}
                  </span>
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
                    if (confirm(`Excluir cadastro do cliente ${c.name}?`)) {
                      deleteCustomer(c.id);
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
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>
                  {editingCustomer ? "Editar Dados do Cliente" : "Cadastrar Novo Cliente"}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Completo / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex: Condomínio Edifício Solar das Palmeiras"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipo de Pessoa
                  </label>
                  <select
                    value={formData.personType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        personType: e.target.value as "PF" | "PJ",
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="PJ">PJ (Empresa / Condomínio)</option>
                    <option value="PF">PF (Residencial)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      {formData.personType === "PJ" ? "CNPJ da Empresa *" : "CPF do Cliente *"}
                    </label>
                    {formData.personType === "PJ" && (
                      <button
                        type="button"
                        disabled={loadingCnpj}
                        onClick={() => handleFetchCnpj()}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer disabled:opacity-50"
                      >
                        {loadingCnpj ? "Consultando Receita..." : "Buscar Dados do CNPJ"}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.document}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, document: val }));
                        // Se atingir 14 dígitos numéricos, opcionalmente consultar
                        const clean = val.replace(/\D/g, "");
                        if (clean.length === 14 && formData.personType === "PJ") {
                          handleFetchCnpj(val);
                        }
                      }}
                      placeholder={formData.personType === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-amber-500"
                    />
                    {formData.personType === "PJ" && (
                      <button
                        type="button"
                        disabled={loadingCnpj}
                        onClick={() => handleFetchCnpj()}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        title="Consultar na Receita Federal"
                      >
                        {loadingCnpj ? "..." : "Puxar"}
                      </button>
                    )}
                  </div>
                  {formData.personType === "PJ" && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Ao preencher 14 dígitos, o sistema puxa Razão Social, Endereço e Contato automaticamente.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome do Contato Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))
                    }
                    placeholder="Ex: Dra. Cláudia (Síndica) ou Gerente"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Telefone Fixo
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="(11) 3214-5500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">
                    WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))
                    }
                    placeholder="(11) 98111-2233"
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="contato@cliente.com.br"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="Rua, Número, Bairro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações Comerciais ou Técnicas
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Particularidades de acesso, horários para corte de energia, etc."
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
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
