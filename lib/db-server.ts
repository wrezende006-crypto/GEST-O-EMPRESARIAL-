import fs from "fs/promises";
import path from "path";
import type { ERPDatabase } from "./types";
import { initialERPData } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "voltmaster_erp.json");

// In-memory cache for fast response and concurrency resilience
let inMemoryDb: ERPDatabase | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Error creating data directory:", err);
  }
}

export async function getDatabase(): Promise<ERPDatabase> {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  await ensureDataDir();

  try {
    const fileContent = await fs.readFile(DB_FILE, "utf-8");
    const parsed = JSON.parse(fileContent) as ERPDatabase;
    inMemoryDb = parsed;
    return parsed;
  } catch {
    // Se o arquivo não existir ou estiver corrompido, inicializa com os dados semente
    inMemoryDb = initialERPData;
    await saveDatabase(initialERPData);
    return initialERPData;
  }
}

export async function saveDatabase(data: ERPDatabase): Promise<void> {
  await ensureDataDir();
  inMemoryDb = {
    ...data,
    lastUpdated: new Date().toISOString(),
  };

  // Escrita atômica em fila para evitar corrupção por acessos concorrentes
  writeQueue = writeQueue.then(async () => {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      await fs.writeFile(tempFile, JSON.stringify(inMemoryDb, null, 2), "utf-8");
      await fs.rename(tempFile, DB_FILE);
    } catch (err) {
      console.error("Error persisting ERP database to file:", err);
    }
  });

  await writeQueue;
}

export async function resetDatabase(): Promise<ERPDatabase> {
  await saveDatabase(initialERPData);
  return initialERPData;
}
