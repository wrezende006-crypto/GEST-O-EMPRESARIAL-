"use client";

import React, { useState } from "react";
import { ERPProvider, useERP } from "@/lib/erp-context";
import { Sidebar, type ActiveModule } from "@/components/layout/sidebar";
import { Header, type PeriodFilter } from "@/components/layout/header";
import { LoginModal } from "@/components/layout/login-modal";
import { Dashboard } from "@/components/modules/dashboard";
import { Cashflow } from "@/components/modules/cashflow";
import { Services } from "@/components/modules/services";
import { ServiceDetailModal } from "@/components/modules/service-detail-modal";
import { Customers } from "@/components/modules/customers";
import { Collaborators } from "@/components/modules/collaborators";
import { Suppliers } from "@/components/modules/suppliers";
import { Proposals } from "@/components/modules/proposals";
import { Reports } from "@/components/modules/reports";
import { CompanySettingsView } from "@/components/modules/settings";
import { CalendarView } from "@/components/modules/calendar";

function ERPApp() {
  const { db } = useERP();

  const [activeModule, setActiveModule] = useState<ActiveModule>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>("este_mes");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de Detalhes do Serviço (9 Abas)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Filtro de serviço para navegação cruzada no fluxo de caixa
  const [cashflowServiceFilter, setCashflowServiceFilter] = useState<string>("all");

  const handleQuickAction = (action: "new_service" | "new_transaction" | "new_proposal") => {
    if (action === "new_service") {
      setSelectedServiceId("NEW_SERVICE");
    } else if (action === "new_transaction") {
      setActiveModule("cashflow");
    } else if (action === "new_proposal") {
      setActiveModule("proposals");
    }
  };

  const handleOpenService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
  };

  const handleNavigateToCashflowForService = (serviceId: string) => {
    setCashflowServiceFilter(serviceId);
    setSelectedServiceId(null);
    setActiveModule("cashflow");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* Menu Lateral de Navegação */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => {
          setActiveModule(mod);
          setCashflowServiceFilter("all");
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Conteúdo Principal com Top Header */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        <Header
          activeModule={activeModule}
          onOpenMobile={() => setMobileSidebarOpen(true)}
          period={period}
          onChangePeriod={setPeriod}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onQuickAction={handleQuickAction}
          onNavigate={(mod) => {
            setActiveModule(mod);
            setCashflowServiceFilter("all");
          }}
          onOpenService={handleOpenService}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeModule === "dashboard" && (
            <Dashboard
              period={period}
              onNavigate={(mod) => setActiveModule(mod)}
              onOpenService={handleOpenService}
              onQuickAction={handleQuickAction}
            />
          )}

          {activeModule === "cashflow" && (
            <Cashflow
              initialServiceFilter={cashflowServiceFilter}
              onNavigateToService={handleOpenService}
            />
          )}

          {activeModule === "services" && (
            <Services
              onOpenService={handleOpenService}
              onNewService={() => setSelectedServiceId("NEW_SERVICE")}
            />
          )}

          {activeModule === "calendar" && (
            <CalendarView
              onOpenService={handleOpenService}
              onNewService={() => setSelectedServiceId("NEW_SERVICE")}
            />
          )}

          {activeModule === "customers" && (
            <Customers onOpenService={handleOpenService} />
          )}

          {activeModule === "collaborators" && <Collaborators />}

          {activeModule === "suppliers" && <Suppliers />}

          {activeModule === "proposals" && (
            <Proposals onOpenService={handleOpenService} />
          )}

          {activeModule === "reports" && <Reports />}

          {activeModule === "settings" && <CompanySettingsView />}
        </main>
      </div>

      {/* Modal 9 Abas de Detalhes da Ordem de Serviço */}
      {selectedServiceId && (
        <ServiceDetailModal
          serviceId={selectedServiceId === "NEW_SERVICE" ? "" : selectedServiceId}
          onClose={() => setSelectedServiceId(null)}
          onNavigateToProposals={() => {
            setSelectedServiceId(null);
            setActiveModule("proposals");
          }}
          onNavigateToCashflow={handleNavigateToCashflowForService}
        />
      )}

      {/* Modal de Bloqueio/Login de Segurança */}
      <LoginModal />
    </div>
  );
}

export default function Page() {
  return (
    <ERPProvider>
      <ERPApp />
    </ERPProvider>
  );
}
