"use client";

import type { TemplateStepInput } from "@/entities/template";
import {
  formKeyForItemListCell,
  ITEM_LIST_PRIMARY_ROW_KEY,
  itemListRenderRowCount,
  itemListRowIsEmpty,
  removeItemListRow,
  reorderItemListRows,
  type ItemListPath,
} from "@/lib/input-step-payload";
import { evaluate, type EvaluateExpressionOptions } from "@/services/expression-service";
import { expansionFieldInitialFormValue, StepInputControl } from "./StepInputControl";

export type ItemListExpressionOptions = Pick<
  EvaluateExpressionOptions,
  "processId" | "templateKey" | "processStatus" | "processStartedAt" | "processUpdatedAt"
>;

type ProcessLike = {
  context: Record<string, unknown>;
} | null;

/** Merge saved `context[stepKey][listKey]` rows into flat `formValues` (supports nested lists). */
export function hydrateItemListFormState(
  listInput: TemplateStepInput & { type: "item_list" },
  listPath: ItemListPath,
  rows: unknown[],
  next: Record<string, boolean | string>,
  resolveTemplate: (data: string) => string
): void {
  const n = Math.max(rows.length, 1);
  for (let rowIndex = 0; rowIndex < n; rowIndex++) {
    const rowObj =
      rows[rowIndex] && typeof rows[rowIndex] === "object" && !Array.isArray(rows[rowIndex])
        ? (rows[rowIndex] as Record<string, unknown>)
        : undefined;
    const vfk = formKeyForItemListCell(listPath, rowIndex, ITEM_LIST_PRIMARY_ROW_KEY);
    if (!(vfk in next)) {
      const legacy =
        rowObj?.[ITEM_LIST_PRIMARY_ROW_KEY] ?? rowObj?.commit_url ?? rowObj?.commitUrl;
      if (legacy !== undefined && legacy !== null) {
        next[vfk] = expansionFieldInitialFormValue(
          { key: ITEM_LIST_PRIMARY_ROW_KEY, type: "string", title: "" },
          legacy
        );
      } else {
        next[vfk] = "";
      }
    }
    for (const sub of listInput.subInputs ?? []) {
      if (sub.readOnly) continue;
      if (sub.type === "item_list") {
        const nested = sub as TemplateStepInput & { type: "item_list" };
        const rawChild = rowObj?.[sub.key];
        const childRows = Array.isArray(rawChild) ? rawChild : [];
        hydrateItemListFormState(nested, [...listPath, rowIndex, sub.key], childRows, next, resolveTemplate);
        continue;
      }
      if (sub.key === ITEM_LIST_PRIMARY_ROW_KEY) continue;
      const fk = formKeyForItemListCell(listPath, rowIndex, sub.key);
      if (fk in next) continue;
      const raw = rowObj?.[sub.key];
      if (raw !== undefined && raw !== null) {
        next[fk] = expansionFieldInitialFormValue(sub, raw);
        continue;
      }
      if (sub.defaultValue != null && sub.defaultValue !== "") {
        const resolved = resolveTemplate(sub.defaultValue);
        if (sub.type === "bool") {
          next[fk] = /^(yes|true|1)$/i.test(resolved.trim());
        } else {
          next[fk] = resolved;
        }
        continue;
      }
      next[fk] = sub.type === "bool" ? false : "";
    }
  }
}

function safeHttpOrHttpsUrl(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    return null;
  }
  return null;
}

type Props = {
  listInput: TemplateStepInput & { type: "item_list" };
  listPath: ItemListPath;
  /** Nesting depth for styling (0 = top-level step field). */
  depth?: number;
  formValues: Record<string, boolean | string>;
  onFormValuesChange: (next: Record<string, boolean | string>) => void;
  evaluationContext: Record<string, unknown>;
  userPermissions: string[];
  expressionProcessOptions: ItemListExpressionOptions;
  process: ProcessLike;
  shouldShowViewControl: (data: string, context: Record<string, unknown>) => boolean;
  resolveContextTemplate: (
    data: string,
    context: Record<string, unknown>,
    userPermissions: string[],
    processOpts?: ItemListExpressionOptions
  ) => string;
};

