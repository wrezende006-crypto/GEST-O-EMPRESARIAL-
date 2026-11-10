import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    const { cnpj } = await params;
    const cleanCnpj = (cnpj || "").replace(/\D/g, "");

    if (cleanCnpj.length !== 14) {
      return NextResponse.json(
        { success: false, error: "CNPJ deve conter 14 dígitos numéricos." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const token = db.settings?.cnpjApiToken;

    // 1. Tentar BrasilAPI primeiro (Rápida, pública e gratuita)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {
        "User-Agent": "NEXT-GESTAO-ERP/2.0",
      };

      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const telefone = [data.ddd_telefone_1, data.ddd_telefone_2]
          .filter(Boolean)
          .join(" / ");

        return NextResponse.json({
          success: true,
          source: "BrasilAPI",
          data: {
            cnpj: data.cnpj || cleanCnpj,
            razao_social: data.razao_social || "",
            nome_fantasia: data.nome_fantasia || data.razao_social || "",
            situacao_cadastral: data.descricao_situacao_cadastral || "ATIVA",
            logradouro: data.logradouro || "",
            numero: data.numero || "",
            bairro: data.bairro || "",
            municipio: data.municipio || "",
            uf: data.uf || "",
            cep: data.cep || "",
            telefone: telefone || "",
            email: data.email || "",
          },
        });
      }
    } catch (err) {
      console.warn("BrasilAPI falhou ou expirou tempo, tentando fallback:", err);
    }

    // 2. Fallback: ReceitaWS
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.status === "ERROR") {
          return NextResponse.json(
            { success: false, error: data.message || "CNPJ não encontrado na base da Receita." },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          source: "ReceitaWS",
          data: {
            cnpj: data.cnpj || cleanCnpj,
            razao_social: data.nome || "",
            nome_fantasia: data.fantasia || data.nome || "",
            situacao_cadastral: data.situacao || "ATIVA",
            logradouro: data.logradouro || "",
            numero: data.numero || "",
            bairro: data.bairro || "",
            municipio: data.municipio || "",
            uf: data.uf || "",
            cep: data.cep || "",
            telefone: data.telefone || "",
            email: data.email || "",
          },
        });
      }
    } catch (err) {
      console.error("ReceitaWS falhou:", err);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível consultar os dados do CNPJ no momento. Verifique a conexão ou preencha manualmente.",
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("Erro na rota /api/cnpj:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor de consulta de CNPJ." },
      { status: 500 }
    );
  }
}
