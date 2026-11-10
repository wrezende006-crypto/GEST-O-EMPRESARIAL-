"use client";

import React, { useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  PackageCheck,
  FileSpreadsheet,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import { generateId } from "@/lib/utils";
import type { Supplier } from "@/lib/types";

export function Suppliers() {
  const { db, saveSupplier, deleteSupplier } = useERP();
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const [formData, setFormData] = useState<Supplier>({
    id: "",
    name: "",
    document: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    supplyType: "Cabos e Materiais Elétricos",
    notes: "",
  });

  const handleFetchCnpj = async (cnpjToQuery?: string) => {
    const rawCnpj = cnpjToQuery || formData.document;
    const clean = rawCnpj.replace(/\D/g, "");
    if (clean.length !== 14) {
      alert("Por favor, informe um CNPJ completo com 14 dígitos.");
      return;
    }

    try {
      setLoadingCnpj(true);
      const res = await fetch(`/api/cnpj/${clean}`);
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        const formattedAddress = [d.logradouro, d.numero, d.bairro, d.municipio, d.uf]
          .filter(Boolean)
          .join(", ");

        setFormData((prev) => ({
          ...prev,
          name: d.razao_social || d.nome_fantasia || prev.name,
          contactPerson: d.nome_fantasia || prev.contactPerson,
          address: formattedAddress || prev.address,
          phone: d.telefone || prev.phone,
          email: d.email || prev.email,
          notes: `Situação: ${d.situacao_cadastral} (Receita Federal)${prev.notes ? `\n${prev.notes}` : ""}`,
        }));
        alert(`Dados do Fornecedor localizados na Receita!\n${d.razao_social}`);
      } else {
        alert(json.error || "Não foi possível consultar este CNPJ.");
      }
    } catch {
      alert("Erro ao consultar CNPJ.");
    } finally {
      setLoadingCnpj(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return db.suppliers.filter((s) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const nameMatch = s.name.toLowerCase().includes(q);
        const typeMatch = s.supplyType.toLowerCase().includes(q);
        const contactMatch = s.contactPerson.toLowerCase().includes(q);
        if (!nameMatch && !typeMatch && !contactMatch) return false;
      }
      return true;
    });
  }, [db.suppliers, searchTerm]);

  const handleOpenNew = () => {
    setEditingSupplier(null);
    setFormData({
      id: generateId("supp"),
      name: "",
      document: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      supplyType: "Distribuidora de Materiais Elétricos",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData(s);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSupplier(formData);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Barra de Ações */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por fornecedor, produto ou contato..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const csvRows = [
                ["Relatório de Fornecedores Cadastrados"],
                ["Empresa", db.settings.companyName],
                ["Data de Emissao", new Intl.DateTimeFormat("pt-BR").format(new Date())],
                ["Total de Fornecedores", filteredSuppliers.length.toString()],
                [],
                ["Razao Social / Fornecedor", "Tipo de Fornecimento", "CNPJ / CPF", "Contato Comercial", "Telefone", "E-mail", "Endereco", "Condicoes Comerciais / Obs"],
              ];

              filteredSuppliers.forEach((s) => {
                csvRows.push([
                  `"${s.name.replace(/"/g, '""')}"`,
                  `"${s.supplyType.replace(/"/g, '""')}"`,
                  s.document || "-",
                  `"${(s.contactPerson || "").replace(/"/g, '""')}"`,
                  s.phone || "-",
                  s.email || "-",
                  `"${(s.address || "").replace(/"/g, '""')}"`,
                  `"${(s.notes || "").replace(/"/g, '""')}"`,
                ]);
              });

              const csvContent = "\uFEFF" + csvRows.map((e) => e.join(";")).join("\n");
              const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `fornecedores_${new Date().toISOString().split("T")[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Exportar fornecedores para planilha Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Fornecedor</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de Fornecedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((s) => (
          <div
            key={s.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm leading-tight">
                    {s.name}
                  </h3>
                  <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                    {s.supplyType}
                  </p>
                </div>
                <span className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                  <Truck className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span>CNPJ / CPF:</span>
                  <span className="font-mono text-slate-300">{s.document || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contato Comercial:</span>
                  <span className="text-slate-200 font-medium">{s.contactPerson || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Telefone:</span>
                  <span className="font-mono text-slate-300">{s.phone || "-"}</span>
                </div>
                {s.email && (
                  <div className="flex justify-between">
                    <span>E-mail:</span>
                    <span className="text-slate-300 truncate max-w-[180px]">{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex justify-between">
                    <span>Endereço:</span>
                    <span className="text-slate-300 truncate max-w-[180px]">{s.address}</span>
                  </div>
                )}
              </div>

              {s.notes && (
                <p className="text-[11px] text-slate-500 mt-2.5 p-2 rounded bg-slate-950 border border-slate-800 line-clamp-2">
                  {s.notes}
                </p>
              )}
            </div>

            {/* Ações */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => handleEdit(s)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Excluir fornecedor ${s.name}?`)) {
                    deleteSupplier(s.id);
                  }
                }}
                className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Modal de Cadastro / Edição */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <span>
                  {editingSupplier ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}
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
                  Razão Social / Nome Fantasia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: EletroComercial Andorinha Distribuidora Ltda."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      CNPJ ou CPF
                    </label>
                    <button
                      type="button"
                      disabled={loadingCnpj}
                      onClick={() => handleFetchCnpj()}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer disabled:opacity-50"
                    >
                      {loadingCnpj ? "Consultando Receita..." : "Buscar Dados do CNPJ"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.document}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, document: val }));
                      const clean = val.replace(/\D/g, "");
                      if (clean.length === 14) {
                        handleFetchCnpj(val);
                      }
                    }}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipo de Fornecimento
                  </label>
                  <input
                    type="text"
                    value={formData.supplyType}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, supplyType: e.target.value }))
                    }
                    placeholder="Ex: Cabos, Painéis LED, Andaimes, Combustível"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Contato Comercial
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))
                    }
                    placeholder="Vendedor / Gerente"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="(11) 3300-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
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
                    placeholder="vendas@fornecedor.com.br"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Rua, número, bairro e cidade"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Condições Comerciais e Observações
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Prazo para faturamento (28 dias, 5% de desconto no PIX, etc.)"
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
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
