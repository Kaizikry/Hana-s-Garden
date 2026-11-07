import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

/** Runs backend/Code.gs against in-memory stand-ins for the Google services it uses. */
export function loadBackend(properties: Record<string, string> = { ADMIN_PIN: "482193", DRIVE_FOLDER_ID: "folder" }) {
  const sheets = new Map<string, unknown[][]>();
  const cache = new Map<string, string>();
  const sentEmails: unknown[] = [];
  const uploads: { mime: string }[] = [];
  const rowRewrites: string[] = [];

  const sheetApi = (name: string) => {
    const rows = sheets.get(name)!;
    return {
      getLastRow: () => rows.length,
      appendRow: (row: unknown[]) => rows.push(row),
      getDataRange: () => ({ getValues: () => rows.map((r) => [...r]) }),
      getRange: (row: number, column: number) => ({
        setValues: (values: unknown[][]) => {
          rows[row - 1] = values[0];
          rowRewrites.push(name);
        },
        setValue: (value: unknown) => {
          rows[row - 1][column - 1] = value;
        },
      }),
      deleteRow: (row: number) => rows.splice(row - 1, 1),
    };
  };

  const context = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (name: string) => (sheets.has(name) ? sheetApi(name) : null),
        insertSheet: (name: string) => {
          sheets.set(name, []);
          return sheetApi(name);
        },
      }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => properties[k] ?? null }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => cache.get(k) ?? null,
        put: (k: string, v: string) => cache.set(k, v),
        remove: (k: string) => cache.delete(k),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: (m: unknown) => sentEmails.push(m) },
    Utilities: {
      base64Decode: (s: string) => Buffer.from(s, "base64"),
      newBlob: (_b: unknown, mime: string) => ({ mime }),
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: "a" },
      Permission: { VIEW: "v" },
      getFolderById: () => ({
        createFile: (blob: { mime: string }) => {
          uploads.push(blob);
          return { setSharing() {}, getId: () => "file1" };
        },
      }),
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text: string) => ({ text, setMimeType() { return this; } }),
    },
  });

  vm.runInContext(readFileSync(join(import.meta.dirname, "../backend/Code.gs"), "utf8"), context);
  const fn = context as unknown as { doGet: () => { text: string }; doPost: (e: unknown) => { text: string } };

  return {
    sheets,
    sentEmails,
    uploads,
    rowRewrites,
    get: () => JSON.parse(fn.doGet().text),
    post: (body: unknown) => JSON.parse(fn.doPost({ postData: { contents: JSON.stringify(body) } }).text),
  };
}
