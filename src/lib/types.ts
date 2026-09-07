export type ChecklistItem = {
  id: string;
  stationId: string;
  text: string;
  checked: boolean;
  notes: string;
  order: number;
  files: string; // links separados por "; "
};

export type RespItem = {
  stationId: string;
  people: string; // nombres separados por coma
};

export type AgendaItem = {
  id: string;
  start: string;
  end: string;
  activity: string;
  resp: string;
  order: number;
};

export type MomentoItem = {
  stationId: string;
  phase: "antes" | "durante" | "despues" | string;
  title: string;
  order: number;
  no: string;
};

export type FaqItem = {
  id: string;
  stationId: string;
  q: string;
  a: string;
  order: number;
};
