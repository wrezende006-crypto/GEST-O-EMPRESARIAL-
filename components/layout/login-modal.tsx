"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { useERP } from "@/lib/erp-context";

export function LoginModal() {
  const { authenticated, login, db } = useERP();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (authenticated) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(pin);
    if (!success) {
      setError(true);
      setPin("");
    } else {
      setError(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
        <div className="relative w-16 h-16 mx-auto mb-4 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-950">
          <Image
            src={db.settings.logoUrl || "/images/logo.jpg"}
            alt="NEXT GESTÃO ERP"
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-1">
          NEXT GESTÃO ERP
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Acesso Administrativo & Financeiro Restrito
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                autoFocus
                placeholder="Digite a Senha / PIN (Padrão: 1234)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-center tracking-widest text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>
            {error && (
              <p className="text-rose-400 text-xs mt-1.5 font-medium">
                PIN incorreto. A senha padrão de demonstração é 1234.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <span>Desbloquear Painel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Gestão exclusiva do proprietário & diretoria</span>
        </div>
      </div>
    </div>
  );
}
