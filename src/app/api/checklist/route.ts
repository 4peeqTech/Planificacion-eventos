import { NextRequest, NextResponse } from "next/server";
import { readSheet, writeSheet } from "@/lib/sheets";
import type { ChecklistItem } from "@/lib/types";

const HEADERS = ["id", "stationId", "text", "checked", "notes", "order", "files"];

export async function GET() {
  try {
    const rows = await readSheet<ChecklistItem>("Checklist");
    return NextResponse.json({ ok: true, items: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Reemplaza toda la lista (se usa tras agregar/editar/borrar/tildar).
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const items: ChecklistItem[] = body.items || [];
    const rows = items.map((it) => [
      it.id,
      it.stationId,
      it.text,
      it.checked ? "TRUE" : "FALSE",
      it.notes || "",
      it.order,
      it.files || "",
    ]);
    await writeSheet("Checklist", HEADERS, rows);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
