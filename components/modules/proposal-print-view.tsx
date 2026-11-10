"use client";

import React from "react";
import Image from "next/image";
import { Printer, X, Download, MessageCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CommercialProposal, CompanySettings, Customer } from "@/lib/types";

interface ProposalPrintViewProps {
  proposal: CommercialProposal;
  customer?: Customer;
  settings: CompanySettings;
  onClose: () => void;
}

export function ProposalPrintView({
  proposal,
  customer,
  settings,
  onClose,
}: ProposalPrintViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvRows = [
      ["Proposta Comercial", proposal.code],
      ["Cliente", proposal.customerName],
      ["Obra / Servico", proposal.serviceTitle],
      ["Data de Emissao", proposal.issueDate],
      ["Validade", proposal.validUntil],
      ["Valor Total (R$)", proposal.totalValue.toFixed(2)],
      ["Status", proposal.status],
      [],
      ["Tipo", "Descricao do Item", "Quantidade", "Unidade", "Preco Unitario (R$)", "Total (R$)"],
    ];

    proposal.items.forEach((item) => {
      csvRows.push([
        item.type,
        `"${item.description.replace(/"/g, '""')}"`,
        item.quantity.toString(),
        item.unit,
        item.unitPrice.toFixed(2),
        item.totalPrice.toFixed(2),
      ]);
    });

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(";")).join("\n");
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `proposta_${proposal.code}_itens.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cleanPhone = (customer?.whatsapp || customer?.phone || "").replace(/\D/g, "");
  const whatsappMsg = encodeURIComponent(
    `Olá ${customer?.contactPerson || customer?.name}! Segue a proposta comercial ${proposal.code} referente a "${proposal.serviceTitle}" no valor de ${formatCurrency(proposal.totalValue)}. Permanecemos à disposição!`
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-2 sm:p-6 flex flex-col items-center">
      {/* Control bar (hidden during print) */}
      <div className="no-print w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-amber-400">
            {proposal.code}
          </span>
          <span className="text-xs text-slate-300 font-medium">
            Proposta Comercial · Exportação Excel & PDF
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cleanPhone && (
            <a
              href={`https://wa.me/55${cleanPhone}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Baixar planilha compatível com Microsoft Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel (CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Salvar PDF</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 style, black text on white background) */}
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 space-y-6 print-page font-sans text-xs">
        {/* Header da Proposta com Logotipo e Dados da Empresa */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
          <div className="flex items-start gap-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-white p-1.5 flex items-center justify-center shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logoUrl || "/images/logo.jpg"}
                alt={settings.companyName}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                {settings.companyName}
              </h1>
              <p className="text-slate-600 font-medium text-[11px]">
                {settings.tradeName}
              </p>
              <p className="text-slate-500 text-[10px] mt-1 font-mono">
                CNPJ: {settings.cnpj} · IE: {settings.stateRegistration || "Isento"}
              </p>
              <p className="text-slate-500 text-[10px]">
                {settings.address} - {settings.city}/{settings.state}
              </p>
              <p className="text-slate-500 text-[10px]">
                Tel: {settings.phone} · WhatsApp: {settings.whatsapp} · {settings.email}
              </p>
              <p className="text-slate-700 text-[10px] font-semibold mt-0.5">
                Resp. Técnico: {settings.technicalLead} ({settings.creaNumber})
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 shrink-0 space-y-1">
            <span className="inline-block bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1 rounded">
              {proposal.code}
            </span>
            <div className="text-[11px] text-slate-600 font-mono">
              <p>Emissão: <strong>{formatDate(proposal.issueDate)}</strong></p>
              <p>Validade: <strong>{formatDate(proposal.validUntil)}</strong></p>
            </div>
          </div>
        </div>

        {/* Dados do Cliente */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Dados do Contratante / Cliente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-slate-700">
            <p>
              <strong className="text-slate-900">Razão Social / Nome:</strong> {proposal.customerName}
            </p>
            <p>
              <strong className="text-slate-900">CPF / CNPJ:</strong> {customer?.document || "-"}
            </p>
            <p>
              <strong className="text-slate-900">A/C (Contato):</strong> {customer?.contactPerson || "-"}
            </p>
            <p>
              <strong className="text-slate-900">Telefone:</strong> {customer?.phone || customer?.whatsapp || "-"}
            </p>
            <p className="sm:col-span-2">
              <strong className="text-slate-900">Local da Obra:</strong>{" "}
              {customer?.address ? `${customer.address}, ${customer.city} - ${customer.state}` : "-"}
            </p>
          </div>
        </div>

        {/* Título & Escopo Técnico dos Trabalhos */}
        <div className="space-y-3">
          <div className="border-b border-slate-300 pb-1">
            <h2 className="text-sm font-bold text-slate-900">
              1. Objeto da Proposta Comercial: {proposal.serviceTitle}
            </h2>
          </div>
          <div className="text-slate-700 leading-relaxed whitespace-pre-line text-[11px] bg-slate-50/50 p-3 rounded border border-slate-200">
            {proposal.scopeOfWork}
          </div>
        </div>

        {/* Tabela de Itens e Valores Discriminados */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-1">
            2. Discriminação dos Serviços e Materiais
          </h2>

          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Item / Especificação Técnica</th>
                <th className="py-2 px-3 text-center">Tipo</th>
                <th className="py-2 px-3 text-center">Qtd.</th>
                <th className="py-2 px-3 text-right">Valor Unitário</th>
                <th className="py-2 px-3 text-right">Total (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {proposal.items.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="py-2 px-3 text-slate-800 font-medium">
                    {it.description}
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-500 uppercase">
                    {it.type}
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-slate-700">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    {formatCurrency(it.unitPrice)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(it.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td colSpan={4} className="py-2.5 px-3 text-right text-sm uppercase">
                  Valor Total do Contrato:
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-base text-slate-950 font-black">
                  {formatCurrency(proposal.totalValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Condições Comerciais, Prazo, Pagamento e Garantia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200 rounded-lg p-4 bg-slate-50 text-[11px] text-slate-700">
          <div>
            <strong className="block text-slate-900 mb-0.5">Prazo de Execução:</strong>
            <p>{proposal.executionDeadline || "A combinar com o cliente"}</p>
          </div>
          <div>
            <strong className="block text-slate-900 mb-0.5">Condições de Pagamento:</strong>
            <p>{proposal.paymentTerms}</p>
          </div>
          <div>
            <strong className="block text-slate-900 mb-0.5">Garantia Técnica:</strong>
            <p>{proposal.warrantyTerms}</p>
          </div>
          <div>
            <strong className="block text-slate-900 mb-0.5">Dados para Pagamento via PIX:</strong>
            <p className="font-mono text-slate-900 font-semibold">
              Chave ({settings.pixKeyType}): {settings.pixKey}
            </p>
            <p className="text-[10px] text-slate-500">
              Banco: {settings.bankName} · Ag: {settings.bankAgency} · CC: {settings.bankAccount}
            </p>
          </div>
        </div>

        {/* Notas Legais & Normas Regulamentadoras */}
        <div className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
          <p>
            * Todos os serviços são executados rigorosamente em conformidade com as normas ABNT NBR 5410 (Instalações Elétricas em Baixa Tensão), NR-10 (Segurança em Instalações e Serviços em Eletricidade) e NR-35 (Trabalho em Altura). Emissão de Anotação de Responsabilidade Técnica (ART) junto ao CREA/SP inclusa.
          </p>
        </div>

        {/* Área para Aceite e Assinaturas */}
        <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-12 print-break-inside-avoid">
          <div className="text-center pt-8 border-t border-slate-400">
            <p className="font-bold text-slate-900">{settings.companyName}</p>
            <p className="text-slate-600 text-[10px]">{settings.technicalLead}</p>
            <p className="text-slate-400 text-[10px]">CONTRATADA</p>
          </div>

          <div className="text-center pt-8 border-t border-slate-400">
            <p className="font-bold text-slate-900">{proposal.customerName}</p>
            <p className="text-slate-600 text-[10px]">
              {customer?.contactPerson ? `Assinatura: ${customer.contactPerson}` : "De acordo / Aceite do Contratante"}
            </p>
            <p className="text-slate-400 text-[10px]">CONTRATANTE · Data: ____/____/2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
