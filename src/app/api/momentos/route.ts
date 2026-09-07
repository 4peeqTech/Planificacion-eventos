import { NextRequest, NextResponse } from "next/server";
import { readSheet, writeSheet } from "@/lib/sheets";
import type { MomentoItem } from "@/lib/types";

const HEADERS = ["stationId", "phase", "title", "order", "no"];

export async function GET() {
  try {
    const rows = await readSheet<MomentoItem>("Momentos");
    return NextResponse.json({ ok: true, items: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const items: MomentoItem[] = body.items || [];
    const rows = items.map((it) => [it.stationId, it.phase, it.title, it.order, it.no ?? ""]);
    await writeSheet("Momentos", HEADERS, rows);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
