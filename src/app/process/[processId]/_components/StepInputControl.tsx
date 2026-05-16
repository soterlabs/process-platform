"use client";

import type { ProcessFileRef } from "@/entities/process";
import { isProcessFileRef } from "@/entities/process";
import type { TemplateStepInput } from "@/entities/template";
import { numberContextToFormString } from "@/lib/input-step-payload";
import { sanitizeNumericFormInput } from "@/lib/numeric-field";
import { DateTimePicker } from "./DateTimePicker";
import { ProcessFileField } from "./ProcessFileField";

type Props = {
  inp: TemplateStepInput;
  formKey: string;
  htmlId: string;
  formValues: Record<string, boolean | string>;
  onValuesChange: (next: Record<string, boolean | string>) => void;
  /** Omit visible field title (e.g. item-list rows where the title is shown once above the list). */
  hideTitle?: boolean;
  fileValues?: Record<string, ProcessFileRef | ProcessFileRef[] | null>;
  onFileValuesChange?: (fieldKey: string, next: ProcessFileRef | ProcessFileRef[] | null) => void;
  processId?: string;
  currentStepId?: string;
};

export function StepInputControl({
  inp,
  formKey,
  htmlId,
  formValues,
  onValuesChange,
  hideTitle = false,
  fileValues,
  onFileValuesChange,
  processId,
  currentStepId,
}: Props) {
  if (inp.type === "item_list") {
    return null;
  }
  if (inp.type === "file-single" || inp.type === "file-multiple") {
    if (!processId || !currentStepId || !onFileValuesChange) {
      return (
        <p className="text-sm text-red-600">
          File fields require process and step context (configuration error).
        </p>
      );
    }
    const raw = fileValues?.[formKey];
    const singleValue =
      inp.type === "file-single"
        ? isProcessFileRef(raw)
          ? raw
          : null
        : null;
    const multiValue = inp.type === "file-multiple" ? (Array.isArray(raw) ? raw : []) : [];
    return (
      <ProcessFileField
        kind={inp.type}
        title={inp.title}
        htmlId={htmlId}
        hideTitle={hideTitle}
        processId={processId}
        stepId={currentStepId}
        value={inp.type === "file-single" ? singleValue : multiValue}
        onChange={(next) => onFileValuesChange(formKey, next)}
      />
    );
  }
  if (inp.type === "bool") {
    return (
      <label
        className={`flex cursor-pointer items-center ${hideTitle ? "justify-end" : "justify-between gap-4"}`}
        aria-label={hideTitle ? inp.title : undefined}
      >
        {!hideTitle && (
          <span className="text-sm font-medium leading-snug text-surface-800">{inp.title}</span>
        )}
        <input
          type="checkbox"
          checked={Boolean(formValues[formKey])}
          onChange={(e) => {
            onValuesChange({ ...formValues, [formKey]: e.target.checked });
          }}
          className="sr-only"
        />
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
            formValues[formKey]
              ? "border-primary-500 bg-primary-500"
              : "border-surface-300 bg-surface-200"
          }`}
          aria-hidden
        >
          <span
            className={`pointer-events-none absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              formValues[formKey] ? "translate-x-[1.375rem]" : "translate-x-0.5"
            }`}
          />
        </span>
      </label>
    );
  }

  if (inp.type === "dropdown") {
    return (
      <>
        {!hideTitle && (
          <label htmlFor={htmlId} className="block text-sm font-medium text-surface-700">
            {inp.title}
          </label>
        )}
        <select
          id={htmlId}
          value={String(formValues[formKey] ?? "")}
          onChange={(e) => {
            onValuesChange({ ...formValues, [formKey]: e.target.value });
          }}
          aria-label={hideTitle ? inp.title : undefined}
          className={`${hideTitle ? "mt-0" : "mt-2"} w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100`}
        >
          <option value="">Select…</option>
          {(inp.values ?? []).map((val) => (
            <option key={val} value={val}>
              {val}
            </option>
          ))}
        </select>
      </>
    );
  }

  if (inp.type === "number" || inp.type === "decimal_string") {
    return (
      <>
        {!hideTitle && (
          <label htmlFor={htmlId} className="block text-sm font-medium text-surface-700">
            {inp.title}
          </label>
        )}
        <input
          id={htmlId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          pattern="[-0-9.]*"
          value={String(formValues[formKey] ?? "")}
          onChange={(e) => {
            const v = sanitizeNumericFormInput(e.target.value);
            onValuesChange({ ...formValues, [formKey]: v });
          }}
          aria-label={hideTitle ? inp.title : undefined}
          className={`${hideTitle ? "mt-0" : "mt-2"} w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100`}
        />
      </>
    );
  }

  if (inp.type === "string-multiline") {
    return (
      <>
        {!hideTitle && (
          <label htmlFor={htmlId} className="block text-sm font-medium text-surface-700">
            {inp.title}
          </label>
        )}
        <textarea
          id={htmlId}
          rows={4}
          value={String(formValues[formKey] ?? "")}
          onChange={(e) => {
            onValuesChange({ ...formValues, [formKey]: e.target.value });
          }}
          aria-label={hideTitle ? inp.title : undefined}
          className={`${hideTitle ? "mt-0" : "mt-2"} w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100`}
        />
      </>
    );
  }

  if (inp.type === "datetime") {
    if (hideTitle) {
      return (
        <div role="group" aria-label={inp.title} className="mt-0">
          <DateTimePicker
            id={htmlId}
            value={String(formValues[formKey] ?? "")}
            onChange={(v) => {
              onValuesChange({ ...formValues, [formKey]: v });
            }}
            className=""
          />
        </div>
      );
    }
    return (
      <>
        <label htmlFor={htmlId} className="block text-sm font-medium text-surface-700">
          {inp.title}
        </label>
        <DateTimePicker
          id={htmlId}
          value={String(formValues[formKey] ?? "")}
          onChange={(v) => {
            onValuesChange({ ...formValues, [formKey]: v });
          }}
          className="mt-2"
        />
      </>
    );
  }

  return (
    <>
      {!hideTitle && (
        <label htmlFor={htmlId} className="block text-sm font-medium text-surface-700">
          {inp.title}
        </label>
      )}
      <input
        id={htmlId}
        type="text"
        value={String(formValues[formKey] ?? "")}
        onChange={(e) => {
          onValuesChange({ ...formValues, [formKey]: e.target.value });
        }}
        aria-label={hideTitle ? inp.title : undefined}
        className={`${hideTitle ? "mt-0" : "mt-2"} w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100`}
      />
    </>
  );
}

export function seedFormValueToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "boolean") return v ? "yes" : "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "string") return v;
  return "";
}

export function expansionFieldInitialFormValue(inp: TemplateStepInput, raw: unknown): boolean | string {
  if (inp.type === "file-single" || inp.type === "file-multiple") return "";
  if (inp.type === "bool") return Boolean(raw);
  if (inp.type === "number") return numberContextToFormString(raw);
  if (inp.type === "decimal_string") return typeof raw === "string" ? raw : "";
  return seedFormValueToString(raw);
}
