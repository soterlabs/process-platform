/**
 * Storage service: file-based (local/dev). All API handlers read/write the same
 * JSON files so state is shared across workers/processes.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import type { Group, GroupMembership, User } from "@/entities/principal";
import { curveTopupTemplate } from "@/templates/curve-topup";
import type { IStorageService } from "./interface";
import {
  initialGroups,
  initialGroupMemberships,
  initialUsers,
} from "./initial-data";

const STORE_DIR = join(process.cwd(), ".process-platform");
const TEMPLATES_FILE = join(STORE_DIR, "templates.json");
const USERS_FILE = join(STORE_DIR, "users.json");
const GROUPS_FILE = join(STORE_DIR, "groups.json");
const GROUP_MEMBERSHIPS_FILE = join(STORE_DIR, "group-memberships.json");
const PROCESS_STATES_FILE = join(STORE_DIR, "process-states.json");
const AUTH_CHALLENGES_FILE = join(STORE_DIR, "auth-challenges.json");

async function ensureStoreDir(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
}

async function readTemplates(): Promise<Record<string, Template>> {
  try {
    const raw = await readFile(TEMPLATES_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, Template>;
  } catch {
    return {
      [curveTopupTemplate.key]: {
        ...curveTopupTemplate,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}

async function writeTemplates(templates: Record<string, Template>): Promise<void> {
  await ensureStoreDir();
  await writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
}

async function readUsers(): Promise<Record<string, User>> {
  try {
    const raw = await readFile(USERS_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, User>;
  } catch {
    return { ...initialUsers };
  }
}

async function writeUsers(users: Record<string, User>): Promise<void> {
  await ensureStoreDir();
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

async function readGroups(): Promise<Record<string, Group>> {
  try {
    const raw = await readFile(GROUPS_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, Group>;
  } catch {
    return { ...initialGroups };
  }
}

async function writeGroups(groups: Record<string, Group>): Promise<void> {
  await ensureStoreDir();
  await writeFile(GROUPS_FILE, JSON.stringify(groups, null, 2), "utf-8");
}

async function readGroupMemberships(): Promise<Record<string, GroupMembership>> {
  try {
    const raw = await readFile(GROUP_MEMBERSHIPS_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, GroupMembership>;
  } catch {
    return { ...initialGroupMemberships };
  }
}

async function writeGroupMemberships(
  memberships: Record<string, GroupMembership>
): Promise<void> {
  await ensureStoreDir();
  await writeFile(
    GROUP_MEMBERSHIPS_FILE,
    JSON.stringify(memberships, null, 2),
    "utf-8"
  );
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

type AuthChallenge = { message: string; expiresAt: number };

async function readAuthChallenges(): Promise<Record<string, AuthChallenge>> {
  try {
    const raw = await readFile(AUTH_CHALLENGES_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, AuthChallenge>;
  } catch {
    return {};
  }
}

async function writeAuthChallenges(challenges: Record<string, AuthChallenge>): Promise<void> {
  await ensureStoreDir();
  await writeFile(AUTH_CHALLENGES_FILE, JSON.stringify(challenges, null, 2), "utf-8");
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
  async getUser(key) {
    const users = await readUsers();
    return users[key] ?? null;
  },
  async setUser(key, user) {
    const users = await readUsers();
    users[key] = user;
    await writeUsers(users);
  },
  async listUsers() {
    const users = await readUsers();
    return Object.values(users);
  },
  async getUserByEvmAddress(evmWalletAddress) {
    const normalized = evmWalletAddress?.toLowerCase?.() ?? "";
    if (!normalized.startsWith("0x") || normalized.length < 10) return null;
    const users = await readUsers();
    return (
      Object.values(users).find(
        (u) => (u.evmWalletAddress ?? "").toLowerCase() === normalized
      ) ?? null
    );
  },
  async getUserByEmail(email) {
    if (!email?.trim()) return null;
    const normalized = email.trim().toLowerCase();
    const users = await readUsers();
    return (
      Object.values(users).find(
        (u) => (u.email ?? "").toLowerCase() === normalized
      ) ?? null
    );
  },
  async getGroup(key) {
    const groups = await readGroups();
    return groups[key] ?? null;
  },
  async setGroup(key, group) {
    const groups = await readGroups();
    groups[key] = group;
    await writeGroups(groups);
  },
  async listGroups() {
    const groups = await readGroups();
    return Object.values(groups);
  },
  async getGroupMembership(key) {
    const memberships = await readGroupMemberships();
    return memberships[key] ?? null;
  },
  async setGroupMembership(key, membership) {
    const memberships = await readGroupMemberships();
    memberships[key] = membership;
    await writeGroupMemberships(memberships);
  },
  async listGroupMemberships() {
    const memberships = await readGroupMemberships();
    return Object.values(memberships);
  },
  async deleteGroupMembership(key) {
    const memberships = await readGroupMemberships();
    delete memberships[key];
    await writeGroupMemberships(memberships);
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
  async getAuthChallenge(normalizedAddress) {
    const challenges = await readAuthChallenges();
    return challenges[normalizedAddress] ?? null;
  },
  async setAuthChallenge(normalizedAddress, challenge) {
    const challenges = await readAuthChallenges();
    challenges[normalizedAddress] = challenge;
    await writeAuthChallenges(challenges);
  },
  async deleteAuthChallenge(normalizedAddress) {
    const challenges = await readAuthChallenges();
    delete challenges[normalizedAddress];
    await writeAuthChallenges(challenges);
  },
};
