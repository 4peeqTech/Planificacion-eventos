"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAllData } from "@/lib/useData";
import type { ChecklistItem, MomentoItem } from "@/lib/types";

const PHASE_LABEL: Record<string, string> = {
  antes: "ANTES",
  durante: "DURANTE",
  despues: "DESPUÉS",
};
const PHASE_ORDER = ["antes", "durante", "despues"];
const PHASE_COLOR: Record<string, string> = {
  antes: "#7764A9",
  durante: "#232C58",
  despues: "#7a8a52",
};

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function Home() {
  const router = useRouter();
  const { data, loading, error, saving, saveChecklist, saveResp, saveMomentos } = useAllData();
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [filterPhase, setFilterPhase] = useState<string>("todas");
  const [editMomentos, setEditMomentos] = useState(false);
  const [newMomentoTitle, setNewMomentoTitle] = useState<Record<string, string>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");

  const momentosByPhase = useMemo(() => {
    const grouped: Record<string, typeof data.momentos> = { antes: [], durante: [], despues: [] };
    for (const m of data.momentos) {
      if (!grouped[m.phase]) grouped[m.phase] = [];
      grouped[m.phase].push(m);
    }
    for (const p of Object.keys(grouped)) {
      grouped[p].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [data.momentos]);

  const checklistByStation = useMemo(() => {
    const grouped: Record<string, ChecklistItem[]> = {};
    for (const c of data.checklist) {
      if (!grouped[c.stationId]) grouped[c.stationId] = [];
      grouped[c.stationId].push(c);
    }
    for (const s of Object.keys(grouped)) {
      grouped[s].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [data.checklist]);

  const respByStation = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of data.resp) map[r.stationId] = r.people;
    return map;
  }, [data.resp]);

  // stationId que aparecen en tareas/responsables pero no tienen su estación (Momentos) creada.
  const orphanStationIds = useMemo(() => {
    const known = new Set(data.momentos.map((m) => m.stationId));
    const found = new Set<string>();
    for (const c of data.checklist) if (c.stationId && !known.has(c.stationId)) found.add(c.stationId);
    for (const r of data.resp) if (r.stationId && !known.has(r.stationId)) found.add(r.stationId);
    return Array.from(found);
  }, [data.checklist, data.resp, data.momentos]);

  function createOrphanStations() {
    if (orphanStationIds.length === 0) return;
    const maxOrder = (momentosByPhase["antes"] || []).reduce((m, x) => Math.max(m, x.order), -1);
    const newItems: MomentoItem[] = orphanStationIds.map((id, i) => ({
      stationId: id,
      phase: "antes",
      title: id,
      order: maxOrder + 1 + i,
      no: "",
    }));
    saveMomentos([...data.momentos, ...newItems]);
    setEditMomentos(true);
  }

  const totalTasks = data.checklist.length;
  const doneTasks = data.checklist.filter((c) => c.checked).length;

  function toggleTask(item: ChecklistItem) {
    const updated = data.checklist.map((c) =>
      c.id === item.id ? { ...c, checked: !c.checked } : c
    );
    saveChecklist(updated);
  }

  function addTask(stationId: string) {
    const text = newTaskText.trim();
    if (!text) return;
    const existing = checklistByStation[stationId] || [];
    const maxOrder = existing.reduce((m, c) => Math.max(m, c.order), -1);
    const newItem: ChecklistItem = {
      id: uid("chk"),
      stationId,
      text,
      checked: false,
      notes: "",
      order: maxOrder + 1,
      files: "",
    };
    saveChecklist([...data.checklist, newItem]);
    setNewTaskText("");
  }

  function deleteTask(id: string) {
    saveChecklist(data.checklist.filter((c) => c.id !== id));
  }

  function startEditTask(item: ChecklistItem) {
    setEditingTaskId(item.id);
    setEditingTaskText(item.text);
  }

  function saveEditTask() {
    if (!editingTaskId) return;
    const text = editingTaskText.trim();
    if (text) {
      saveChecklist(data.checklist.map((c) => (c.id === editingTaskId ? { ...c, text } : c)));
    }
    setEditingTaskId(null);
  }

  function updatePeople(stationId: string, peopleText: string) {
    const others = data.resp.filter((r) => r.stationId !== stationId);
    saveResp([...others, { stationId, people: peopleText }]);
  }

  function updateMomentoTitle(stationId: string, title: string) {
    saveMomentos(data.momentos.map((m) => (m.stationId === stationId ? { ...m, title } : m)));
  }

  function updateMomentoPhase(stationId: string, phase: string) {
    saveMomentos(data.momentos.map((m) => (m.stationId === stationId ? { ...m, phase } : m)));
  }

  function addMomento(phase: string) {
    const text = (newMomentoTitle[phase] || "").trim();
    if (!text) return;
    const existing = momentosByPhase[phase] || [];
    const maxOrder = existing.reduce((m, x) => Math.max(m, x.order), -1);
    const newItem: MomentoItem = {
      stationId: uid("st"),
      phase,
      title: text,
      order: maxOrder + 1,
      no: "",
    };
    saveMomentos([...data.momentos, newItem]);
    setNewMomentoTitle((s) => ({ ...s, [phase]: "" }));
  }

  function deleteMomento(stationId: string) {
    if (!window.confirm("¿Borrar esta estación? También se van a borrar sus tareas y responsables.")) return;
    saveMomentos(data.momentos.filter((m) => m.stationId !== stationId));
    saveChecklist(data.checklist.filter((c) => c.stationId !== stationId));
    saveResp(data.resp.filter((r) => r.stationId !== stationId));
    if (activeStation === stationId) setActiveStation(null);
  }

  const visiblePhases = filterPhase === "todas" ? PHASE_ORDER : [filterPhase];

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const overallPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F5FA", color: "#15142B" }}>
      <header
        className="app-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #DCD3EA",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 22 }}>🎤</span>
        <h1 className="app-title" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Pymetón La Conferencia</h1>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#514C6B" }}>
          {saving && <span>Guardando…</span>}
          {!saving && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{doneTasks}/{totalTasks} tareas hechas</span>
              <div style={{ width: 72, height: 6, borderRadius: 999, background: "#EFE9F5", overflow: "hidden" }}>
                <div
                  className="progress-fill"
                  style={{ width: `${overallPct}%`, height: "100%", background: "#7764A9", borderRadius: 999 }}
                />
              </div>
            </div>
          )}
          {error && <span style={{ color: "#c0392b" }}>Error: {error}</span>}
          <button
            onClick={logout}
            className="pill-btn"
            style={{
              border: "1px solid #DCD3EA",
              background: "#fff",
              color: "#514C6B",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="app-filters" style={{ padding: "14px 20px 6px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["todas", ...PHASE_ORDER].map((p) => (
          <button
            key={p}
            onClick={() => setFilterPhase(p)}
            className="pill-btn"
            style={{
              border: "1px solid " + (filterPhase === p ? "#7764A9" : "#DCD3EA"),
              background: filterPhase === p ? "#EFE9F5" : "#fff",
              color: filterPhase === p ? "#7764A9" : "#514C6B",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: 0.04,
            }}
          >
            {p === "todas" ? "Todas" : PHASE_LABEL[p]}
          </button>
        ))}
        <button
          onClick={() => setEditMomentos((v) => !v)}
          className="pill-btn"
          style={{
            marginLeft: "auto",
            border: "1px solid " + (editMomentos ? "#7764A9" : "#DCD3EA"),
            background: editMomentos ? "#7764A9" : "#fff",
            color: editMomentos ? "#fff" : "#514C6B",
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {editMomentos ? "✓ Listo" : "✎ Editar estaciones"}
        </button>
      </div>

      {!loading && orphanStationIds.length > 0 && (
        <div
          style={{
            margin: "0 20px 14px",
            background: "#FFF7E6",
            border: "1px solid #F0D999",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12.5,
            color: "#7a5c00",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span>
            ⚠️ Hay {orphanStationIds.length} estación(es) con tareas o responsables cargados pero sin nombre/fase definidos en &quot;Momentos&quot;.
          </span>
          <button
            onClick={createOrphanStations}
            style={{
              background: "#7764A9",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Crear estaciones automáticamente
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#514C6B" }}>Cargando…</div>
      ) : (
        <main className="app-main" style={{ padding: "10px 20px 60px", display: "flex", flexDirection: "column", gap: 26 }}>
          {visiblePhases.map((phase) => {
            const moments = momentosByPhase[phase] || [];
            if (moments.length === 0 && !editMomentos) return null;
            return (
              <section key={phase}>
                <h2
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: PHASE_COLOR[phase],
                    borderBottom: `2px solid ${PHASE_COLOR[phase]}`,
                    paddingBottom: 6,
                    marginBottom: 12,
                  }}
                >
                  {PHASE_LABEL[phase]}
                </h2>
                <div className="station-grid">
                  {moments.map((m) => {
                    const tasks = checklistByStation[m.stationId] || [];
                    const done = tasks.filter((t) => t.checked).length;
                    const stationPct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
                    const isOpen = activeStation === m.stationId;
                    return (
                      <div
                        key={m.stationId}
                        className="station-card"
                        style={{
                          background: "#fff",
                          border: "1px solid #DCD3EA",
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        {editMomentos ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <input
                                value={m.title}
                                onChange={(e) => updateMomentoTitle(m.stationId, e.target.value)}
                                style={{
                                  flex: 1,
                                  border: "1px solid #DCD3EA",
                                  borderRadius: 7,
                                  padding: "6px 9px",
                                  fontSize: 13,
                                  fontWeight: 700,
                                }}
                              />
                              <button
                                onClick={() => deleteMomento(m.stationId)}
                                className="danger-btn"
                                aria-label="Borrar estación"
                                style={{
                                  border: "1px solid #e0b4b4",
                                  background: "#fff",
                                  color: "#c0392b",
                                  borderRadius: 7,
                                  padding: "0 10px",
                                  cursor: "pointer",
                                }}
                              >
                                🗑
                              </button>
                            </div>
                            <select
                              value={m.phase}
                              onChange={(e) => updateMomentoPhase(m.stationId, e.target.value)}
                              style={{
                                border: "1px solid #DCD3EA",
                                borderRadius: 7,
                                padding: "6px 9px",
                                fontSize: 12.5,
                                color: "#514C6B",
                              }}
                            >
                              {PHASE_ORDER.map((ph) => (
                                <option key={ph} value={ph}>
                                  {PHASE_LABEL[ph]}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveStation(isOpen ? null : m.stationId)}
                            style={{
                              all: "unset",
                              cursor: "pointer",
                              display: "block",
                              width: "100%",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{m.title}</span>
                              <span style={{ marginLeft: "auto", fontSize: 12, color: "#514C6B" }}>
                                {done}/{tasks.length}
                              </span>
                            </div>
                            {tasks.length > 0 && (
                              <div style={{ width: "100%", height: 5, borderRadius: 999, background: "#EFE9F5", overflow: "hidden", marginTop: 6 }}>
                                <div
                                  className="progress-fill"
                                  style={{ width: `${stationPct}%`, height: "100%", background: PHASE_COLOR[m.phase] || "#7764A9", borderRadius: 999 }}
                                />
                              </div>
                            )}
                            {respByStation[m.stationId] && (
                              <div style={{ fontSize: 11.5, color: "#514C6B", marginTop: 4 }}>
                                👤 {respByStation[m.stationId]}
                              </div>
                            )}
                          </button>
                        )}

                        {isOpen && (
                          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            <input
                              value={respByStation[m.stationId] || ""}
                              onChange={(e) => updatePeople(m.stationId, e.target.value)}
                              placeholder="Responsables (separados por coma)"
                              style={{
                                border: "1px solid #DCD3EA",
                                borderRadius: 7,
                                padding: "6px 9px",
                                fontSize: 12.5,
                              }}
                            />
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                              {tasks.map((t) => (
                                <div
                                  key={t.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 8,
                                    padding: "6px 2px",
                                    borderBottom: "1px solid #EFE9F5",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={t.checked}
                                    onChange={() => toggleTask(t)}
                                    style={{ marginTop: 2, accentColor: "#7764A9", cursor: "pointer" }}
                                  />
                                  {editingTaskId === t.id ? (
                                    <input
                                      autoFocus
                                      value={editingTaskText}
                                      onChange={(e) => setEditingTaskText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") saveEditTask();
                                        if (e.key === "Escape") setEditingTaskId(null);
                                      }}
                                      onBlur={saveEditTask}
                                      style={{
                                        flex: 1,
                                        border: "1px solid #7764A9",
                                        borderRadius: 6,
                                        padding: "3px 6px",
                                        fontSize: 13,
                                      }}
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={() => startEditTask(t)}
                                      style={{
                                        fontSize: 13,
                                        flex: 1,
                                        cursor: "text",
                                        textDecoration: t.checked ? "line-through" : "none",
                                        color: t.checked ? "#999" : "#15142B",
                                      }}
                                    >
                                      {t.text}
                                      {t.files && (
                                        <div style={{ fontSize: 11, marginTop: 2 }}>
                                          {t.files.split(";").map((u, i) => {
                                            const url = u.trim();
                                            if (!url) return null;
                                            return (
                                              <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: "#7764A9", marginRight: 6 }}>
                                                📎 archivo
                                              </a>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => startEditTask(t)}
                                    className="icon-btn"
                                    style={{
                                      all: "unset",
                                      cursor: "pointer",
                                      color: "#999",
                                      fontSize: 12,
                                      padding: "0 4px",
                                    }}
                                    aria-label="Editar"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => deleteTask(t.id)}
                                    className="icon-btn"
                                    style={{
                                      all: "unset",
                                      cursor: "pointer",
                                      color: "#999",
                                      fontSize: 13,
                                      padding: "0 4px",
                                    }}
                                    aria-label="Eliminar"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                              <input
                                value={activeStation === m.stationId ? newTaskText : ""}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") addTask(m.stationId);
                                }}
                                placeholder="Nueva tarea…"
                                style={{
                                  flex: 1,
                                  border: "1px solid #DCD3EA",
                                  borderRadius: 7,
                                  padding: "6px 9px",
                                  fontSize: 12.5,
                                }}
                              />
                              <button
                                onClick={() => addTask(m.stationId)}
                                style={{
                                  background: "#7764A9",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 7,
                                  padding: "6px 12px",
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Agregar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {editMomentos && (
                    <div
                      style={{
                        border: "1px dashed #DCD3EA",
                        borderRadius: 12,
                        padding: 14,
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <input
                        value={newMomentoTitle[phase] || ""}
                        onChange={(e) => setNewMomentoTitle((s) => ({ ...s, [phase]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addMomento(phase);
                        }}
                        placeholder="Nueva estación…"
                        style={{
                          flex: 1,
                          border: "1px solid #DCD3EA",
                          borderRadius: 7,
                          padding: "6px 9px",
                          fontSize: 12.5,
                        }}
                      />
                      <button
                        onClick={() => addMomento(phase)}
                        style={{
                          background: "#7764A9",
                          color: "#fff",
                          border: "none",
                          borderRadius: 7,
                          padding: "6px 12px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Agregar
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}
