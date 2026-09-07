import { NextResponse } from "next/server";
import { readSheet } from "@/lib/sheets";
import type {
  ChecklistItem,
  RespItem,
  AgendaItem,
  MomentoItem,
  FaqItem,
} from "@/lib/types";

export async function GET() {
  try {
    const [checklist, resp, agenda, momentos, faq] = await Promise.all([
      readSheet<ChecklistItem>("Checklist"),
      readSheet<RespItem>("Responsables"),
      readSheet<AgendaItem>("Agenda"),
      readSheet<MomentoItem>("Momentos"),
      readSheet<FaqItem>("FAQ"),
    ]);
    return NextResponse.json({
      ok: true,
      checklist,
      resp,
      agenda,
      momentos,
      faq,
      fetchedAt: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
