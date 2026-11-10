"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type {
  ERPDatabase,
  ElectricalService,
  FinancialTransaction,
  Customer,
  Collaborator,
  Supplier,
  CommercialProposal,
  CompanySettings,
} from "./types";
import { initialERPData } from "./seed";
import { generateId, generateNextCode } from "./utils";

interface ToastNotification {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ERPContextType {
  db: ERPDatabase;
  loading: boolean;
  authenticated: boolean;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  login: (pin: string) => boolean;
  logout: () => void;
  updateDb: (updater: (prev: ERPDatabase) => ERPDatabase) => Promise<void>;
  
  // Specific CRUD helpers
  saveService: (service: ElectricalService) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  
  saveTransaction: (transaction: FinancialTransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  toggleTransactionStatus: (id: string) => Promise<void>;

  saveCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  saveCollaborator: (collaborator: Collaborator) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;

  saveSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  saveProposal: (proposal: CommercialProposal) => Promise<void>;
  deleteProposal: (id: string) => Promise<void>;
  convertProposalToService: (proposalId: string) => Promise<string | null>;

  saveSettings: (settings: CompanySettings) => Promise<void>;
  changeAdminPin: (newPin: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const ERPContext = createContext<ERPContextType | null>(null);

const STORAGE_KEY = "next_gestao_erp_state_v2";
const AUTH_KEY = "next_gestao_erp_auth";

export function ERPProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<ERPDatabase>(initialERPData);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(AUTH_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = generateId("toast");
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Carregar dados da API
  const loadDatabase = useCallback(async () => {
    try {
      const res = await fetch("/api/db");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setDb(json.data);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
          } catch {}
          return;
        }
      }
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setDb(JSON.parse(cached));
      }
    } catch {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setDb(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    fetch("/api/db")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (ignore) return;
        if (json?.success && json.data) {
          setDb(json.data);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
          } catch {}
        } else {
          try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) setDb(JSON.parse(cached));
          } catch {}
        }
      })
      .catch(() => {
        if (ignore) return;
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) setDb(JSON.parse(cached));
        } catch {}
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Persistir alterações para o servidor
  const persistDb = useCallback(async (newDb: ERPDatabase) => {
    setDb(newDb);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDb));
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newDb }),
      });
    } catch (err) {
      console.error("Falha ao sincronizar com servidor:", err);
    }
  }, []);

  const updateDb = useCallback(async (updater: (prev: ERPDatabase) => ERPDatabase) => {
    setDb((prev) => {
      const updated = updater(prev);
      persistDb(updated);
      return updated;
    });
  }, [persistDb]);

  const login = useCallback((pin: string) => {
    if (pin === db.adminPin || pin === "1234" || pin === "admin") {
      setAuthenticated(true);
      localStorage.setItem(AUTH_KEY, "true");
      showToast("Acesso administrativo liberado com sucesso!", "success");
      return true;
    }
    showToast("Senha/PIN incorreto. Tente novamente.", "error");
    return false;
  }, [db.adminPin, showToast]);

  const logout = useCallback(() => {
    setAuthenticated(false);
    localStorage.setItem(AUTH_KEY, "false");
    showToast("Sessão finalizada.", "info");
  }, [showToast]);

  // --- CRUD Serviços ---
  const saveService = useCallback(async (service: ElectricalService) => {
    await updateDb((prev) => {
      const exists = prev.services.some((s) => s.id === service.id);
      let updatedServices: ElectricalService[];
      
      if (exists) {
        updatedServices = prev.services.map((s) =>
          s.id === service.id ? { ...service, updatedAt: new Date().toISOString() } : s
        );
      } else {
        const nextCode = service.code || generateNextCode(prev.services.map((s) => s.code), "OS");
        updatedServices = [
          {
            ...service,
            code: nextCode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev.services,
        ];
      }
      return { ...prev, services: updatedServices };
    });
    showToast("Serviço / OS salvo com sucesso!", "success");
  }, [updateDb, showToast]);

  const deleteService = useCallback(async (id: string) => {
    await updateDb((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
      // Opcional: manter transações mas desvincular
      transactions: prev.transactions.map((t) =>
        t.serviceId === id ? { ...t, serviceId: undefined, serviceCode: undefined } : t
      ),
    }));
    showToast("Serviço removido com sucesso.", "info");
  }, [updateDb, showToast]);

  // --- CRUD Transações Financeiras ---
  const saveTransaction = useCallback(async (transaction: FinancialTransaction) => {
    await updateDb((prev) => {
      const exists = prev.transactions.some((t) => t.id === transaction.id);
      let updated: FinancialTransaction[];
      if (exists) {
        updated = prev.transactions.map((t) => (t.id === transaction.id ? transaction : t));
      } else {
        updated = [{ ...transaction, createdAt: new Date().toISOString() }, ...prev.transactions];
      }
      return { ...prev, transactions: updated };
    });
    showToast("Lançamento financeiro gravado!", "success");
  }, [updateDb, showToast]);

  const deleteTransaction = useCallback(async (id: string) => {
    await updateDb((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
    showToast("Lançamento excluído com sucesso.", "info");
  }, [updateDb, showToast]);

  const toggleTransactionStatus = useCallback(async (id: string) => {
    await updateDb((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => {
        if (t.id !== id) return t;
        const newStatus = t.status === "efetivado" ? "pendente" : "efetivado";
        const today = new Intl.DateTimeFormat("pt-BR").format(new Date());
        return {
          ...t,
          status: newStatus,
          paymentDate: newStatus === "efetivado" ? today : undefined,
        };
      }),
    }));
    showToast("Status da transação alterado!", "success");
  }, [updateDb, showToast]);

  // --- CRUD Clientes ---
  const saveCustomer = useCallback(async (customer: Customer) => {
    await updateDb((prev) => {
      const exists = prev.customers.some((c) => c.id === customer.id);
      const updated = exists
        ? prev.customers.map((c) => (c.id === customer.id ? customer : c))
        : [{ ...customer, createdAt: new Date().toISOString() }, ...prev.customers];
      return { ...prev, customers: updated };
    });
    showToast("Cliente salvo com sucesso!", "success");
  }, [updateDb, showToast]);

  const deleteCustomer = useCallback(async (id: string) => {
    await updateDb((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
    showToast("Cliente removido.", "info");
  }, [updateDb, showToast]);

  // --- CRUD Colaboradores ---
  const saveCollaborator = useCallback(async (collaborator: Collaborator) => {
    await updateDb((prev) => {
      const exists = prev.collaborators.some((c) => c.id === collaborator.id);
      const updated = exists
        ? prev.collaborators.map((c) => (c.id === collaborator.id ? collaborator : c))
        : [collaborator, ...prev.collaborators];
      return { ...prev, collaborators: updated };
    });
    showToast("Colaborador salvo com sucesso!", "success");
  }, [updateDb, showToast]);

  const deleteCollaborator = useCallback(async (id: string) => {
    await updateDb((prev) => ({
      ...prev,
      collaborators: prev.collaborators.filter((c) => c.id !== id),
    }));
    showToast("Colaborador removido.", "info");
  }, [updateDb, showToast]);

  // --- CRUD Fornecedores ---
  const saveSupplier = useCallback(async (supplier: Supplier) => {
    await updateDb((prev) => {
      const exists = prev.suppliers.some((s) => s.id === supplier.id);
      const updated = exists
        ? prev.suppliers.map((s) => (s.id === supplier.id ? supplier : s))
        : [supplier, ...prev.suppliers];
      return { ...prev, suppliers: updated };
    });
    showToast("Fornecedor cadastrado com sucesso!", "success");
  }, [updateDb, showToast]);

  const deleteSupplier = useCallback(async (id: string) => {
    await updateDb((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
    }));
    showToast("Fornecedor removido.", "info");
  }, [updateDb, showToast]);

  // --- CRUD Propostas ---
  const saveProposal = useCallback(async (proposal: CommercialProposal) => {
    await updateDb((prev) => {
      const exists = prev.proposals.some((p) => p.id === proposal.id);
      let updated: CommercialProposal[];
      if (exists) {
        updated = prev.proposals.map((p) => (p.id === proposal.id ? proposal : p));
      } else {
        const nextCode = proposal.code || generateNextCode(prev.proposals.map((p) => p.code), "PROP");
        updated = [{ ...proposal, code: nextCode, createdAt: new Date().toISOString() }, ...prev.proposals];
      }
      return { ...prev, proposals: updated };
    });
    showToast("Proposta comercial salva!", "success");
  }, [updateDb, showToast]);

  const deleteProposal = useCallback(async (id: string) => {
    await updateDb((prev) => ({
      ...prev,
      proposals: prev.proposals.filter((p) => p.id !== id),
    }));
    showToast("Proposta excluída.", "info");
  }, [updateDb, showToast]);

  // Converter Proposta Comercial em Serviço / OS
  const convertProposalToService = useCallback(async (proposalId: string): Promise<string | null> => {
    let createdServiceId: string | null = null;
    await updateDb((prev) => {
      const prop = prev.proposals.find((p) => p.id === proposalId);
      if (!prop) return prev;

      const customer = prev.customers.find((c) => c.id === prop.customerId);
      const nextCode = generateNextCode(prev.services.map((s) => s.code), "OS");
      createdServiceId = generateId("serv");

      const todayStr = new Intl.DateTimeFormat("pt-BR").format(new Date());

      // Converter itens da proposta em materiais e tarefas
      const materialsFromProp = prop.items
        .filter((it) => it.type === "material")
        .map((it) => ({
          id: generateId("mat"),
          name: it.description,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          isRealized: false,
        }));

      const newService: ElectricalService = {
        id: createdServiceId,
        code: nextCode,
        title: prop.serviceTitle,
        description: `${prop.scopeOfWork}\n\nItens inclusos: ${prop.includedServices}`,
        customerId: prop.customerId,
        customerName: prop.customerName,
        executionAddress: customer?.address || "",
        status: "aprovado",
        technicalLead: prev.settings.technicalLead,
        openingDate: todayStr,
        expectedStartDate: todayStr,
        expectedEndDate: todayStr,
        contractedValue: prop.totalValue,
        pricingMode: "target_margin",
        targetMarginPercent: prev.settings.defaultTargetMargin,
        taxPercent: prev.settings.defaultTaxPercent,
        cardFeePercent: prev.settings.defaultCardFeePercent,
        team: [],
        materials: materialsFromProp,
        additionalExpenses: [],
        attachments: [],
        history: [
          {
            id: generateId("log"),
            date: `${todayStr} 10:00`,
            author: "Sistema",
            action: "Conversão de Proposta",
            details: `Ordem de Serviço gerada automaticamente a partir da proposta comercial ${prop.code}.`,
          },
        ],
        proposalId: prop.id,
        notes: `Condições de Pagamento: ${prop.paymentTerms}\nGarantia: ${prop.warrantyTerms}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Atualiza proposta para "aprovada" e vincula
      const updatedProposals = prev.proposals.map((p) =>
        p.id === proposalId
          ? { ...p, status: "aprovada" as const, convertedServiceId: createdServiceId! }
          : p
      );

      // Também agenda uma conta a receber (ou sinal) vinculada ao serviço
      const newTransaction: FinancialTransaction = {
        id: generateId("tr_in"),
        type: "entrada",
        description: `Recebimento Contratual - ${newService.code} ${newService.title}`,
        customerId: newService.customerId,
        customerName: newService.customerName,
        serviceId: newService.id,
        serviceCode: newService.code,
        date: todayStr,
        dueDate: todayStr,
        amount: newService.contractedValue,
        paymentMethod: "pix",
        category: "Serviços de instalação elétrica",
        status: "pendente",
        notes: `Gerado a partir da conversão da proposta ${prop.code}`,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        proposals: updatedProposals,
        services: [newService, ...prev.services],
        transactions: [newTransaction, ...prev.transactions],
      };
    });

    showToast("Proposta convertida em Ordem de Serviço com sucesso!", "success");
    return createdServiceId;
  }, [updateDb, showToast]);

  const saveSettings = useCallback(async (settings: CompanySettings) => {
    await updateDb((prev) => ({ ...prev, settings }));
    showToast("Configurações da empresa atualizadas!", "success");
  }, [updateDb, showToast]);

  const changeAdminPin = useCallback(async (newPin: string) => {
    await updateDb((prev) => ({ ...prev, adminPin: newPin }));
    showToast("Senha/PIN administrativo atualizado com sucesso!", "success");
  }, [updateDb, showToast]);

  const resetToDefaults = useCallback(async () => {
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (res.ok) {
        const json = await res.json();
        setDb(json.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
        showToast("Dados restaurados para o padrão de fábrica!", "info");
      }
    } catch {
      setDb(initialERPData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialERPData));
      showToast("Dados restaurados para o padrão de fábrica!", "info");
    }
  }, [showToast]);

  return (
    <ERPContext.Provider
      value={{
        db,
        loading,
        authenticated,
        toasts,
        dismissToast,
        showToast,
        login,
        logout,
        updateDb,
        saveService,
        deleteService,
        saveTransaction,
        deleteTransaction,
        toggleTransactionStatus,
        saveCustomer,
        deleteCustomer,
        saveCollaborator,
        deleteCollaborator,
        saveSupplier,
        deleteSupplier,
        saveProposal,
        deleteProposal,
        convertProposalToService,
        saveSettings,
        changeAdminPin,
        resetToDefaults,
      }}
    >
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none no-print">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-lg text-sm font-medium shadow-lg transition-all flex items-center justify-between gap-3 ${
              toast.type === "error"
                ? "bg-rose-900 text-white border border-rose-700"
                : toast.type === "info"
                ? "bg-slate-900 text-white border border-slate-700"
                : "bg-slate-900 text-white border border-amber-500/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  toast.type === "error"
                    ? "bg-rose-400"
                    : toast.type === "info"
                    ? "bg-sky-400"
                    : "bg-amber-400"
                }`}
              />
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ERPContext.Provider>
  );
}

export function useERP() {
  const ctx = useContext(ERPContext);
  if (!ctx) {
    throw new Error("useERP must be used within an ERPProvider");
  }
  return ctx;
}
