/**
 * Storage service: MongoDB-backed. Same API for use in production (e.g. Railway).
 * Uses MONGO_URL for connection.
 */
import { MongoClient, type Db, type Collection, type Filter } from "mongodb";
import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import type { Group, GroupMembership, User } from "@/entities/principal";
import { curveTopupTemplate } from "@/templates/curve-topup";
import { ibPayoutsTemplate } from "@/templates/ib-payouts";
import type { IStorageService } from "./interface";
import {
  initialGroups,
  initialGroupMemberships,
  initialUsers,
} from "./initial-data";

const MONGO_URL = process.env.MONGO_URL ?? "";
const DB_NAME = "process-platform";

const COLL = {
  templates: "templates",
  users: "users",
  groups: "groups",
  groupMemberships: "groupMemberships",
  processes: "processes",
  authChallenges: "authChallenges",
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

const SEED_TEMPLATES: Template[] = [curveTopupTemplate, ibPayoutsTemplate];

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

async function ensureInitialUsers(): Promise<void> {
  const c = await col<DocWithStringId>(COLL.users);
  const existing = await c.findOne({});
  if (existing) return;
  await c.insertMany(
    Object.entries(initialUsers).map(([id, user]) => {
      const { id: _idField, ...rest } = user;
      return { _id: id, ...rest } as DocWithStringId;
    })
  );
}

async function ensureInitialGroups(): Promise<void> {
  const c = await col<DocWithStringId>(COLL.groups);
  const existing = await c.findOne({});
  if (existing) return;
  await c.insertMany(
    Object.entries(initialGroups).map(([id, group]) => {
      const { id: _idField, ...rest } = group;
      return { _id: id, ...rest } as DocWithStringId;
    })
  );
}

async function ensureInitialGroupMemberships(): Promise<void> {
  const c = await col<DocWithStringId>(COLL.groupMemberships);
  const existing = await c.findOne({});
  if (existing) return;
  await c.insertMany(
    Object.entries(initialGroupMemberships).map(([key, m]) => ({ _id: key, ...m } as DocWithStringId))
  );
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
  async getUser(key) {
    await ensureInitialUsers();
    const c = await col<User & { _id: string }>(COLL.users);
    const doc = await c.findOne({ _id: key } as Filter<User & { _id: string }>);
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id } as User;
  },
  async setUser(key, user) {
    const c = await col<User & { _id: string }>(COLL.users);
    const { id: _idField, ...rest } = user;
    await c.updateOne({ _id: key } as Filter<User & { _id: string }>, { $set: rest }, { upsert: true });
  },
  async listUsers() {
    await ensureInitialUsers();
    const c = await col<User & { _id: string }>(COLL.users);
    const docs = await c.find({}).toArray();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { ...rest, id: _id } as User;
    });
  },
  async getUserByEvmAddress(evmWalletAddress) {
    const normalized = evmWalletAddress?.toLowerCase?.() ?? "";
    if (!normalized.startsWith("0x") || normalized.length < 10) return null;
    await ensureInitialUsers();
    const c = await col<User & { _id: string }>(COLL.users);
    const doc = await c.findOne({ evmWalletAddress: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id } as User;
  },
  async getUserByEmail(email) {
    if (!email?.trim()) return null;
    const normalized = email.trim().toLowerCase();
    await ensureInitialUsers();
    const c = await col<User & { _id: string }>(COLL.users);
    const doc = await c.findOne({
      email: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id } as User;
  },
  async getGroup(key) {
    await ensureInitialGroups();
    const c = await col<Group & { _id: string }>(COLL.groups);
    const doc = await c.findOne({ _id: key } as Filter<Group & { _id: string }>);
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { ...rest, id: _id } as Group;
  },
  async setGroup(key, group) {
    const c = await col<Group & { _id: string }>(COLL.groups);
    const { id: _idField, ...rest } = group;
    await c.updateOne({ _id: key } as Filter<Group & { _id: string }>, { $set: rest }, { upsert: true });
  },
  async listGroups() {
    await ensureInitialGroups();
    const c = await col<Group & { _id: string }>(COLL.groups);
    const docs = await c.find({}).toArray();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return { ...rest, id: _id } as Group;
    });
  },
  async getGroupMembership(key) {
    await ensureInitialGroupMemberships();
    const c = await col<GroupMembership & { _id: string }>(COLL.groupMemberships);
    const doc = await c.findOne({ _id: key } as Filter<GroupMembership & { _id: string }>);
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return rest as GroupMembership;
  },
  async setGroupMembership(key, membership) {
    const c = await col<GroupMembership & { _id: string }>(COLL.groupMemberships);
    await c.updateOne({ _id: key } as Filter<GroupMembership & { _id: string }>, { $set: { ...membership } }, { upsert: true });
  },
  async listGroupMemberships() {
    await ensureInitialGroupMemberships();
    const c = await col<GroupMembership & { _id: string }>(COLL.groupMemberships);
    const docs = await c.find({}).toArray();
    return docs.map((d) => {
      const { _id, ...rest } = d;
      return rest as GroupMembership;
    });
  },
  async deleteGroupMembership(key) {
    const c = await col<GroupMembership & { _id: string }>(COLL.groupMemberships);
    await c.deleteOne({ _id: key } as Filter<GroupMembership & { _id: string }>);
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
  async getAuthChallenge(normalizedAddress) {
    const c = await col<{ message: string; expiresAt: number } & { _id: string }>(COLL.authChallenges);
    const doc = await c.findOne({ _id: normalizedAddress } as Filter<{ message: string; expiresAt: number } & { _id: string }>);
    if (!doc) return null;
    return { message: doc.message, expiresAt: doc.expiresAt };
  },
  async setAuthChallenge(normalizedAddress, challenge) {
    const c = await col<{ message: string; expiresAt: number } & { _id: string }>(COLL.authChallenges);
    await c.updateOne(
      { _id: normalizedAddress } as Filter<{ _id: string }>,
      { $set: { ...challenge } },
      { upsert: true }
    );
  },
  async deleteAuthChallenge(normalizedAddress) {
    const c = await col<{ _id: string }>(COLL.authChallenges);
    await c.deleteOne({ _id: normalizedAddress } as Filter<{ _id: string }>);
  },
};
