/**
 * Storage service: file-based (local/dev). All API handlers read/write the same
 * JSON files so state is shared across workers/processes.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import { curveTopupTemplate } from "@/templates/curve-topup";
import { ibPayoutsTemplate } from "@/templates/ib-payouts";
import { nfatSubscribeTemplate } from "@/templates/nfat-subscribe";
import { nfatSetupFacilityTemplate } from "@/templates/nfat-setup-facility";
import { nfatEnableFacilityForPrimeTemplate } from "@/templates/nfat-enable-facility-for-prime";
import { integrationBoostOnboardingTemplate } from "@/templates/integrator-onboarding";
import type { IStorageService } from "./interface";

const STORE_DIR = join(process.cwd(), ".process-platform");
const TEMPLATES_FILE = join(STORE_DIR, "templates.json");
const PROCESS_STATES_FILE = join(STORE_DIR, "process-states.json");

async function ensureStoreDir(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
}

function seedTemplatesRecord(): Record<string, Template> {
  const now = new Date().toISOString();
  return {
    [curveTopupTemplate.key]: { ...curveTopupTemplate, updatedAt: now },
    [ibPayoutsTemplate.key]: { ...ibPayoutsTemplate, updatedAt: now },
    [nfatSetupFacilityTemplate.key]: { ...nfatSetupFacilityTemplate, updatedAt: now },
    [nfatEnableFacilityForPrimeTemplate.key]: { ...nfatEnableFacilityForPrimeTemplate, updatedAt: now },
    [nfatSubscribeTemplate.key]: { ...nfatSubscribeTemplate, updatedAt: now },
    [integrationBoostOnboardingTemplate.key]: {
      ...integrationBoostOnboardingTemplate,
      updatedAt: now,
    },
  };
}

async function readTemplates(): Promise<Record<string, Template>> {
  const seeds = seedTemplatesRecord();
  try {
    const raw = await readFile(TEMPLATES_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, Template>;
    for (const [k, t] of Object.entries(seeds)) {
      if (!(k in parsed)) {
        parsed[k] = { ...t };
      }
    }
    return parsed;
  } catch {
    return seeds;
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

export const fileStorageService: IStorageService = {
  async getTemplate(key) {
    const templates = await readTemplates();
    return templates[key] ?? null;
  },
  async setTemplate(key, template) {
    const templates = await readTemplates();
    templates[key] = {
      ...template,
      updatedAt: new Date().toISOString(),
    };
    await writeTemplates(templates);
  },
  async listTemplates() {
    const templates = await readTemplates();
    return Object.values(templates);
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
  async deleteProcess(processId) {
    const states = await readProcessStates();
    if (!(processId in states)) return false;
    delete states[processId];
    await writeProcessStates(states);
    return true;
  },
};
