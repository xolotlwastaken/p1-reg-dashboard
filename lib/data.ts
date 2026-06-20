import "server-only";

import fs from "fs/promises";
import path from "path";

import type { GeneratedManifest, P1RegistrationRow } from "@/lib/types";

const dataDir = path.join(process.cwd(), "public", "data");

const emptyManifest: GeneratedManifest = {
  generatedAt: "",
  sourceUrl: "",
  years: [],
  totalRows: 0,
  rowsByYear: {}
};

export async function readManifest(): Promise<GeneratedManifest> {
  const manifestPath = path.join(dataDir, "manifest.json");

  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(raw) as GeneratedManifest;
  } catch {
    return emptyManifest;
  }
}

export async function readAllRows(): Promise<P1RegistrationRow[]> {
  const rowsPath = path.join(dataDir, "all.json");

  try {
    const raw = await fs.readFile(rowsPath, "utf8");
    return JSON.parse(raw) as P1RegistrationRow[];
  } catch {
    return [];
  }
}
