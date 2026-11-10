"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  User,
  Users,
  Plus,
  ArrowRight,
  MapPin,
  DollarSign,
  FileSpreadsheet,
  Printer,
  Download,
  X,
} from "lucide-react";
import { useERP } from "@/lib/erp-context";
import {
  formatCurrency,
  formatDate,
  parseDate,
  formatMonthName,
  isDateWithinRange,
} from "@/lib/utils";
import type { ElectricalService, Collaborator } from "@/lib/types";

interface CalendarProps {
  onOpenService: (serviceId: string) => void;
  onNewService: () => void;
}

export function CalendarView({ onOpenService, onNewService }: CalendarProps) {
  const { db } = useERP();

  // Mês e Ano selecionados no calendário (padrão: data real atual)
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11

  // Filtros
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"month" | "timeline">("month");

  // Dia selecionado para exibir o painel lateral de escala detalhada
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(today);
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);

  // Navegar entre meses
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDayDate(today);
  };

  // Cores consistentes para cada colaborador para fácil identificação visual no calendário
  const collaboratorColors: Record<string, { bg: string; text: string; border: string }> = useMemo(() => {
    const palette = [
      { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/40" },
      { bg: "bg-sky-500/20", text: "text-sky-300", border: "border-sky-500/40" },
      { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/40" },
      { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/40" },
      { bg: "bg-pink-500/20", text: "text-pink-300", border: "border-pink-500/40" },
      { bg: "bg-indigo-500/20", text: "text-indigo-300", border: "border-indigo-500/40" },
    ];
    const map: Record<string, { bg: string; text: string; border: string }> = {};
    db.collaborators.forEach((c, idx) => {
      map[c.id] = palette[idx % palette.length];
    });
    return map;
  }, [db.collaborators]);

  // Gerar dias do mês para a grade 7x6
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Dia da semana do 1º dia (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
    // Ajustar para Segunda-feira ser o 1º dia da semana (0 = Segunda, 6 = Domingo)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const days: { date: Date; isCurrentMonth: boolean; dayNumber: number }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({ date: d, isCurrentMonth: false, dayNumber: d.getDate() });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      days.push({ date: d, isCurrentMonth: true, dayNumber: i });
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({ date: d, isCurrentMonth: false, dayNumber: i });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Serviços filtrados
  const activeServices = useMemo(() => {
    return db.services.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (selectedCollaboratorId !== "all") {
        const hasCollab = (s.team || []).some(
          (m) => m.collaboratorId === selectedCollaboratorId
        );
        if (!hasCollab) return false;
      }
      return true;
    });
  }, [db.services, statusFilter, selectedCollaboratorId]);

  // Função para retornar os serviços ativos em uma data específica
  const getServicesForDate = (date: Date) => {
    return activeServices.filter((s) =>
      isDateWithinRange(date, s.expectedStartDate, s.expectedEndDate)
    );
  };

  // Serviços e colaboradores do dia selecionado
  const selectedDayServices = useMemo(() => {
    return activeServices.filter((s) =>
      isDateWithinRange(selectedDayDate, s.expectedStartDate, s.expectedEndDate)
    );
  }, [activeServices, selectedDayDate]);

  // Colaboradores únicos atuando no dia selecionado
  const collaboratorsOnSelectedDay = useMemo(() => {
    const list: {
      collaborator: Collaborator;
      service: ElectricalService;
      role: string;
      dailyRate: number;
    }[] = [];

    selectedDayServices.forEach((s) => {
      (s.team || []).forEach((m) => {
        const c = db.collaborators.find((col) => col.id === m.collaboratorId);
        if (c) {
          list.push({
            collaborator: c,
            service: s,
            role: m.role || c.role,
            dailyRate: m.rateValue || c.dailyRate,
          });
        }
      });
    });

    return list;
  }, [selectedDayServices, db.collaborators]);

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDayDate.getDate() &&
      date.getMonth() === selectedDayDate.getMonth() &&
      date.getFullYear() === selectedDayDate.getFullYear()
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header do Calendário & Controles de Navegação */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Navegação de Mês */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-slate-200 hover:text-amber-400 rounded-md transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 capitalize">
              {formatMonthName(currentMonth)} de {currentYear}
            </h2>
            <p className="text-[11px] text-slate-400">
              Escala de Obras e Alocação de Eletricistas em Tempo Real
            </p>
          </div>
        </div>

        {/* Filtro por Colaborador & Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Colaborador */}
          <div className="relative">
            <select
              value={selectedCollaboratorId}
              onChange={(e) => setSelectedCollaboratorId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="all">Todos os Colaboradores ({db.collaborators.length})</option>
              {db.collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Status da OS */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="aprovado">Aprovados</option>
              <option value="concluido">Concluídos</option>
              <option value="orcamento">Orçamentos</option>
            </select>
          </div>

          {/* Exportar Excel (CSV) */}
          <button
            onClick={() => {
              const csvRows = [
                ["Escala Mensal de Eletricistas e Obras"],
                ["Empresa", db.settings.companyName],
                ["Mes / Ano", `${formatMonthName(currentMonth)}/${currentYear}`],
                ["Data de Emissao", new Intl.DateTimeFormat("pt-BR").format(new Date())],
                [],
                ["Data", "Dia da Semana", "Codigo OS", "Obra / Servico", "Cliente", "Colaborador Alocado", "Funcao", "Diaria (R$)", "Status"],
              ];

              calendarDays
                .filter((cd) => cd.isCurrentMonth)
                .forEach((cd) => {
                  const servicesOnDay = activeServices.filter((s) =>
                    isDateWithinRange(cd.date, s.expectedStartDate, s.expectedEndDate)
                  );

                  const dayName = cd.date.toLocaleDateString("pt-BR", { weekday: "short" });
                  const dateStr = cd.date.toLocaleDateString("pt-BR");

                  if (servicesOnDay.length === 0) {
                    csvRows.push([dateStr, dayName, "-", "Sem obras agendadas", "-", "-", "-", "-", "-"]);
                  } else {
                    servicesOnDay.forEach((s) => {
                      if ((s.team || []).length === 0) {
                        csvRows.push([dateStr, dayName, s.code, `"${s.title.replace(/"/g, '""')}"`, `"${s.customerName.replace(/"/g, '""')}"`, "Sem equipe alocada", "-", "-", s.status]);
                      } else {
                        (s.team || []).forEach((m) => {
                          csvRows.push([
                            dateStr,
                            dayName,
                            s.code,
                            `"${s.title.replace(/"/g, '""')}"`,
                            `"${s.customerName.replace(/"/g, '""')}"`,
                            `"${m.collaboratorName.replace(/"/g, '""')}"`,
                            `"${m.role.replace(/"/g, '""')}"`,
                            (m.rateValue || 0).toFixed(2),
                            s.status,
                          ]);
                        });
                      }
                    });
                  }
                });

              const csvContent = "\uFEFF" + csvRows.map((e) => e.join(";")).join("\n");
              const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `escala_${formatMonthName(currentMonth).toLowerCase()}_${currentYear}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Exportar escala do mês para Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel (CSV)</span>
          </button>

          {/* Exportar PDF */}
          <button
            onClick={() => setPdfModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            title="Exportar Escala em PDF com Logotipo"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Exportar PDF</span>
          </button>

          {/* Nova OS */}
          <button
            onClick={onNewService}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Agendar Obra</span>
          </button>
        </div>
      </div>

      {/* 2. Layout Principal: Grade Mensal + Painel Lateral da Escala */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Grade do Calendário (8 Colunas em desktop) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* Dias da Semana */}
          <div className="grid grid-cols-7 bg-slate-950 border-b border-slate-800 text-center py-2.5 text-xs font-semibold text-slate-400">
            <div>Segunda</div>
            <div>Terça</div>
            <div>Quarta</div>
            <div>Quinta</div>
            <div>Sexta</div>
            <div className="text-amber-400/80">Sábado</div>
            <div className="text-rose-400/80">Domingo</div>
          </div>

          {/* Células dos Dias */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/60 bg-slate-950/20">
            {calendarDays.map((cell, idx) => {
              const servicesOnDay = getServicesForDate(cell.date);
              const isCellToday = isToday(cell.date);
              const isCellSelected = isSelected(cell.date);

              // Coletar colaboradores únicos atuando nesta data
              const collaboratorsToday: { id: string; name: string }[] = [];
              servicesOnDay.forEach((s) => {
                (s.team || []).forEach((m) => {
                  if (!collaboratorsToday.some((c) => c.id === m.collaboratorId)) {
                    collaboratorsToday.push({ id: m.collaboratorId, name: m.collaboratorName });
                  }
                });
              });

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDayDate(cell.date)}
                  className={`min-h-[105px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between relative ${
                    cell.isCurrentMonth ? "bg-slate-900/60" : "bg-slate-950/80 opacity-40"
                  } ${
                    isCellSelected
                      ? "ring-2 ring-amber-400 bg-amber-500/5 z-10"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  {/* Cabeçalho da Célula: Número do Dia e Marcador Hoje */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-bold w-5 h-5 flex items-center justify-center rounded-md ${
                        isCellToday
                          ? "bg-amber-500 text-slate-950 shadow-xs"
                          : cell.isCurrentMonth
                          ? "text-slate-200"
                          : "text-slate-500"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {servicesOnDay.length > 0 && (
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">
                        {servicesOnDay.length} {servicesOnDay.length === 1 ? "obra" : "obras"}
                      </span>
                    )}
                  </div>

                  {/* Lista Compacta de Serviços na data */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {servicesOnDay.slice(0, 2).map((srv) => {
                      return (
                        <div
                          key={srv.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenService(srv.id);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate border transition-transform hover:scale-[1.02] cursor-pointer ${
                            srv.status === "em_andamento"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : srv.status === "concluido"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                          }`}
                          title={`${srv.code} - ${srv.title} (${srv.customerName})`}
                        >
                          <span className="font-mono font-bold mr-1">{srv.code}:</span>
                          <span>{srv.title}</span>
                        </div>
                      );
                    })}

                    {servicesOnDay.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-mono px-1">
                        +{servicesOnDay.length - 2} mais...
                      </div>
                    )}
                  </div>

                  {/* Badges de Colaboradores em Atuação neste dia */}
                  {collaboratorsToday.length > 0 && (
                    <div className="pt-1 mt-1 border-t border-slate-800/80 flex items-center gap-1 flex-wrap">
                      {collaboratorsToday.slice(0, 3).map((collab) => {
                        const color = collaboratorColors[collab.id] || {
                          bg: "bg-slate-800",
                          text: "text-slate-300",
                          border: "border-slate-700",
                        };
                        const firstName = collab.name.split(" ")[0];
                        return (
                          <span
                            key={collab.id}
                            className={`text-[9px] px-1 py-0.2 rounded font-mono font-medium truncate max-w-[50px] border ${color.bg} ${color.text} ${color.border}`}
                            title={`Em campo: ${collab.name}`}
                          >
                            {firstName}
                          </span>
                        );
                      })}
                      {collaboratorsToday.length > 3 && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          +{collaboratorsToday.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Painel Lateral: Escala de Eletricistas no Dia Selecionado (4 Colunas) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wide">
                Escala do Dia
              </span>
              <h3 className="text-base font-bold text-slate-100 capitalize">
                {selectedDayDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
            </div>
            <span className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">
              <HardHat className="w-4 h-4" />
            </span>
          </div>

          {/* Colaboradores em Campo hoje */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Colaboradores Alocados ({collaboratorsOnSelectedDay.length})</span>
              </span>
            </div>

            {collaboratorsOnSelectedDay.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                Nenhum colaborador alocado em obras nesta data.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {collaboratorsOnSelectedDay.map((item, idx) => {
                  const color = collaboratorColors[item.collaborator.id] || {
                    bg: "bg-slate-800",
                    text: "text-slate-300",
                    border: "border-slate-700",
                  };
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${color.bg.replace(
                              "/20",
                              ""
                            )}`}
                          />
                          <p className="font-bold text-slate-200 truncate">
                            {item.collaborator.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.role} · {item.collaborator.hiringType}
                        </p>
                        <p className="text-[10px] text-amber-400 font-mono truncate">
                          Obra: {item.service.code} ({item.service.customerName})
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 block">Diária:</span>
                        <span className="font-mono font-bold text-slate-200">
                          {formatCurrency(item.dailyRate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Obras Agendadas no Dia */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Obras em Andamento no Dia ({selectedDayServices.length})</span>
              </span>
            </div>

            {selectedDayServices.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                Sem serviços elétricos programados para este dia.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayServices.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {srv.code}
                        </span>
                        <h4 className="font-semibold text-slate-200 text-xs leading-tight">
                          {srv.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {srv.customerName}
                        </p>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-semibold ${
                          srv.status === "em_andamento"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {srv.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{srv.executionAddress || "Endereço em OS"}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs">
                      <span className="font-mono text-slate-300 font-semibold">
                        {formatCurrency(srv.contractedValue)}
                      </span>
                      <button
                        onClick={() => onOpenService(srv.id)}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer text-xs"
                      >
                        <span>Gerenciar 9 Abas</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal / Folha Imprimível da Escala com Logotipo Oficial */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-2 sm:p-6 flex flex-col items-center">
          {/* Barra de controle */}
          <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400">
                ESCALA DE CAMPO · {formatMonthName(currentMonth).toUpperCase()} {currentYear}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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
                  ESCALA MENSAL DE CAMPO
                </div>
                <div>Período: {formatMonthName(currentMonth)} de {currentYear}</div>
                <div>Emissão: {new Intl.DateTimeFormat("pt-BR").format(new Date())}</div>
              </div>
            </div>

            {/* Tabela de Escala por Dia */}
            <div>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-700 font-bold bg-slate-100">
                    <th className="py-2 px-2">Data</th>
                    <th className="py-2 px-2">Dia</th>
                    <th className="py-2 px-2">Obra / Serviço</th>
                    <th className="py-2 px-2">Cliente</th>
                    <th className="py-2 px-2">Equipe Alocada</th>
                    <th className="py-2 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {calendarDays
                    .filter((cd) => cd.isCurrentMonth)
                    .map((cd) => {
                      const servicesOnDay = activeServices.filter((s) =>
                        isDateWithinRange(cd.date, s.expectedStartDate, s.expectedEndDate)
                      );
                      const isSun = cd.date.getDay() === 0;
                      const isSat = cd.date.getDay() === 6;

                      return (
                        <tr
                          key={cd.date.toISOString()}
                          className={`hover:bg-slate-50 ${isSun || isSat ? "bg-slate-50/70" : ""}`}
                        >
                          <td className="py-2 px-2 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {cd.date.toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-2 px-2 text-slate-600 capitalize whitespace-nowrap">
                            {cd.date.toLocaleDateString("pt-BR", { weekday: "short" })}
                          </td>
                          <td className="py-2 px-2">
                            {servicesOnDay.length === 0 ? (
                              <span className="text-slate-400 italic">Sem obras agendadas</span>
                            ) : (
                              servicesOnDay.map((s) => (
                                <div key={s.id} className="font-semibold text-slate-900">
                                  {s.code} - {s.title}
                                </div>
                              ))
                            )}
                          </td>
                          <td className="py-2 px-2 text-slate-700">
                            {servicesOnDay.length === 0
                              ? "-"
                              : servicesOnDay.map((s) => s.customerName).join(", ")}
                          </td>
                          <td className="py-2 px-2">
                            {servicesOnDay.length === 0 ? (
                              "-"
                            ) : (
                              <div className="space-y-0.5">
                                {servicesOnDay.flatMap((s) => s.team || []).map((m, idx) => (
                                  <div key={idx} className="text-slate-800 font-medium">
                                    • {m.collaboratorName} ({m.role})
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {servicesOnDay.length === 0 ? (
                              "-"
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                {servicesOnDay[0].status.toUpperCase()}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Rodapé e assinatura técnica */}
            <div className="pt-8 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
              <div>
                <p>NEXT GESTÃO ERP · Escala e Alocação de Eletricistas e Técnicos</p>
                <p>Documento operacional de controle de jornada e canteiro de obras</p>
              </div>
              <div className="text-center w-64 border-t border-slate-400 pt-2 font-medium text-slate-700">
                {db.settings.technicalLead}
                <br />
                Encarregado Geral / Coordenação Técnica
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
