import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import type { Group, GroupMembership, User } from "@/entities/principal";

export const StorageServiceSymbol = Symbol.for("StorageService");

export interface IStorageService {
  getTemplate(key: string): Promise<Template | null>;
  setTemplate(key: string, template: Template): Promise<void>;
  listTemplates(): Promise<Template[]>;
  getUser(key: string): Promise<User | null>;
  setUser(key: string, user: User): Promise<void>;
  listUsers(): Promise<User[]>;
  getUserByEvmAddress(evmWalletAddress: string): Promise<User | null>;
  getGroup(key: string): Promise<Group | null>;
  setGroup(key: string, group: Group): Promise<void>;
  listGroups(): Promise<Group[]>;
  getGroupMembership(key: string): Promise<GroupMembership | null>;
  setGroupMembership(key: string, membership: GroupMembership): Promise<void>;
  listGroupMemberships(): Promise<GroupMembership[]>;
  deleteGroupMembership(key: string): Promise<void>;
  getProcessState(processId: string): Promise<Process | null>;
  saveProcessState(state: Process): Promise<void>;
  listProcesses(): Promise<Process[]>;
  getAuthChallenge(normalizedAddress: string): Promise<{ message: string; expiresAt: number } | null>;
  setAuthChallenge(normalizedAddress: string, challenge: { message: string; expiresAt: number }): Promise<void>;
  deleteAuthChallenge(normalizedAddress: string): Promise<void>;
}
