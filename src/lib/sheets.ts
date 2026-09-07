import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Private key comes from env as a single line with literal \n sequences —
  // Vercel (and most .env systems) can't store real newlines in a var, so we
  // un-escape them here.
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Faltan las variables de entorno GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY"
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

/** Lee todas las filas de una pestaña (asumiendo fila 1 = headers). */
export async function readSheet<T = Record<string, string>>(
  tabName: string
): Promise<T[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A1:Z10000`,
  });
  const rows = res.data.values || [];
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? String(row[i]) : "";
    });
    return obj as unknown as T;
  });
}

/** Sobrescribe toda una pestaña (headers + filas) — usado tras cada cambio. */
export async function writeSheet(
  tabName: string,
  headers: string[],
  rows: (string | number | boolean)[][]
): Promise<void> {
  const sheets = getSheetsClient();
  const values = [headers, ...rows.map((r) => r.map((v) => (v === undefined || v === null ? "" : v)))];
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A1:Z10000`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}
