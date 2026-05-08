"use client";

import type { Node } from "@xyflow/react";
import type { TemplateStepInput } from "@/entities/template";
import type { FlowNodeData } from "../_lib/template-flow";

function ItemListSubFieldsEditor({
  columns,
  onChange,
}: {
  columns: TemplateStepInput[];
  onChange: (next: TemplateStepInput[]) => void;
}) {
  return (
    <>
      {columns.map((sub, si) => (
        <div key={si} className="space-y-1 rounded border border-surface-200 bg-white p-2">
          <input
            placeholder="Sub key"
            value={sub.key}
            onChange={(e) => {
              const subInputs = [...columns];
              subInputs[si] = { ...sub, key: e.target.value };
              onChange(subInputs);
            }}
            className="w-full rounded border border-surface-200 px-2 py-1 font-mono text-xs text-surface-900"
          />
          <select
            value={sub.type}
            onChange={(e) => {
              const subInputs = [...columns];
              const st = e.target.value as
                | "bool"
                | "string"
                | "string-multiline"
                | "number"
                | "decimal_string"
                | "datetime"
                | "dropdown"
                | "item_list";
              if (st === "item_list") {
                subInputs[si] = {
                  key: sub.key,
                  type: "item_list",
                  title: sub.title,
                  visibleExpression: sub.visibleExpression,
                  readOnly: sub.readOnly,
                  subInputs: [{ key: "item", type: "string", title: "Item" }],
                };
              } else if (sub.type === "item_list") {
                const { subInputs: _nested, values: _v, ...rest } = sub as TemplateStepInput & {
                  subInputs?: TemplateStepInput[];
                };
                subInputs[si] = {
                  ...rest,
                  type: st,
                  values: st === "dropdown" ? [] : undefined,
                };
              } else {
                subInputs[si] = {
                  ...sub,
                  type: st,
                  values: st === "dropdown" ? sub.values ?? [] : undefined,
                };
              }
              onChange(subInputs);
            }}
            className="w-full rounded border border-surface-200 px-2 py-1 text-xs text-surface-900"
          >
            <option value="string">string</option>
            <option value="string-multiline">string-multiline</option>
            <option value="datetime">datetime</option>
            <option value="number">number</option>
            <option value="decimal_string">decimal string</option>
            <option value="bool">bool</option>
            <option value="dropdown">dropdown</option>
            <option value="item_list">Item list (nested)</option>
          </select>
          {sub.type === "dropdown" && (
            <input
              placeholder="Options (comma-separated)"
              value={(sub.values ?? []).join(", ")}
              onChange={(e) => {
                const subInputs = [...columns];
                subInputs[si] = {
                  ...sub,
                  values: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                };
                onChange(subInputs);
              }}
              className="w-full rounded border border-surface-200 px-2 py-1 text-xs text-surface-900"
            />
          )}
          {sub.type === "item_list" && (
            <div className="mt-2 space-y-2 rounded border border-amber-100 bg-amber-50/40 p-2">
              <p className="text-[10px] text-surface-600">
                Nested list: each parent row stores an array here. Rows use the same{" "}
                <code className="font-mono">value</code> line plus the sub-keys below.
              </p>
              <ItemListSubFieldsEditor
                columns={sub.subInputs ?? []}
                onChange={(nextNested) => {
                  const subInputs = [...columns];
                  subInputs[si] = { ...(sub as TemplateStepInput & { type: "item_list" }), subInputs: nextNested };
                  onChange(subInputs);
                }}
              />
            </div>
          )}
          <input
            placeholder="Title"
            value={sub.title}
            onChange={(e) => {
              const subInputs = [...columns];
              subInputs[si] = { ...sub, title: e.target.value };
              onChange(subInputs);
            }}
            className="w-full rounded border border-surface-200 px-2 py-1 text-xs text-surface-900"
          />
          <button
            type="button"
            onClick={() => onChange(columns.filter((_, j) => j !== si))}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Remove sub-field
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const n = columns.length + 1;
          onChange([...columns, { key: `col_${n}`, type: "string", title: "Column" }]);
        }}
        className="text-xs text-primary-600 hover:text-primary-700"
      >
        + Add sub-field
      </button>
    </>
  );
}

type ResultViewControl = {
  data: string;
  title: string;
  visibleExpression?: string;
  plainText?: boolean;
};

export function ConfigPanel({
  node,
  onUpdate,
  onClose,
  allStepKeys,
  resultViewControls = [],
  onUpdateResultViewControls,
  templatePermissions = [],
  onUpdateTemplatePermissions,
}: {
  node: Node<FlowNodeData> | null;
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onClose: () => void;
  allStepKeys: string[];
  resultViewControls?: ResultViewControl[];
  onUpdateResultViewControls?: (vc: ResultViewControl[]) => void;
  templatePermissions?: string[];
  onUpdateTemplatePermissions?: (permissions: string[]) => void;
}) {
  if (!node) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-surface-200 bg-surface-50 p-4">
        <p className="mb-3 text-sm text-surface-500">Select a step to configure it.</p>
        {onUpdateTemplatePermissions && (
          <label className="mb-4 block">
            <span className="text-xs text-surface-500">
              Permissions to start (comma-separated Auth0 permission names, empty = any authenticated user)
            </span>
            <input
              type="text"
              value={(templatePermissions ?? []).join(", ")}
              onChange={(e) =>
                onUpdateTemplatePermissions(
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="e.g. processes:write"
              className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
            />
          </label>
        )}
        {onUpdateResultViewControls && (
          <div>
            <span className="text-xs text-surface-500">Result view controls (shown when process has finished)</span>
<p className="mt-0.5 text-xs text-surface-600">Data: literal text, {"${stepKey.fieldKey}"} for context, or {"{{ expression }}" } for JavaScript (step keys, keccak256, generatePayload, Date/Math/JSON)</p>
                    <div className="mt-1 space-y-2">
                      {(resultViewControls ?? []).map((vc, i) => (
                        <div
                          key={i}
                          className="rounded border border-surface-200 bg-surface-50 p-2"
                        >
                          <input
                            placeholder={'e.g. ${stepKey.fieldKey} or {{ new Date().toISOString() }}'}
                    value={vc.data}
                    onChange={(e) => {
                      const viewControls = [...(resultViewControls ?? [])];
                      viewControls[i] = { ...vc, data: e.target.value };
                      onUpdateResultViewControls(viewControls);
                    }}
                    className="mb-1 w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                  />
                  <input
                    placeholder="Title (label)"
                    value={vc.title}
                    onChange={(e) => {
                      const viewControls = [...(resultViewControls ?? [])];
                      viewControls[i] = { ...vc, title: e.target.value };
                      onUpdateResultViewControls(viewControls);
                    }}
                    className="mb-1 w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                  />
                  <input
                    placeholder="Visible when (e.g. context.step.field)"
                    value={vc.visibleExpression ?? ""}
                    onChange={(e) => {
                      const viewControls = [...(resultViewControls ?? [])];
                      viewControls[i] = { ...vc, visibleExpression: e.target.value || undefined };
                      onUpdateResultViewControls(viewControls);
                    }}
                    className="w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                  />
                  <label className="mt-1 flex cursor-pointer items-center gap-2 text-xs text-surface-700">
                    <input
                      type="checkbox"
                      checked={Boolean(vc.plainText)}
                      onChange={(e) => {
                        const viewControls = [...(resultViewControls ?? [])];
                        viewControls[i] = { ...vc, plainText: e.target.checked || undefined };
                        onUpdateResultViewControls(viewControls);
                      }}
                    />
                    Plain text (no HTML; use for markdown snippets)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const viewControls = (resultViewControls ?? []).filter((_, j) => j !== i);
                      onUpdateResultViewControls(viewControls);
                    }}
                    className="mt-1 text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const viewControls = [
                    ...(resultViewControls ?? []),
                    { data: "", title: "View", visibleExpression: undefined, plainText: undefined },
                  ];
                  onUpdateResultViewControls(viewControls);
                }}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                + Add result view control
              </button>
            </div>
          </div>
        )}
      </aside>
    );
  }

  const d = node.data;
  const update = (partial: Partial<FlowNodeData>) => onUpdate(node.id, partial);
  const otherKeys = allStepKeys.filter((k) => k !== node.id);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-surface-200 bg-surface-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-surface-900">Configure step</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-surface-500 hover:text-surface-800"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-surface-500">Key</span>
          <input
            type="text"
            value={d.stepKey}
            onChange={(e) => update({ stepKey: e.target.value })}
            className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
          />
        </label>
        <label className="block">
          <span className="text-xs text-surface-500">Title</span>
          <input
            type="text"
            value={d.title}
            onChange={(e) => update({ title: e.target.value })}
            className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
          />
        </label>
        <label className="block">
          <span className="text-xs text-surface-500">Confirmation message (shown after completing this step)</span>
          <input
            type="text"
            value={d.confirmationMessage ?? ""}
            onChange={(e) => update({ confirmationMessage: e.target.value || undefined })}
            placeholder="e.g. Your response has been saved."
            className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
          />
        </label>

        {d.type === "input" && (
          <>
            <label className="block">
              <span className="text-xs text-surface-500">
                Permissions that can run this step (comma-separated, empty = any authenticated user)
              </span>
              <input
                type="text"
                value={(d.permissions ?? []).join(", ")}
                onChange={(e) =>
                  update({
                    permissions: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="e.g. processes:write"
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">
                Complete when (optional expression — if set, Continue/Finish only when truthy; same
                rules as conditions, plus{" "}
                <code className="rounded bg-surface-200 px-0.5">hasPermission(&quot;…&quot;)</code> and{" "}
                <code className="rounded bg-surface-200 px-0.5">currentProcess</code> (e.g.{" "}
                <code className="rounded bg-surface-200 px-0.5">.url</code>).
              </span>
              <textarea
                value={d.completeExpression ?? ""}
                onChange={(e) =>
                  update({
                    completeExpression: e.target.value.trim() ? e.target.value : undefined,
                  })
                }
                placeholder='e.g. hasPermission("nfat:operate")'
                rows={2}
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 font-mono text-xs text-surface-900"
              />
            </label>
            <div>
              <span className="text-xs text-surface-500">Inputs & view controls (order is preserved)</span>
              <p className="mt-0.5 text-xs text-surface-600">
                View controls: read-only string. Use {"${stepKey.fieldKey}"} for context or{" "}
                {"{{ expression }}"} for JavaScript (step keys, keccak256, generatePayload,
                hasPermission, Date/Math/JSON, currentProcess). Input visibility expressions may use{" "}
                <code className="rounded bg-surface-200 px-0.5">hasPermission(&quot;…&quot;)</code>.
              </p>
              <div className="mt-1 space-y-2">
                {(d.inputs ?? []).map((input, i) => (
                  <div
                    key={i}
                    className="rounded border border-surface-200 bg-surface-50 p-2"
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-surface-500">
                        {input.readOnly ? "View control" : "Input"}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          title="Move up"
                          disabled={i === 0}
                          onClick={() => {
                            const inputs = [...(d.inputs ?? [])];
                            [inputs[i - 1], inputs[i]] = [inputs[i], inputs[i - 1]];
                            update({ inputs });
                          }}
                          className="text-surface-500 hover:text-surface-800 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          disabled={i === (d.inputs?.length ?? 0) - 1}
                          onClick={() => {
                            const inputs = [...(d.inputs ?? [])];
                            [inputs[i], inputs[i + 1]] = [inputs[i + 1], inputs[i]];
                            update({ inputs });
                          }}
                          className="text-surface-500 hover:text-surface-800 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    {input.readOnly ? (
                      <>
                        <input
                          placeholder={'e.g. ${stepKey.fieldKey} or {{ new Date().toISOString() }}'}
                          value={input.defaultValue ?? ""}
                          onChange={(e) => {
                            const inputs = [...(d.inputs ?? [])];
                            inputs[i] = { ...input, defaultValue: e.target.value };
                            update({ inputs });
                          }}
                          className="mb-1 w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                        />
                        <input
                          placeholder="Title (label)"
                          value={input.title}
                          onChange={(e) => {
                            const inputs = [...(d.inputs ?? [])];
                            inputs[i] = { ...input, title: e.target.value };
                            update({ inputs });
                          }}
                          className="mb-1 w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                        />
                        <input
                          placeholder="Visible when (e.g. context.step.field)"
                          value={input.visibleExpression ?? ""}
                          onChange={(e) => {
                            const inputs = [...(d.inputs ?? [])];
                            inputs[i] = { ...input, visibleExpression: e.target.value || undefined };
                            update({ inputs });
                          }}
                          className="w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                        />
                      </>
                    ) : (
                      <>
                        <input
                          placeholder="Field key"
                          value={input.key}
                          onChange={(e) => {
                            const inputs = [...(d.inputs ?? [])];
                            inputs[i] = { ...input, key: e.target.value };
                            update({ inputs });
                          }}
                          className="mb-1 w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                        />
                        <select
                          value={input.type}
                          onChange={(e) => {
                            const inputs = [...(d.inputs ?? [])];
                            const newType = e.target.value as
                              | "bool"
                              | "string"
                              | "string-multiline"
                              | "number"
                              | "decimal_string"
                              | "datetime"
                              | "dropdown"
                              | "item_list";
                            if (newType === "item_list") {
                              inputs[i] = {
                                key: input.key,
                                type: "item_list",
                                title: input.title,
                                visibleExpression: input.visibleExpression,
                                subInputs: [
                                  { key: "item", type: "string", title: "Item" },
                                  { key: "details", type: "string", title: "Details" },
                                ],
                              };
                              update({ inputs });
                              return;
                            }
                            if (input.type === "item_list") {
                              const { subInputs: _si, linesFromKey: _lk, ...rest } = input as typeof input & {
                                linesFromKey?: string;
                              };
                              inputs[i] = {
                                ...rest,
                                type: newType,
                                values: newType === "dropdown" ? [] : undefined,
                              };
                              update({ inputs });
                              return;
                            }
                            inputs[i] = {
                              ...input,
                              type: newType,
                              values: newType === "dropdown" ? input.values ?? [] : undefined,
                            };
                            update({ inputs });
                          }}
                          className="mb-1 w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                        >
                          <option value="string">string</option>
                          <option value="string-multiline">string-multiline</option>
                          <option value="datetime">datetime</option>
                          <option value="number">number (JSON number)</option>
                          <option value="decimal_string">decimal string (exact text)</option>
                          <option value="bool">bool</option>
                          <option value="dropdown">dropdown</option>
                          <option value="item_list">Item list (repeating rows)</option>
                        </select>
                        {input.type === "item_list" && (
                          <div className="mb-1 space-y-2 rounded border border-amber-200 bg-amber-50/50 p-2">
                            <p className="text-[10px] text-surface-600">
                              Each row always stores a primary string at the fixed key <code className="font-mono">value</code> (edited
                              under this list’s title). Sub-keys here must not be <code className="font-mono">value</code>. An extra
                              empty row is always shown so users can add the next item. Sub-fields may be nested item lists.
                            </p>
                            <div className="text-[10px] font-medium text-surface-600">Sub-fields per row</div>
                            <ItemListSubFieldsEditor
                              columns={input.subInputs ?? []}
                              onChange={(subInputs) => {
                                const inputs = [...(d.inputs ?? [])];
                                inputs[i] = { ...input, subInputs };
                                update({ inputs });
                              }}
                            />
                          </div>
                        )}
                        {input.type === "dropdown" && (
                          <input
                            type="text"
                            placeholder="Values (comma-separated)"
                            value={(input.values ?? []).join(", ")}
                            onChange={(e) => {
                              const inputs = [...(d.inputs ?? [])];
                              inputs[i] = {
                                ...input,
                                values: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              };
                              update({ inputs });
                            }}
                            className="mt-1 w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                          />
                        )}
                        <input
                          placeholder="Title"
                          value={input.title}
                          onChange={(e) => {
                            const inputs = [...(d.inputs ?? [])];
                            inputs[i] = { ...input, title: e.target.value };
                            update({ inputs });
                          }}
                          className="w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                        />
                        <input
                          placeholder="Visible when (e.g. context.step.field)"
                          value={input.visibleExpression ?? ""}
                          onChange={(e) => {
                            const inputs = [...(d.inputs ?? [])];
                            inputs[i] = { ...input, visibleExpression: e.target.value || undefined };
                            update({ inputs });
                          }}
                          className="mt-1 w-full rounded border border-surface-200 bg-white px-2 py-1 text-xs text-surface-900"
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const inputs = (d.inputs ?? []).filter((_, j) => j !== i);
                        update({ inputs });
                      }}
                      className="mt-1 text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const inputs = [...(d.inputs ?? []), { key: `field_${(d.inputs?.length ?? 0) + 1}`, type: "string" as const, title: "Field", visibleExpression: undefined }];
                      update({ inputs });
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    + Add input
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const inputs = [...(d.inputs ?? []), { key: `_view_${Date.now()}`, type: "string" as const, title: "View", readOnly: true as const, defaultValue: "" }];
                      update({ inputs });
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    + Add view control
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {d.type === "condition" && (
          <>
            <label className="block">
              <span className="text-xs text-surface-500">
                Expression (e.g. context.stepKey.field). During a run,{" "}
                <code className="rounded bg-surface-200 px-0.5">currentProcess</code> (e.g.{" "}
                <code className="rounded bg-surface-200 px-0.5">currentProcess.url</code>) is in scope.
              </span>
              <input
                type="text"
                value={d.expression ?? ""}
                onChange={(e) => update({ expression: e.target.value })}
                placeholder="context."
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
              />
            </label>
            <p className="text-xs text-surface-500">Connect &quot;then&quot; and &quot;else&quot; handles to set next steps.</p>
          </>
        )}

        {d.type === "automatic" && (
          <>
            <label className="block">
              <span className="text-xs text-surface-500">Context key (where to store the value)</span>
              <input
                type="text"
                value={d.contextKey ?? ""}
                onChange={(e) => update({ contextKey: e.target.value })}
                placeholder="e.g. summary"
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">
                Expression (path to read value from context). During a run,{" "}
                <code className="rounded bg-surface-200 px-0.5">currentProcess</code> is available.
              </span>
              <input
                type="text"
                value={d.expression ?? ""}
                onChange={(e) => update({ expression: e.target.value })}
                placeholder="e.g. context.stepKey.field"
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
              />
            </label>
          </>
        )}

        {d.type === "slack_notify" && (
          <>
            <p className="text-xs text-surface-600">
              One post in the channel; each entry is a workspace email (resolved to a Slack user) or a raw U… id.
              Only users who are members of this channel are @-mentioned. Message body uses the same expression rules
              as conditions. Bot needs <code className="rounded bg-surface-200 px-0.5">SLACK_BOT_TOKEN</code> with{" "}
              <code className="rounded bg-surface-200 px-0.5">users:read.email</code> for email lookup and read access
              for <code className="rounded bg-surface-200 px-0.5">conversations.members</code>.
            </p>
            <label className="block">
              <span className="text-xs text-surface-500">Channel id (C… or G…)</span>
              <input
                type="text"
                value={d.channelId ?? ""}
                onChange={(e) => update({ channelId: e.target.value })}
                placeholder="e.g. C01234567"
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 font-mono text-sm text-surface-900"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">Users to @mention (comma-separated: email or U… id)</span>
              <input
                type="text"
                value={(d.mentionUsers ?? []).join(", ")}
                onChange={(e) =>
                  update({
                    mentionUsers: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="e.g. ada@company.com, bob@company.com, U01234567"
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 font-mono text-sm text-surface-900"
              />
            </label>
            <label className="block">
              <span className="text-xs text-surface-500">
                Message text (expression → string). Slack mrkdwn is on: use{" "}
                <code className="rounded bg-surface-200 px-0.5">&lt;https://…|here&gt;</code> for a clickable label. Use{" "}
                <code className="rounded bg-surface-200 px-0.5">currentProcess.url</code> (and other{" "}
                <code className="rounded bg-surface-200 px-0.5">currentProcess.*</code>) when the process exists.
              </span>
              <textarea
                value={d.messageExpression ?? ""}
                onChange={(e) => update({ messageExpression: e.target.value })}
                placeholder={'e.g. "See <" + currentProcess.url + "|link>"'}
                rows={3}
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 font-mono text-xs text-surface-900"
              />
            </label>
          </>
        )}

        {d.type === "script" && (
          <>
            <p className="text-xs text-surface-600">
              Async JavaScript body (trusted). The runner wraps it as{" "}
              <code className="rounded bg-surface-200 px-0.5">async (context) =&gt; {"{ ... }"}</code> — use{" "}
              <code className="rounded bg-surface-200 px-0.5">context</code> (same shape as process context). Return a
              plain object; its keys are merged into <code className="rounded bg-surface-200 px-0.5">context.&lt;stepKey&gt;</code>.
              Prefer defining <code className="rounded bg-surface-200 px-0.5">source</code> in the template TS file and
              paste here only when experimenting.
            </p>
            <label className="block">
              <span className="text-xs text-surface-500">Source (async body)</span>
              <textarea
                value={d.source ?? ""}
                onChange={(e) => update({ source: e.target.value })}
                spellCheck={false}
                rows={18}
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 font-mono text-xs text-surface-900"
              />
            </label>
          </>
        )}

        {d.type === "request" && (
          <>
            <label className="block">
              <span className="text-xs text-surface-500">Prompt (system instructions for agent)</span>
              <textarea
                value={d.prompt ?? ""}
                onChange={(e) => update({ prompt: e.target.value })}
                rows={4}
                className="mt-0.5 w-full rounded border border-surface-200 bg-white px-2 py-1.5 text-sm text-surface-900"
              />
            </label>
          </>
        )}
      </div>
    </aside>
  );
}
