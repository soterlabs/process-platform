export const ProcessFileStorageSymbol = Symbol.for("ProcessFileStorage");

export type SavedProcessFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export interface IProcessFileStorage {
  /**
   * Persists bytes under a directory scoped to the process instance (e.g. volume mount
   * `{root}/{processId}/{id}`).
   */
  saveFile(
    processId: string,
    data: Buffer,
    meta: { originalName: string; mimeType: string }
  ): Promise<SavedProcessFile>;

  readFile(
    processId: string,
    fileId: string
  ): Promise<{ data: Buffer; mimeType: string; originalName: string } | null>;

  deleteFile(processId: string, fileId: string): Promise<boolean>;

  /** Removes all stored bytes for a process (e.g. after hard-delete of the instance). */
  deleteAllForProcess(processId: string): Promise<void>;
}
