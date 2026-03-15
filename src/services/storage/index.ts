/**
 * Storage: resolved via Inversify. Uses MongoDB when MONGO_URL is set,
 * otherwise file-based (local). All consumers import storageService from here.
 */
import { Container } from "inversify";
import type { IStorageService } from "./interface";
import { StorageServiceSymbol } from "./interface";
import { fileStorageService } from "./local";
import { storageServiceMongo } from "./mongo";

export type { IStorageService };
/** @deprecated Use IStorageService */
export type StorageService = IStorageService;

const container = new Container();
console.log("[storage] MONGO_URL (startup):", process.env.MONGO_URL);
if (process.env.MONGO_URL) {
  container.bind<IStorageService>(StorageServiceSymbol).toConstantValue(storageServiceMongo);
} else {
  container.bind<IStorageService>(StorageServiceSymbol).toConstantValue(fileStorageService);
}

export const storageService: IStorageService = container.get<IStorageService>(StorageServiceSymbol);
