import { NextRequest, NextResponse } from "next/server";
import { readSheet, writeSheet } from "@/lib/sheets";
import type { AgendaItem } from "@/lib/types";

const HEADERS = ["id", "start", "end", "activity", "resp", "order"];

export async function GET() {
  try {
    const rows = await readSheet<AgendaItem>("Agenda");
    return NextResponse.json({ ok: true, items: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const items: AgendaItem[] = body.items || [];
    const rows = items.map((it) => [it.id, it.start, it.end, it.activity, it.resp || "", it.order]);
    await writeSheet("Agenda", HEADERS, rows);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
