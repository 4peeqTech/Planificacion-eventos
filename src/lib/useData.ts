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

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/all", { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Error al leer datos");
      if (Date.now() > suppressUntil.current) {
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

  const saveChecklist = useCallback(async (items: ChecklistItem[]) => {
    setSaving(true);
    holdSync();
    setData((d) => ({ ...d, checklist: items }));
    try {
      await fetch("/api/checklist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } finally {
      setSaving(false);
    }
  }, [holdSync]);

  const saveResp = useCallback(async (items: RespItem[]) => {
    setSaving(true);
    holdSync();
    setData((d) => ({ ...d, resp: items }));
    try {
      await fetch("/api/resp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } finally {
      setSaving(false);
    }
  }, [holdSync]);

  const saveFaq = useCallback(async (items: FaqItem[]) => {
    setSaving(true);
    holdSync();
    setData((d) => ({ ...d, faq: items }));
    try {
      await fetch("/api/faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } finally {
      setSaving(false);
    }
  }, [holdSync]);

  const saveAgenda = useCallback(async (items: AgendaItem[]) => {
    setSaving(true);
    holdSync();
    setData((d) => ({ ...d, agenda: items }));
    try {
      await fetch("/api/agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } finally {
      setSaving(false);
    }
  }, [holdSync]);

  const saveMomentos = useCallback(async (items: MomentoItem[]) => {
    setSaving(true);
    holdSync();
    setData((d) => ({ ...d, momentos: items }));
    try {
      await fetch("/api/momentos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } finally {
      setSaving(false);
    }
  }, [holdSync]);

  return { data, loading, error, saving, refresh: fetchAll, saveChecklist, saveResp, saveFaq, saveAgenda, saveMomentos };
}
