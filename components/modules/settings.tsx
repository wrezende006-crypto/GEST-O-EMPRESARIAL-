"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Settings,
  Building2,
  Percent,
  CreditCard,
  Lock,
  Download,
  Upload,
  RefreshCcw,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  Globe,
  Key,
  Image as ImageIcon,
  UploadCloud,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import type { CompanySettings } from "@/lib/types";

export function CompanySettingsView() {
  const { db, saveSettings, changeAdminPin, resetToDefaults, showToast, updateDb } = useERP();

  const [settings, setSettings] = useState<CompanySettings>(db.settings);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [newExpenseCat, setNewExpenseCat] = useState("");
  const [newIncomeCat, setNewIncomeCat] = useState("");
  const [newServiceType, setNewServiceType] = useState("");

  const presetLogos = [
    {
      label: "Padrão NEXT GESTÃO",
      url: "/images/logo.jpg",
    },
    {
      label: "Alta Tensão Neon",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%230b1329'/><path d='M54 16L24 54h22l-6 30 36-44H52l8-24z' fill='%23f59e0b' stroke='%23fbbf24' stroke-width='2'/><circle cx='50' cy='50' r='42' stroke='%2338bdf8' stroke-width='2.5' stroke-dasharray='6 4'/></svg>",
    },
    {
      label: "Escudo Industrial",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%230f2942'/><path d='M50 14L20 28v26c0 20 30 32 30 32s30-12 30-32V28L50 14z' fill='%230284c7'/><path d='M53 26L36 52h14l-4 22 21-28H52l7-18z' fill='%23facc15'/></svg>",
    },
    {
      label: "Energia Solar & Verde",
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='16' fill='%23064e3b'/><circle cx='50' cy='50' r='32' fill='%23059669'/><path d='M54 22L36 50h14l-4 28 22-34H52l6-22z' fill='%23facc15'/><circle cx='50' cy='50' r='40' stroke='%2334d399' stroke-width='2' stroke-dasharray='4 4'/></svg>",
    },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert("A imagem selecionada é muito grande (máximo 4MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSettings((prev) => ({ ...prev, logoUrl: dataUrl }));
      showToast("Logotipo carregado! Clique em Salvar Configurações para persistir.", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(settings);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      alert("O PIN deve conter no mínimo 4 dígitos.");
      return;
    }
    if (newPin !== confirmPin) {
      alert("A confirmação do PIN não confere.");
      return;
    }
    await changeAdminPin(newPin);
    setNewPin("");
    setConfirmPin("");
  };

  const handleAddExpenseCategory = () => {
    if (!newExpenseCat) return;
    if (settings.categoriesExpense.includes(newExpenseCat)) return;
    setSettings((prev) => ({
      ...prev,
      categoriesExpense: [...prev.categoriesExpense, newExpenseCat],
    }));
    setNewExpenseCat("");
  };

  const handleRemoveExpenseCategory = (cat: string) => {
    setSettings((prev) => ({
      ...prev,
      categoriesExpense: prev.categoriesExpense.filter((c) => c !== cat),
    }));
  };

  const handleAddIncomeCategory = () => {
    if (!newIncomeCat) return;
    if (settings.categoriesIncome.includes(newIncomeCat)) return;
    setSettings((prev) => ({
      ...prev,
      categoriesIncome: [...prev.categoriesIncome, newIncomeCat],
    }));
    setNewIncomeCat("");
  };

  const handleRemoveIncomeCategory = (cat: string) => {
    setSettings((prev) => ({
      ...prev,
      categoriesIncome: prev.categoriesIncome.filter((c) => c !== cat),
    }));
  };

  const handleAddServiceType = () => {
    if (!newServiceType) return;
    if (settings.serviceTypes.includes(newServiceType)) return;
    setSettings((prev) => ({
      ...prev,
      serviceTypes: [...prev.serviceTypes, newServiceType],
    }));
    setNewServiceType("");
  };

  const handleRemoveServiceType = (st: string) => {
    setSettings((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.filter((s) => s !== st),
    }));
  };

  // Download do Backup do Banco de Dados
  const handleDownloadBackup = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `voltmaster_backup_${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Backup do banco de dados exportado com sucesso!", "success");
  };

  // Restauração de arquivo de backup
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.customers && json.services && json.transactions) {
          await updateDb(() => json);
          showToast("Backup restaurado com sucesso!", "success");
        } else {
          alert("Arquivo JSON incompatível com o esquema do NEXT GESTÃO ERP.");
        }
      } catch {
        alert("Erro ao ler arquivo de backup.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 0. Conta de Administrador / Proprietário */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Conta de Administrador (Proprietário)
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {settings.adminName?.trim() ? "Perfil Configurado" : "Conta Sem Nome (A definir)"}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Esta é a conta com acesso de controle gerencial exclusivo do sistema. Os colaboradores cadastrados não têm acesso. Digite seu nome e cargo para exibição no menu lateral e nos relatórios.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nome do Administrador
            </label>
            <input
              type="text"
              value={settings.adminName || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, adminName: e.target.value }))
              }
              placeholder="Digite seu nome (ex: Seu Nome Aqui)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Cargo / Função no ERP
            </label>
            <input
              type="text"
              value={settings.adminRole || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, adminRole: e.target.value }))
              }
              placeholder="Ex: Diretor Geral / Proprietário / Eng. Eletricista"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={async () => {
              await saveSettings(settings);
              showToast("Perfil do Administrador salvo com sucesso!", "success");
            }}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Perfil do Administrador</span>
          </button>
        </div>
      </div>

      {/* 1. Dados da Empresa e Responsabilidade Técnica */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Identificação Empresarial e Técnica
            </h3>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Campo de Logotipo Oficial da Empresa */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-100">
                  Logotipo Oficial da Empresa
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Usado automaticamente em Propostas Comerciais e PDFs exportados
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Box de Preview da Logo com fundo de folha impressa branca */}
              <div className="relative w-24 h-24 rounded-xl border border-slate-700 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden group">
                {settings.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logoUrl}
                    alt="Logo da Empresa"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-slate-400 text-[10px] text-center font-medium">
                    Sem Logo
                  </span>
                )}
                <div className="absolute inset-0 bg-slate-950/70 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Folha A4
                </div>
              </div>

              {/* Controles de Upload, URL e Presets */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs">
                    <UploadCloud className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Fazer Upload de Logo (PNG, JPG, SVG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, logoUrl: "/images/logo.jpg" }));
                      showToast("Logotipo padrão restaurado.", "info");
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-700"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>Restaurar Padrão</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.logoUrl || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, logoUrl: e.target.value }))
                    }
                    placeholder="Ou cole a URL direta da imagem (ex: https://.../minha-logo.png)"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* Modelos / Presets Rápidos */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Modelos Rápidos:</span>
                  </span>
                  {presetLogos.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSettings((prev) => ({ ...prev, logoUrl: preset.url }));
                        showToast(`Modelo '${preset.label}' aplicado!`, "success");
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Razão Social
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, companyName: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={settings.tradeName}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, tradeName: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                CNPJ
              </label>
              <input
                type="text"
                value={settings.cnpj}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, cnpj: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Inscrição Estadual (IE)
              </label>
              <input
                type="text"
                value={settings.stateRegistration}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, stateRegistration: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Responsável Técnico & CREA
              </label>
              <input
                type="text"
                value={settings.technicalLead}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, technicalLead: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Telefone Comercial
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1">
                WhatsApp de Orçamentos
              </label>
              <input
                type="text"
                value={settings.whatsapp}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, whatsapp: e.target.value }))
                }
                className="w-full bg-slate-950 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                E-mail Financeiro
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Endereço da Sede / Galpão
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, address: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Cidade / UF
              </label>
              <input
                type="text"
                value={`${settings.city}/${settings.state}`}
                onChange={(e) => {
                  const [c, s] = e.target.value.split("/");
                  setSettings((prev) => ({ ...prev, city: c || "", state: s || "" }));
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* Dados Bancários & PIX */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Dados Bancários e Recebimento via PIX</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Instituição Financeira
                </label>
                <input
                  type="text"
                  value={settings.bankName}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, bankName: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Agência / Conta
                </label>
                <input
                  type="text"
                  value={`${settings.bankAgency} / ${settings.bankAccount}`}
                  onChange={(e) => {
                    const [ag, cc] = e.target.value.split("/");
                    setSettings((prev) => ({
                      ...prev,
                      bankAgency: ag?.trim() || "",
                      bankAccount: cc?.trim() || "",
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-emerald-400 mb-1">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={settings.pixKey}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, pixKey: e.target.value }))
                  }
                  className="w-full bg-slate-950 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Tipo da Chave
                </label>
                <select
                  value={settings.pixKeyType}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      pixKeyType: e.target.value as any,
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="CNPJ">CNPJ</option>
                  <option value="Email">E-mail</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Aleatória">Chave Aleatória (EVP)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Margens e Alíquotas Padrão */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" />
              <span>Parâmetros Padrão de Formação de Preço</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Margem de Lucro Alvo Padrão (%)
                </label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={settings.defaultTargetMargin}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultTargetMargin: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Alíquota Simples Nacional / Impostos (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.defaultTaxPercent}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultTaxPercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Taxa Média de Cartão (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.defaultCardFeePercent}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultCardFeePercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Integração com API de Busca de CNPJ Real */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Consulta Automática de CNPJ Real (Receita Federal / BrasilAPI)</span>
              </h4>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                <span>BrasilAPI Ativa (Gratuita & Automática)</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ao cadastrar clientes e fornecedores, o sistema busca automaticamente a Razão Social, Nome Fantasia, Endereço Completo, CEP, Município, Telefone e Situação Cadastral direto na Receita Federal via BrasilAPI. Se você possuir um token de API próprio (ex: ReceitaWS Comercial ou CNPJ.ws), insira-o abaixo:
            </p>

            <div className="max-w-md">
              <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-400" />
                <span>Chave / Token de API CNPJ Opcional (ReceitaWS / CNPJ.ws)</span>
              </label>
              <input
                type="text"
                value={settings.cnpjApiToken || ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    cnpjApiToken: e.target.value,
                  }))
                }
                placeholder="Deixe em branco para usar a API nativa gratuita ou cole seu token"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-hidden focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Token armazenado de forma segura no servidor. Não exponha tokens públicos.
              </p>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações da Empresa</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Categorias Financeiras e Tipos de Serviços */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-100 text-sm">
          Categorias Financeiras e Tipos de Serviços
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Categorias de Despesas */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-rose-400">
              Categorias de Despesas (Saídas)
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExpenseCat}
                onChange={(e) => setNewExpenseCat(e.target.value)}
                placeholder="Nova categoria de custo..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
              <button
                type="button"
                onClick={handleAddExpenseCategory}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {settings.categoriesExpense.map((c) => (
                <span
                  key={c}
                  className="text-[11px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1.5"
                >
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExpenseCategory(c)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Categorias de Receitas */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-emerald-400">
              Categorias de Receitas (Entradas)
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newIncomeCat}
                onChange={(e) => setNewIncomeCat(e.target.value)}
                placeholder="Nova categoria de receita..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
              <button
                type="button"
                onClick={handleAddIncomeCategory}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {settings.categoriesIncome.map((c) => (
                <span
                  key={c}
                  className="text-[11px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1.5"
                >
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIncomeCategory(c)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Segurança e Senha Administrativa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-slate-100 text-sm">
            Segurança & Senha Administrativa
          </h3>
        </div>

        <form onSubmit={handleChangePin} className="max-w-md space-y-3">
          <p className="text-xs text-slate-400">
            Senha ou PIN utilizado para desbloquear o acesso gerencial ao sistema (Padrão: 1234).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Nova Senha / PIN
              </label>
              <input
                type="password"
                maxLength={8}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Mínimo 4 dígitos"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 tracking-widest text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Confirmar Senha
              </label>
              <input
                type="password"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Repita a senha"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 tracking-widest text-center"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Alterar Senha do Sistema
          </button>
        </form>
      </div>

      {/* 4. Backup, Restauração e Dados de Fábrica */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-100 text-sm">
          Backup e Persistência do Banco de Dados
        </h3>
        <p className="text-xs text-slate-400">
          Todos os dados cadastrais, lançamentos financeiros e ordens de serviço são salvos automaticamente no banco de dados. Você também pode exportar cópias de segurança em JSON a qualquer momento.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Baixar Backup Completo (JSON)</span>
          </button>

          <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer">
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Restaurar Backup (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              if (
                confirm(
                  "Atenção: Deseja zerar todos os dados do banco de dados e começar literalmente do zero?\nTodos os lançamentos, obras e cadastros serão removidos."
                )
              ) {
                resetToDefaults();
              }
            }}
            className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-rose-800/40 cursor-pointer"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Zerar Banco de Dados (Começar do Zero)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