export function ItemListEditor({
  listInput,
  listPath,
  depth = 0,
  formValues,
  onFormValuesChange,
  evaluationContext,
  userPermissions,
  expressionProcessOptions,
  process,
  shouldShowViewControl,
  resolveContextTemplate,
}: Props) {
  const subInputs = listInput.subInputs ?? [];
  const rowCount = itemListRenderRowCount(listInput, listPath, formValues);

  const visibleSubs = subInputs.filter(
    (sub) =>
      (!sub.visibleExpression ||
        Boolean(
          process &&
            evaluate(evaluationContext, sub.visibleExpression, {
              userPermissions,
              ...expressionProcessOptions,
            })
        )) &&
      (sub.readOnly
        ? process
          ? shouldShowViewControl(sub.defaultValue ?? "", evaluationContext)
          : true
        : true)
  );

  const visibleOtherSubs = visibleSubs.filter((s) => s.key !== ITEM_LIST_PRIMARY_ROW_KEY);

  const lineControlInp: TemplateStepInput = {
    key: ITEM_LIST_PRIMARY_ROW_KEY,
    type: "string",
    title: listInput.title,
  };

  const pathId = listPath.map(String).join("-");

  const renderSubControl = (
    sub: TemplateStepInput,
    rowIndex: number,
    opts?: { hideTitle?: boolean }
  ) =>
    sub.readOnly ? (
      <div
        key={`${pathId}-${rowIndex}-${sub.key}-ro`}
        className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-3"
      >
        <div className="text-sm font-medium text-surface-600">{sub.title}</div>
        <div
          className={
            sub.type === "string-multiline" || sub.type === "decimal_string"
              ? "mt-2 whitespace-pre-wrap break-all font-mono text-sm leading-relaxed text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
              : "mt-2 text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
          }
          aria-readonly
          dangerouslySetInnerHTML={{
            __html: process
              ? resolveContextTemplate(
                  sub.defaultValue ?? "",
                  evaluationContext,
                  userPermissions,
                  expressionProcessOptions
                )
              : sub.defaultValue ?? "",
          }}
        />
      </div>
    ) : sub.type === "item_list" ? (
      <div key={`${pathId}-${rowIndex}-${sub.key}-nested`} className="min-w-0 pt-1">
        <ItemListEditor
          listInput={sub as TemplateStepInput & { type: "item_list" }}
          listPath={[...listPath, rowIndex, sub.key]}
          depth={depth + 1}
          formValues={formValues}
          onFormValuesChange={onFormValuesChange}
          evaluationContext={evaluationContext}
          userPermissions={userPermissions}
          expressionProcessOptions={expressionProcessOptions}
          process={process}
          shouldShowViewControl={shouldShowViewControl}
          resolveContextTemplate={resolveContextTemplate}
        />
      </div>
    ) : (
      <div key={`${pathId}-${rowIndex}-${sub.key}`} className="min-w-0">
        <StepInputControl
          inp={sub}
          formKey={formKeyForItemListCell(listPath, rowIndex, sub.key)}
          htmlId={`il-${pathId}-${rowIndex}-${sub.key}`}
          formValues={formValues}
          hideTitle={Boolean(opts?.hideTitle)}
          onValuesChange={onFormValuesChange}
        />
      </div>
    );

  const onRemoveRow = (rowIndex: number) => {
    onFormValuesChange(removeItemListRow(listInput, listPath, rowIndex, formValues));
  };

  const onReorderRow = (fromIndex: number, toIndex: number) => {
    onFormValuesChange(
      reorderItemListRows(listInput, listPath, fromIndex, toIndex, formValues)
    );
  };

  const otherSubVisibleRowIndices =
    visibleOtherSubs.length > 0
      ? Array.from({ length: rowCount }, (_, rowIndex) => rowIndex).filter(
          (rowIndex) =>
            !(
              rowIndex === rowCount - 1 &&
              itemListRowIsEmpty(listInput, listPath, rowIndex, formValues)
            )
        )
      : [];

  const lineRows = (
    <div className="space-y-2">
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <div
          key={`il-line-${pathId}-${rowIndex}`}
          className="flex items-center gap-2 rounded-lg border border-surface-100 bg-surface-50/60 px-2 py-2"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
            if (!Number.isInteger(from)) return;
            onReorderRow(from, rowIndex);
          }}
        >
          <button
            type="button"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", String(rowIndex));
              e.dataTransfer.effectAllowed = "move";
            }}
            className="flex h-9 w-7 shrink-0 cursor-grab flex-col items-center justify-center rounded border border-transparent text-surface-400 hover:border-surface-200 hover:bg-white active:cursor-grabbing"
            aria-label="Drag to reorder row"
          >
            <span className="text-[10px] leading-none" aria-hidden>
              ⋮⋮
            </span>
          </button>
          <span className="w-6 shrink-0 text-right text-[11px] font-medium text-surface-400">
            {rowIndex + 1}
          </span>
          <div className="min-w-0 flex-1">
            {renderSubControl(lineControlInp, rowIndex, { hideTitle: true })}
          </div>
          {!itemListRowIsEmpty(listInput, listPath, rowIndex, formValues) && (
            <button
              type="button"
              onClick={() => onRemoveRow(rowIndex)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-xl leading-none text-surface-400 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              aria-label="Remove row"
            >
              <span aria-hidden>×</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const isNested = depth > 0;

  return (
    <section
      className={
        isNested
          ? "rounded-lg border border-surface-200 bg-surface-50/80 px-3 py-3"
          : "rounded-xl border border-primary-200 bg-primary-50/50 px-4 py-4"
      }
      aria-labelledby={isNested ? undefined : `il-head-${pathId}`}
    >
      {isNested ? (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-600">
          {listInput.title}
        </h3>
      ) : (
        <h2 id={`il-head-${pathId}`} className="text-sm font-medium text-primary-950">
          {listInput.title}
        </h2>
      )}

      <div
        className={
          isNested ? "mt-2 rounded-md border border-surface-200 bg-white px-2 py-3" : "mt-4 rounded-lg border border-surface-200 bg-white px-3 py-4 shadow-sm"
        }
      >
        {lineRows}
      </div>

      {visibleOtherSubs.length > 0 && otherSubVisibleRowIndices.length > 0 && (
        <div
          className={
            isNested
              ? "mt-3 rounded-md border border-surface-200 bg-white px-2 py-3"
              : "mt-6 rounded-lg border border-surface-200 bg-white px-3 py-4 shadow-sm"
          }
        >
          <div className="divide-y divide-surface-100">
            {otherSubVisibleRowIndices.map((rowIndex) => {
              const vfk = formKeyForItemListCell(listPath, rowIndex, ITEM_LIST_PRIMARY_ROW_KEY);
              const raw = formValues[vfk];
              const lineLabel =
                raw !== undefined && raw !== true && raw !== false ? String(raw).trim() : "";
              const lineHref = lineLabel ? safeHttpOrHttpsUrl(lineLabel) : null;
              return (
                <div key={`rest-row-${pathId}-${rowIndex}`} className="space-y-3 py-3 first:pt-0">
                  <div
                    className="min-w-0 rounded-md border border-surface-200 border-l-4 border-l-primary-500 bg-surface-50 px-3 py-2"
                    title={lineLabel || undefined}
                  >
                    {lineHref ? (
                      <a
                        href={lineHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-base font-semibold leading-snug text-primary-700 underline decoration-primary-300 decoration-1 underline-offset-2 hover:text-primary-900 hover:decoration-primary-600"
                      >
                        {lineLabel}
                      </a>
                    ) : (
                      <p
                        className={`truncate text-base font-semibold leading-snug text-surface-900 ${lineLabel ? "" : "italic text-surface-500"}`}
                      >
                        {lineLabel || `Row ${rowIndex + 1}`}
                      </p>
                    )}
                  </div>
                  {visibleOtherSubs.map((sub) => (
                    <div key={`${rowIndex}-${sub.key}`} className="min-w-0">
                      {renderSubControl(sub, rowIndex)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
