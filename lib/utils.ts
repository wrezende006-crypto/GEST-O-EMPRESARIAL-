import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ElectricalService, FinancialTransaction } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata valor numérico para Real Brasileiro (R$ 1.250,50) */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Formata número simples com duas casas decimais */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formata data para DD/MM/AAAA */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "-";
  // Se já estiver no formato DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("pt-BR").format(d);
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/** Converte data DD/MM/AAAA ou ISO para formato input YYYY-MM-DD */
export function toInputDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month}-${day}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch {}
  return "";
}

/** Converte input YYYY-MM-DD para DD/MM/AAAA */
export function fromInputDate(inputDate: string): string {
  if (!inputDate) return "";
  const [year, month, day] = inputDate.split("-");
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  return inputDate;
}

/**
 * Cálculo de Preço de Venda baseado na Margem Desejada:
 * Preço = Custo Total / (1 - (margem + impostos + taxas) / 100)
 */
export function calculatePriceFromMargin(
  cost: number,
  marginPercent: number,
  taxPercent: number = 0,
  cardFeePercent: number = 0
): {
  salePrice: number;
  grossProfit: number;
  effectiveMarginPercent: number;
  taxesAmount: number;
  feesAmount: number;
} {
  const totalDeductionsPercent = (marginPercent + taxPercent + cardFeePercent) / 100;
  
  if (totalDeductionsPercent >= 1) {
    // Evita divisão por zero ou valor negativo
    return {
      salePrice: cost * 2,
      grossProfit: cost,
      effectiveMarginPercent: 50,
      taxesAmount: 0,
      feesAmount: 0,
    };
  }

  const salePrice = cost > 0 ? cost / (1 - totalDeductionsPercent) : 0;
  const taxesAmount = (salePrice * taxPercent) / 100;
  const feesAmount = (salePrice * cardFeePercent) / 100;
  const grossProfit = salePrice - cost - taxesAmount - feesAmount;
  const effectiveMarginPercent = salePrice > 0 ? (grossProfit / salePrice) * 100 : marginPercent;

  return {
    salePrice: Math.round(salePrice * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    effectiveMarginPercent: Math.round(effectiveMarginPercent * 100) / 100,
    taxesAmount: Math.round(taxesAmount * 100) / 100,
    feesAmount: Math.round(feesAmount * 100) / 100,
  };
}

/**
 * Cálculo de Lucro e Margem a partir do Preço de Venda informado:
 * Lucro Líquido = Preço - Custo - Impostos - Taxas
 * Margem = (Lucro Líquido / Preço) * 100
 */
export function calculateMarginFromPrice(
  cost: number,
  salePrice: number,
  taxPercent: number = 0,
  cardFeePercent: number = 0
): {
  grossProfit: number;
  marginPercent: number;
  taxesAmount: number;
  feesAmount: number;
} {
  const taxesAmount = (salePrice * taxPercent) / 100;
  const feesAmount = (salePrice * cardFeePercent) / 100;
  const grossProfit = salePrice - cost - taxesAmount - feesAmount;
  const marginPercent = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;

  return {
    grossProfit: Math.round(grossProfit * 100) / 100,
    marginPercent: Math.round(marginPercent * 100) / 100,
    taxesAmount: Math.round(taxesAmount * 100) / 100,
    feesAmount: Math.round(feesAmount * 100) / 100,
  };
}

/**
 * Totalizadores de custo detalhado para um serviço elétrico
 */
export function getServiceCostSummary(service: ElectricalService) {
  // Materiais previstos e realizados
  const materialsCost = (service.materials || []).reduce(
    (acc, m) => acc + (m.totalPrice || (m.quantity * m.unitPrice) || 0),
    0
  );

  // Mão de obra (equipe)
  const laborCost = (service.team || []).reduce(
    (acc, t) => acc + (t.totalCost || 0),
    0
  );

  // Despesas adicionais
  const additionalExpensesCost = (service.additionalExpenses || []).reduce(
    (acc, e) => acc + (e.amount || 0),
    0
  );

  const totalCost = materialsCost + laborCost + additionalExpensesCost;
  const salePrice = service.contractedValue || 0;

  const { grossProfit, marginPercent, taxesAmount, feesAmount } = calculateMarginFromPrice(
    totalCost,
    salePrice,
    service.taxPercent || 0,
    service.cardFeePercent || 0
  );

  return {
    materialsCost,
    laborCost,
    additionalExpensesCost,
    totalCost,
    salePrice,
    grossProfit,
    marginPercent,
    taxesAmount,
    feesAmount,
  };
}

/** Gera ID único */
export function generateId(prefix: string = "id"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${random}`;
}

/** Gera código de OS / Proposta sequencial */
export function generateNextCode(
  existingCodes: string[],
  prefix: "OS" | "PROP",
  year: number = 2026
): string {
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let maxSeq = 0;
  for (const c of existingCodes) {
    const match = c.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}-${year}-${String(maxSeq + 1).padStart(3, "0")}`;
}

/**
 * Converte data em formato DD/MM/AAAA ou ISO (YYYY-MM-DD) para objeto Date
 */
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Verifica se a data pertence a um determinado mês e ano (mês 0 a 11)
 */
export function isSameMonthYear(
  dateStr: string | undefined | null,
  targetYear: number,
  targetMonth: number
): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
}

export const MONTH_NAMES_PTBR = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatMonthName(monthIndex: number): string {
  return MONTH_NAMES_PTBR[monthIndex] || "";
}

/**
 * Verifica se uma data específica (ex: '2026-11-10') está entre as datas de início e fim de uma OS
 */
export function isDateWithinRange(
  targetDate: Date,
  startDateStr: string | undefined | null,
  endDateStr: string | undefined | null
): boolean {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);
  if (!start && !end) return false;
  
  const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : targetTime;
  const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() : targetTime;

  return targetTime >= startTime && targetTime <= endTime;
}

