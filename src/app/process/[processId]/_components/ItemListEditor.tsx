"use client";

import type { TemplateStepInput } from "@/entities/template";
import {
  addItemListRow,
  formKeyForItemListCell,
  formKeyForItemListRowCount,
  itemListRenderRowCount,
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
  const countKey = formKeyForItemListRowCount(listPath);
  if (!(countKey in next)) {
    next[countKey] = String(rows.length);
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const rowObj =
      rows[rowIndex] && typeof rows[rowIndex] === "object" && !Array.isArray(rows[rowIndex])
        ? (rows[rowIndex] as Record<string, unknown>)
        : undefined;
    for (const sub of listInput.subInputs ?? []) {
      if (sub.readOnly) continue;
      if (sub.type === "item_list") {
        const nested = sub as TemplateStepInput & { type: "item_list" };
        const rawChild = rowObj?.[sub.key];
        const childRows = Array.isArray(rawChild) ? rawChild : [];
        hydrateItemListFormState(nested, [...listPath, rowIndex, sub.key], childRows, next, resolveTemplate);
        continue;
      }
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

type Props = {
  listInput: TemplateStepInput & { type: "item_list" };
  listPath: ItemListPath;
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

  const pathId = listPath.map(String).join("-");
  const isNested = depth > 0;

  const renderSubControl = (sub: TemplateStepInput, rowIndex: number) =>
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
              : (sub.defaultValue ?? ""),
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

      <div className={isNested ? "mt-2" : "mt-4 space-y-3"}>
        {rowCount === 0 ? (
          <p
            className={
              isNested
                ? "rounded-md border border-surface-200 bg-white px-3 py-3 text-sm text-surface-500"
                : "text-sm text-surface-500"
            }
          >
            No rows yet.
          </p>
        ) : (
          Array.from({ length: rowCount }, (_, rowIndex) => (
            <div
              key={`il-row-${pathId}-${rowIndex}`}
              className={
                isNested
                  ? "rounded-md border border-surface-200 bg-white px-2 py-3"
                  : "rounded-lg border border-surface-200 bg-white px-3 py-4 shadow-sm"
              }
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
                if (!Number.isInteger(from)) return;
                onReorderRow(from, rowIndex);
              }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(rowIndex));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex h-9 w-7 shrink-0 cursor-grab flex-col items-center justify-center rounded border border-transparent text-surface-400 hover:border-surface-200 hover:bg-surface-50 active:cursor-grabbing"
                  aria-label="Drag to reorder row"
                >
                  <span className="text-[10px] leading-none" aria-hidden>
                    ⋮⋮
                  </span>
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => onRemoveRow(rowIndex)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-xl leading-none text-surface-400 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  aria-label="Remove row"
                >
                  <span aria-hidden>×</span>
                </button>
              </div>
              <div className="mt-3 space-y-3 pl-9">
                {visibleSubs.map((sub) => renderSubControl(sub, rowIndex))}
              </div>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={() => onFormValuesChange(addItemListRow(listPath, formValues))}
          className={
            isNested
              ? "w-full rounded-md border border-dashed border-surface-300 bg-surface-50 px-3 py-2 text-sm font-medium text-surface-700 hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-900"
              : "w-full rounded-lg border border-dashed border-primary-300 bg-white px-4 py-2.5 text-sm font-medium text-primary-800 hover:border-primary-400 hover:bg-primary-50/80"
          }
        >
          + Add row
        </button>
      </div>
    </section>
  );
}

