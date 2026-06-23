import { readFile, writeFile, mkdir, rename } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");

async function ensureDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function fileGet<T>(filename: string): Promise<T | null> {
  try {
    const raw = await readFile(join(DATA_DIR, filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function fileSet(filename: string, value: unknown): Promise<void> {
  await ensureDir();
  const finalPath = join(DATA_DIR, filename);
  const tmpPath = `${finalPath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(value, null, 2), "utf-8");
  await rename(tmpPath, finalPath);
}
