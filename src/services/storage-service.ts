/**
 * Storage service: file-based (dev). All API handlers read/write the same
 * JSON files so state is shared across workers/processes. Replace with your
 * DB-backed implementation for production.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import { exampleTemplate } from "@/templates/example-template";

export type StorageService = {
  getTemplate(key: string): Promise<Template | null>;
  setTemplate(key: string, template: Template): Promise<void>;
  getProcessState(processId: string): Promise<Process | null>;
  saveProcessState(state: Process): Promise<void>;
  listProcesses(): Promise<Process[]>;
};

const STORE_DIR = join(process.cwd(), ".process-platform");
const TEMPLATES_FILE = join(STORE_DIR, "templates.json");
const PROCESS_STATES_FILE = join(STORE_DIR, "process-states.json");

async function ensureStoreDir(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
}

async function readTemplates(): Promise<Record<string, Template>> {
  try {
    const raw = await readFile(TEMPLATES_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, Template>;
  } catch {
    return { [exampleTemplate.key]: exampleTemplate };
  }
}

async function writeTemplates(templates: Record<string, Template>): Promise<void> {
  await ensureStoreDir();
  await writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
}

async function readProcessStates(): Promise<Record<string, Process>> {
  try {
    const raw = await readFile(PROCESS_STATES_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, Process>;
  } catch {
    return {};
  }
}

async function writeProcessStates(states: Record<string, Process>): Promise<void> {
  await ensureStoreDir();
  await writeFile(PROCESS_STATES_FILE, JSON.stringify(states, null, 2), "utf-8");
}

export const storageService: StorageService = {
  async getTemplate(key) {
    const templates = await readTemplates();
    return templates[key] ?? null;
  },
  async setTemplate(key, template) {
    const templates = await readTemplates();
    templates[key] = template;
    await writeTemplates(templates);
  },
  async getProcessState(processId) {
    const states = await readProcessStates();
    return states[processId] ?? null;
  },
  async saveProcessState(state) {
    const states = await readProcessStates();
    states[state.processId] = {
      ...state,
      updatedAt: new Date().toISOString(),
    };
    await writeProcessStates(states);
  },
  async listProcesses() {
    const states = await readProcessStates();
    return Object.values(states);
  },
};
