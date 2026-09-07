import { NextRequest, NextResponse } from "next/server";
import { readSheet, writeSheet } from "@/lib/sheets";
import type { FaqItem } from "@/lib/types";

const HEADERS = ["id", "stationId", "q", "a", "order"];

export async function GET() {
  try {
    const rows = await readSheet<FaqItem>("FAQ");
    return NextResponse.json({ ok: true, items: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const items: FaqItem[] = body.items || [];
    const rows = items.map((it) => [it.id, it.stationId, it.q, it.a || "", it.order]);
    await writeSheet("FAQ", HEADERS, rows);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
