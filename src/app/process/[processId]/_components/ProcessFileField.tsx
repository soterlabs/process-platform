"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import type { ProcessFileRef } from "@/entities/process";
import { authFetch } from "@/lib/auth-client";

type Props = {
  kind: "file-single" | "file-multiple";
  title: string;
  htmlId: string;
  hideTitle?: boolean;
  processId: string;
  stepId: string;
  value: ProcessFileRef | ProcessFileRef[] | null;
  onChange: (next: ProcessFileRef | ProcessFileRef[] | null) => void;
  disabled?: boolean;
};

export async function downloadProcessFile(processId: string, fileId: string, filename: string) {
  const res = await authFetch(`/api/process/${encodeURIComponent(processId)}/files/${encodeURIComponent(fileId)}`);
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ProcessFileField({
  kind,
  title,
  htmlId,
  hideTitle = false,
  processId,
  stepId,
  value,
  onChange,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inactive = disabled || busy;

  const list: ProcessFileRef[] =
    kind === "file-multiple"
      ? Array.isArray(value)
        ? value
        : []
      : value && typeof value === "object" && !Array.isArray(value) && "kind" in value && value.kind === "process_file"
        ? [value as ProcessFileRef]
        : [];

  const upload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || disabled) return;
      setError(null);
      setBusy(true);
      try {
        const toUpload =
          kind === "file-single" ? [files[0]!] : Array.from(files);
        const nextRefs: ProcessFileRef[] = [...list];
        for (const file of toUpload) {
          const fd = new FormData();
          fd.set("file", file);
          const res = await authFetch(
            `/api/process/${encodeURIComponent(processId)}/files?stepId=${encodeURIComponent(stepId)}`,
            { method: "POST", body: fd }
          );
          const data = (await res.json().catch(() => ({}))) as { file?: ProcessFileRef; error?: string };
          if (!res.ok) {
            setError(data.error ?? "Upload failed");
            return;
          }
          if (!data.file) {
            setError("Invalid response");
            return;
          }
          if (kind === "file-single") {
            onChange(data.file);
            return;
          }
          nextRefs.push(data.file);
        }
        if (kind === "file-multiple") {
          onChange(nextRefs);
        }
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, kind, list, onChange, processId, stepId]
  );

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (inactive) return;
      dragDepthRef.current += 1;
      setDragOver(true);
    },
    [inactive]
  );

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragOver(false);
    }
  }, []);

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (inactive) return;
      e.dataTransfer.dropEffect = "copy";
    },
    [inactive]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = 0;
      setDragOver(false);
      if (inactive) return;
      void upload(e.dataTransfer.files);
    },
    [inactive, upload]
  );

  const removeAt = async (index: number) => {
    const ref = list[index];
    if (!ref) return;
    setError(null);
    setBusy(true);
    try {
      const res = await authFetch(
        `/api/process/${encodeURIComponent(processId)}/files/${encodeURIComponent(ref.id)}?stepId=${encodeURIComponent(stepId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Remove failed");
        return;
      }
      if (kind === "file-single") {
        onChange(null);
      } else {
        onChange(list.filter((_, i) => i !== index));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={hideTitle ? "" : ""}>
      {!hideTitle && (
        <label htmlFor={htmlId} className="block text-sm font-medium text-surface-700">
          {title}
        </label>
      )}
      <div className={hideTitle ? "mt-0" : "mt-2"}>
        <input
          ref={inputRef}
          id={htmlId}
          type="file"
          disabled={inactive}
          multiple={kind === "file-multiple"}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void upload(e.target.files)}
        />
        <div
          role="group"
          aria-labelledby={hideTitle ? undefined : htmlId}
          aria-label={hideTitle ? title : undefined}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            inactive
              ? "cursor-not-allowed border-surface-200 bg-surface-50 opacity-60"
              : dragOver
                ? "border-primary-400 bg-primary-50/80"
                : "border-surface-300 bg-white hover:border-primary-300 hover:bg-surface-50/80"
          }`}
        >
          <p className="text-sm text-surface-600">
            {busy
              ? "Uploading…"
              : kind === "file-multiple"
                ? "Drag files here"
                : list.length > 0
                  ? "Drag a file here to replace"
                  : "Drag a file here"}
          </p>
          <p className="mt-1 text-xs text-surface-500">or</p>
          <button
            type="button"
            disabled={inactive}
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {kind === "file-multiple" ? "Browse files" : "Browse file"}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {list.length > 0 && (
        <ul className="mt-3 space-y-2">
          {list.map((f, i) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-surface-800" title={f.name}>
                {f.name}
              </span>
              <span className="shrink-0 text-xs text-surface-500">
                {(f.size / 1024).toFixed(f.size < 10240 ? 1 : 0)} KB
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={disabled || busy}
                  className="rounded-md border border-surface-300 bg-white px-2 py-1 text-xs font-medium text-surface-800 hover:bg-surface-50 disabled:opacity-50"
                  onClick={() => void downloadProcessFile(processId, f.id, f.name)}
                >
                  Download
                </button>
                <button
                  type="button"
                  disabled={disabled || busy}
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                  onClick={() => void removeAt(i)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
