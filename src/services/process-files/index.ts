/**
 * Process-scoped file bytes: resolved via Inversify. Default is filesystem under
 * `PROCESS_FILES_ROOT` (set to your Railway volume mount path in production).
 */
import { Container } from "inversify";
import { fsProcessFileStorage } from "./fs-store";
import type { IProcessFileStorage } from "./interface";
import { ProcessFileStorageSymbol } from "./interface";

const container = new Container();
container.bind<IProcessFileStorage>(ProcessFileStorageSymbol).toConstantValue(fsProcessFileStorage);

export const processFileStorage: IProcessFileStorage = container.get<IProcessFileStorage>(
  ProcessFileStorageSymbol
);

export type { IProcessFileStorage, SavedProcessFile } from "./interface";
export { ProcessFileStorageSymbol } from "./interface";
