/**
 * Storage service: file-based (dev). All API handlers read/write the same
 * JSON files so state is shared across workers/processes. Replace with your
 * DB-backed implementation for production.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import type { Group, GroupMembership, User } from "@/entities/principal";
import { groupMembershipKey } from "@/entities/principal";
import { exampleTemplate } from "@/templates/example-template";

const initialGroups: Record<string, Group> = {
  prime: { id: "prime", type: "group", roles: ["Prime"] },
  oea: { id: "oea", type: "group", roles: ["OEA"] },
};

const initialUsers: Record<string, User> = {
  "prime-user": {
    id: "prime-user",
    type: "user",
    evmWalletAddress: "0xF402Db07E1caB5aE2c0f9DE4134c4941a3Aa7507",
  },
  "oea-user": {
    id: "oea-user",
    type: "user",
    evmWalletAddress: "0x278f04483d4d1bc39A0A27b78C577D0D670033Be",
  },
};

const initialGroupMemberships: Record<string, GroupMembership> = (() => {
  const addedAt = new Date().toISOString();
  return {
    [groupMembershipKey("prime", "prime-user")]: {
      groupId: "prime",
      userId: "prime-user",
      addedAt,
      addedById: "prime-user",
    },
    [groupMembershipKey("oea", "oea-user")]: {
      groupId: "oea",
      userId: "oea-user",
      addedAt,
      addedById: "oea-user",
    },
  };
})();

export type StorageService = {
  getTemplate(key: string): Promise<Template | null>;
  setTemplate(key: string, template: Template): Promise<void>;
  listTemplates(): Promise<Template[]>;
  getUser(key: string): Promise<User | null>;
  setUser(key: string, user: User): Promise<void>;
  listUsers(): Promise<User[]>;
  getUserByEvmAddress(evmWalletAddress: string): Promise<User | null>;
  getGroup(key: string): Promise<Group | null>;
  setGroup(key: string, group: Group): Promise<void>;
  getGroupMembership(key: string): Promise<GroupMembership | null>;
  setGroupMembership(key: string, membership: GroupMembership): Promise<void>;
  listGroupMemberships(): Promise<GroupMembership[]>;
  getProcessState(processId: string): Promise<Process | null>;
  saveProcessState(state: Process): Promise<void>;
  listProcesses(): Promise<Process[]>;
  getAuthChallenge(normalizedAddress: string): Promise<{ message: string; expiresAt: number } | null>;
  setAuthChallenge(normalizedAddress: string, challenge: { message: string; expiresAt: number }): Promise<void>;
  deleteAuthChallenge(normalizedAddress: string): Promise<void>;
};

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
      [exampleTemplate.key]: {
        ...exampleTemplate,
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

export const storageService: StorageService = {
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
  async getGroup(key) {
    const groups = await readGroups();
    return groups[key] ?? null;
  },
  async setGroup(key, group) {
    const groups = await readGroups();
    groups[key] = group;
    await writeGroups(groups);
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
