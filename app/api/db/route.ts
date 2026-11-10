import { NextRequest, NextResponse } from "next/server";
import { getDatabase, saveDatabase, resetDatabase } from "@/lib/db-server";
import type { ERPDatabase } from "@/lib/types";

export async function GET() {
  try {
    const db = await getDatabase();
    return NextResponse.json({ success: true, data: db });
  } catch (error) {
    console.error("GET /api/db error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao carregar banco de dados" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "reset") {
      const resetData = await resetDatabase();
      return NextResponse.json({ success: true, data: resetData });
    }

    if (body.data) {
      await saveDatabase(body.data as ERPDatabase);
      return NextResponse.json({ success: true, data: body.data });
    }

    return NextResponse.json(
      { success: false, error: "Dados inválidos para gravação" },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/db error:", error);
    return NextResponse.json(
      { success: false, error: "Falha ao salvar dados" },
      { status: 500 }
    );
  }
}
