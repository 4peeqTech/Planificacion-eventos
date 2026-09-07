import { NextRequest, NextResponse } from "next/server";
import { readSheet, writeSheet } from "@/lib/sheets";
import type { RespItem } from "@/lib/types";

const HEADERS = ["stationId", "people"];

export async function GET() {
  try {
    const rows = await readSheet<RespItem>("Responsables");
    return NextResponse.json({ ok: true, items: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const items: RespItem[] = body.items || [];
    const rows = items.map((it) => [it.stationId, it.people || ""]);
    await writeSheet("Responsables", HEADERS, rows);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
