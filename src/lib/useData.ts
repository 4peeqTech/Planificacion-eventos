"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChecklistItem, RespItem, AgendaItem, MomentoItem, FaqItem } from "./types";

export type AllData = {
  checklist: ChecklistItem[];
  resp: RespItem[];
  agenda: AgendaItem[];
  momentos: MomentoItem[];
  faq: FaqItem[];
};

const EMPTY: AllData = { checklist: [], resp: [], agenda: [], momentos: [], faq: [] };
const POLL_MS = 8000;

export function useAllData() {
  const [data, setData] = useState<AllData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Mientras el usuario está escribiendo/editando localmente, no queremos que
  // el polling le pise los cambios a mitad de camino.
  const suppressUntil = useRef<number>(0);
  // Cuántos guardados hay en vuelo ahora mismo. Mientras haya alguno, el
  // polling ignora lo que llegue: no importa cuánto tarde Google Sheets en
  // responder, nunca vamos a pisar el estado optimista con datos viejos.
  const pendingWrites = useRef(0);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/all", { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error al leer datos");
      if (pendingWrites.current === 0 && Date.now() > suppressUntil.current) {
        setData({
          checklist: (json.checklist || []).map((c: ChecklistItem & { checked: unknown; order: unknown }) => ({
            ...c,
            checked: c.checked === true || (c.checked as unknown as string) === "TRUE",
            order: Number(c.order) || 0,
          })),
          resp: json.resp || [],
          agenda: (json.agenda || []).map((a: AgendaItem & { order: unknown }) => ({ ...a, order: Number(a.order) || 0 })),
          momentos: (json.momentos || []).map((m: MomentoItem & { order: unknown }) => ({ ...m, order: Number(m.order) || 0 })),
          faq: (json.faq || []).map((f: FaqItem & { order: unknown }) => ({ ...f, order: Number(f.order) || 0 })),
        });
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  /** Marca una pausa breve en el polling para no pisar una edición en curso. */
  const holdSync = useCallback((ms = 2500) => {
    suppressUntil.current = Date.now() + ms;
  }, []);

  /** Guarda una pestaña completa, protegiendo el estado local de un poll que llegue mientras el request sigue en vuelo. */
  const saveTab = useCallback(
    async <K extends keyof AllData>(key: K, url: string, items: AllData[K]) => {
      pendingWrites.current += 1;
      setSaving(true);
      setData((d) => ({ ...d, [key]: items }));
      try {
        await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
      } finally {
        pendingWrites.current -= 1;
        holdSync(); // margen extra por si Google Sheets tarda en propagar la escritura
        setSaving(false);
      }
    },
    [holdSync]
  );

  const saveChecklist = useCallback((items: ChecklistItem[]) => saveTab("checklist", "/api/checklist", items), [saveTab]);
  const saveResp = useCallback((items: RespItem[]) => saveTab("resp", "/api/resp", items), [saveTab]);
  const saveFaq = useCallback((items: FaqItem[]) => saveTab("faq", "/api/faq", items), [saveTab]);
  const saveAgenda = useCallback((items: AgendaItem[]) => saveTab("agenda", "/api/agenda", items), [saveTab]);
  const saveMomentos = useCallback((items: MomentoItem[]) => saveTab("momentos", "/api/momentos", items), [saveTab]);

  return { data, loading, error, saving, refresh: fetchAll, saveChecklist, saveResp, saveFaq, saveAgenda, saveMomentos };
}
