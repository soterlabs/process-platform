import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { isProcessFileId } from "@/entities/process/process-file-ref";
import type { IProcessFileStorage, SavedProcessFile } from "./interface";

function defaultRoot(): string {
  const fromEnv = process.env.PROCESS_FILES_ROOT?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), ".process-platform", "files");
}

export function createFsProcessFileStorage(rootDir: string = defaultRoot()): IProcessFileStorage {
  const root = rootDir;

  function processDir(processId: string): string {
    return join(root, processId);
  }

  function filePath(processId: string, fileId: string): string {
    return join(processDir(processId), fileId);
  }

  function metaPath(processId: string, fileId: string): string {
    return join(processDir(processId), `${fileId}.meta.json`);
  }

  return {
    async saveFile(processId, data, meta) {
      const id = randomUUID();
      const dir = processDir(processId);
      await mkdir(dir, { recursive: true });
      const dest = filePath(processId, id);
      const mimeType = meta.mimeType?.trim() || "application/octet-stream";
      await writeFile(dest, data);
      await writeFile(
        metaPath(processId, id),
        JSON.stringify({ originalName: meta.originalName, mimeType }, null, 0),
        "utf-8"
      );
      return {
        id,
        originalName: meta.originalName,
        mimeType,
        size: data.length,
      };
    },

    async readFile(processId, fileId) {
      if (!isProcessFileId(fileId)) return null;
      const fp = filePath(processId, fileId);
      try {
        const data = await readFile(fp);
        let mimeType = "application/octet-stream";
        let originalName = fileId;
        try {
          const rawMeta = await readFile(metaPath(processId, fileId), "utf-8");
          const m = JSON.parse(rawMeta) as { originalName?: string; mimeType?: string };
          if (typeof m.mimeType === "string" && m.mimeType) mimeType = m.mimeType;
          if (typeof m.originalName === "string") originalName = m.originalName;
        } catch {
          // legacy file without meta
        }
        return { data, mimeType, originalName };
      } catch {
        return null;
      }
    },

    async deleteFile(processId, fileId) {
      if (!isProcessFileId(fileId)) return false;
      const fp = filePath(processId, fileId);
      const mp = metaPath(processId, fileId);
      try {
        await rm(fp, { force: true });
        await rm(mp, { force: true });
        return true;
      } catch {
        return false;
      }
    },

    async deleteAllForProcess(processId) {
      const dir = processDir(processId);
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/**
 * Same as {@link createFsProcessFileStorage} default root: use `PROCESS_FILES_ROOT` on Railway
 * to point at your volume mount.
 */
export const fsProcessFileStorage: IProcessFileStorage = createFsProcessFileStorage();
