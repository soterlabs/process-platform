/**
 * Storage service: MongoDB-backed. Same API for use in production (e.g. Railway).
 * Uses MONGO_URL for connection.
 */
import { MongoClient, type Db, type Collection, type Filter } from "mongodb";
import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import { curveTopupTemplate } from "@/templates/curve-topup";
import { ibPayoutsTemplate } from "@/templates/ib-payouts";
import { nfatSubscribeTemplate } from "@/templates/nfat-subscribe";
import { nfatSetupFacilityTemplate } from "@/templates/nfat-setup-facility";
import type { IStorageService } from "./interface";
import { nfatEnableFacilityForPrimeTemplate } from "@/templates/nfat-enable-facility-for-prime";
import { integrationBoostOnboardingTemplate } from "@/templates/integrator-onboarding";
import { agentSpellReviewTemplate } from "@/templates/agent-spell-review";
import {
  enqueueSolanaFreezeTxTemplate,
  verifySolanaBridgeFrozenTemplate,
} from "@/templates/freeze-solana-bridge";

const MONGO_URL = process.env.MONGO_URL ?? "";
const DB_NAME = "process-platform";

const COLL = {
  templates: "templates",
  processes: "processes",
} as const;

let client: MongoClient | null = null;
let db: Db | null = null;

async function getDb(): Promise<Db> {
  if (!MONGO_URL) {
    throw new Error("MONGO_URL is not set");
  }
  if (!db) {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
  }
  return db;
}

function col<T extends object>(name: keyof typeof COLL): Promise<Collection<T>> {
  return getDb().then((d) => d.collection<T>(name));
}

type DocWithStringId = { _id: string };

const SEED_TEMPLATES: Template[] = [
  curveTopupTemplate,
  ibPayoutsTemplate,
  nfatSetupFacilityTemplate,
  nfatEnableFacilityForPrimeTemplate,
  nfatSubscribeTemplate,
  integrationBoostOnboardingTemplate,
  agentSpellReviewTemplate,
  verifySolanaBridgeFrozenTemplate,
  enqueueSolanaFreezeTxTemplate,
];

async function ensureInitialTemplates(): Promise<void> {
  const c = await col<Template & DocWithStringId>(COLL.templates);
  const now = new Date().toISOString();
  for (const template of SEED_TEMPLATES) {
    const { key, ...rest } = template;
    await c.updateOne(
      { _id: key } as Filter<Template & DocWithStringId>,
      { $setOnInsert: { ...rest, updatedAt: now } },
      { upsert: true }
    );
  }
}

export const storageServiceMongo: IStorageService = {
  async getTemplate(key) {
    await ensureInitialTemplates();
    const c = await col<Template & { _id: string }>(COLL.templates);
    const doc = await c.findOne({ _id: key } as Filter<Template & { _id: string }>);
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { ...rest, key: _id } as Template;
  },
  async setTemplate(key, template) {
    const c = await col<Template & { _id: string }>(COLL.templates);
    const { key: _key, ...rest } = template;
    const doc = { ...rest, updatedAt: new Date().toISOString() };
    await c.updateOne({ _id: key } as Filter<Template & { _id: string }>, { $set: doc }, { upsert: true });
  },
  async listTemplates() {
    await ensureInitialTemplates();
    const c = await col<Template & { _id: string }>(COLL.templates);
    const docs = await c.find({}).toArray();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { ...rest, key: _id } as Template;
    });
  },
  async getProcessState(processId) {
    const c = await col<Process & { _id: string }>(COLL.processes);
    const doc = await c.findOne({ _id: processId } as Filter<Process & { _id: string }>);
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { ...rest, processId: _id } as Process;
  },
  async saveProcessState(state) {
    const c = await col<Process & { _id: string }>(COLL.processes);
    const { processId: _processId, ...rest } = state;
    const doc = { ...rest, updatedAt: new Date().toISOString() };
    await c.updateOne({ _id: state.processId } as Filter<Process & { _id: string }>, { $set: doc }, { upsert: true });
  },
  async listProcesses() {
    const c = await col<Process & { _id: string }>(COLL.processes);
    const docs = await c.find({}).toArray();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { ...rest, processId: _id } as Process;
    });
  },
  async deleteProcess(processId) {
    const c = await col<Process & { _id: string }>(COLL.processes);
    const r = await c.deleteOne({ _id: processId } as Filter<Process & { _id: string }>);
    return r.deletedCount > 0;
  },
};
