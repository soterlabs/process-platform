"use client";

import type { ProcessFileRef } from "@/entities/process";
import { downloadProcessFile } from "./ProcessFileField";

type Props = {
  processId: string;
  refs: ProcessFileRef[];
  emptyMessage?: string;
};

export function ReadOnlyProcessFileList({
  processId,
  refs,
  emptyMessage = "No file uploaded.",
}: Props) {
  if (refs.length === 0) {
    return <p className="mt-2 text-sm text-surface-500">{emptyMessage}</p>;
  }
  return (
    <ul className="mt-2 space-y-2">
      {refs.map((f) => (
        <li key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            className="text-primary-600 hover:underline"
            onClick={() => void downloadProcessFile(processId, f.id, f.name)}
          >
            {f.name}
          </button>
          <span className="text-xs text-surface-500">
            ({(f.size / 1024).toFixed(f.size < 10240 ? 1 : 0)} KB)
          </span>
        </li>
      ))}
    </ul>
  );
}
