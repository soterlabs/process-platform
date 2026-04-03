import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";

export const StorageServiceSymbol = Symbol.for("StorageService");

export interface IStorageService {
  getTemplate(key: string): Promise<Template | null>;
  setTemplate(key: string, template: Template): Promise<void>;
  listTemplates(): Promise<Template[]>;
  getProcessState(processId: string): Promise<Process | null>;
  saveProcessState(state: Process): Promise<void>;
  listProcesses(): Promise<Process[]>;
}
