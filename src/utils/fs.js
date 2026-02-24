import { mkdir, writeFile, readFile } from 'fs/promises';

export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}
