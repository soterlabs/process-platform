"use client";

import type { Node } from "@xyflow/react";
import type { FlowNodeData } from "../_lib/template-flow";

type ResultViewControl = { key: string; title: string; visibleExpression?: string };

export function ConfigPanel({
  node,
  onUpdate,
  onClose,
  allStepKeys,
  resultViewControls = [],
  onUpdateResultViewControls,
  templateAllowedRoles = [],
  onUpdateTemplateAllowedRoles,
}: {
  node: Node<FlowNodeData> | null;
  onUpdate: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onClose: () => void;
  allStepKeys: string[];
  resultViewControls?: ResultViewControl[];
  onUpdateResultViewControls?: (vc: ResultViewControl[]) => void;
  templateAllowedRoles?: string[];
  onUpdateTemplateAllowedRoles?: (roles: string[]) => void;
}) {
  if (!node) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-stone-700 bg-stone-900 p-4">
        <p className="mb-3 text-sm text-stone-500">Select a step to configure it.</p>
        {onUpdateTemplateAllowedRoles && (
          <label className="mb-4 block">
            <span className="text-xs text-stone-500">Template roles (who can start this process, comma-separated, empty = any)</span>
            <input
              type="text"
              value={(templateAllowedRoles ?? []).join(", ")}
              onChange={(e) =>
                onUpdateTemplateAllowedRoles(
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="e.g. Prime, OEA"
              className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
            />
          </label>
        )}
        {onUpdateResultViewControls && (
          <div>
            <span className="text-xs text-stone-500">Result view controls (shown when process has finished)</span>
            <p className="mt-0.5 text-xs text-stone-600">Key = context path, e.g. stepKey.fieldKey</p>
            <div className="mt-1 space-y-2">
              {(resultViewControls ?? []).map((vc, i) => (
                <div
                  key={i}
                  className="rounded border border-stone-600 bg-stone-800 p-2"
                >
                  <input
                    placeholder="Context path (stepKey.fieldKey)"
                    value={vc.key}
                    onChange={(e) => {
                      const viewControls = [...(resultViewControls ?? [])];
                      viewControls[i] = { ...vc, key: e.target.value };
                      onUpdateResultViewControls(viewControls);
                    }}
                    className="mb-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                  />
                  <input
                    placeholder="Title (label)"
                    value={vc.title}
                    onChange={(e) => {
                      const viewControls = [...(resultViewControls ?? [])];
                      viewControls[i] = { ...vc, title: e.target.value };
                      onUpdateResultViewControls(viewControls);
                    }}
                    className="mb-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                  />
                  <input
                    placeholder="Visible when (e.g. context.step.field)"
                    value={vc.visibleExpression ?? ""}
                    onChange={(e) => {
                      const viewControls = [...(resultViewControls ?? [])];
                      viewControls[i] = { ...vc, visibleExpression: e.target.value || undefined };
                      onUpdateResultViewControls(viewControls);
                    }}
                    className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const viewControls = (resultViewControls ?? []).filter((_, j) => j !== i);
                      onUpdateResultViewControls(viewControls);
                    }}
                    className="mt-1 text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const viewControls = [...(resultViewControls ?? []), { key: "", title: "View", visibleExpression: undefined }];
                  onUpdateResultViewControls(viewControls);
                }}
                className="text-xs text-amber-400 hover:text-amber-300"
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
    <aside className="flex w-80 shrink-0 flex-col border-l border-stone-700 bg-stone-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-stone-200">Configure step</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-stone-500 hover:text-stone-300"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-stone-500">Key</span>
          <input
            type="text"
            value={d.stepKey}
            onChange={(e) => update({ stepKey: e.target.value })}
            className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
          />
        </label>
        <label className="block">
          <span className="text-xs text-stone-500">Title</span>
          <input
            type="text"
            value={d.title}
            onChange={(e) => update({ title: e.target.value })}
            className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
          />
        </label>
        <label className="block">
          <span className="text-xs text-stone-500">Confirmation message (shown after completing this step)</span>
          <input
            type="text"
            value={d.confirmationMessage ?? ""}
            onChange={(e) => update({ confirmationMessage: e.target.value || undefined })}
            placeholder="e.g. Your response has been saved."
            className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
          />
        </label>

        {d.type === "input" && (
          <>
            <label className="block">
              <span className="text-xs text-stone-500">Roles that can run this step (comma-separated, empty = any)</span>
              <input
                type="text"
                value={(d.allowedRoles ?? []).join(", ")}
                onChange={(e) =>
                  update({
                    allowedRoles: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="e.g. admin, editor"
                className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
              />
            </label>
            <div>
              <span className="text-xs text-stone-500">Inputs</span>
              <div className="mt-1 space-y-2">
                {(d.inputs ?? []).map((input, i) => (
                  <div
                    key={i}
                    className="rounded border border-stone-600 bg-stone-800 p-2"
                  >
                    <input
                      placeholder="Field key"
                      value={input.key}
                      onChange={(e) => {
                        const inputs = [...(d.inputs ?? [])];
                        inputs[i] = { ...input, key: e.target.value };
                        update({ inputs });
                      }}
                      className="mb-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                    />
                    <select
                      value={input.type}
                      onChange={(e) => {
                        const inputs = [...(d.inputs ?? [])];
                        const newType = e.target.value as "bool" | "string" | "dropdown";
                        inputs[i] = {
                          ...input,
                          type: newType,
                          values: newType === "dropdown" ? input.values ?? [] : undefined,
                        };
                        update({ inputs });
                      }}
                      className="mb-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                    >
                      <option value="string">string</option>
                      <option value="bool">bool</option>
                      <option value="dropdown">dropdown</option>
                    </select>
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
                        className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
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
                      className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                    />
                    <input
                      placeholder="Visible when (e.g. context.step.field)"
                      value={input.visibleExpression ?? ""}
                      onChange={(e) => {
                        const inputs = [...(d.inputs ?? [])];
                        inputs[i] = { ...input, visibleExpression: e.target.value || undefined };
                        update({ inputs });
                      }}
                      className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const inputs = (d.inputs ?? []).filter((_, j) => j !== i);
                        update({ inputs });
                      }}
                      className="mt-1 text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const inputs = [...(d.inputs ?? []), { key: `field_${(d.inputs?.length ?? 0) + 1}`, type: "string" as const, title: "Field", visibleExpression: undefined }];
                    update({ inputs });
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  + Add input
                </button>
              </div>
            </div>
            <div>
              <span className="text-xs text-stone-500">View controls (read-only from other steps)</span>
              <p className="mt-0.5 text-xs text-stone-600">Key = context path, e.g. stepKey.fieldKey</p>
              <div className="mt-1 space-y-2">
                {(d.viewControls ?? []).map((vc, i) => (
                  <div
                    key={i}
                    className="rounded border border-stone-600 bg-stone-800 p-2"
                  >
                    <input
                      placeholder="Context path (stepKey.fieldKey)"
                      value={vc.key}
                      onChange={(e) => {
                        const viewControls = [...(d.viewControls ?? [])];
                        viewControls[i] = { ...vc, key: e.target.value };
                        update({ viewControls });
                      }}
                      className="mb-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                    />
                    <input
                      placeholder="Title (label)"
                      value={vc.title}
                      onChange={(e) => {
                        const viewControls = [...(d.viewControls ?? [])];
                        viewControls[i] = { ...vc, title: e.target.value };
                        update({ viewControls });
                      }}
                      className="mb-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                    />
                    <input
                      placeholder="Visible when (e.g. context.step.field)"
                      value={vc.visibleExpression ?? ""}
                      onChange={(e) => {
                        const viewControls = [...(d.viewControls ?? [])];
                        viewControls[i] = { ...vc, visibleExpression: e.target.value || undefined };
                        update({ viewControls });
                      }}
                      className="w-full rounded border border-stone-600 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const viewControls = (d.viewControls ?? []).filter((_, j) => j !== i);
                        update({ viewControls });
                      }}
                      className="mt-1 text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const viewControls = [...(d.viewControls ?? []), { key: "", title: "View", visibleExpression: undefined }];
                    update({ viewControls });
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  + Add view control
                </button>
              </div>
            </div>
          </>
        )}

        {d.type === "condition" && (
          <>
            <label className="block">
              <span className="text-xs text-stone-500">Expression (e.g. context.stepKey.field)</span>
              <input
                type="text"
                value={d.expression ?? ""}
                onChange={(e) => update({ expression: e.target.value })}
                placeholder="context."
                className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
              />
            </label>
            <p className="text-xs text-stone-500">Connect &quot;then&quot; and &quot;else&quot; handles to set next steps.</p>
          </>
        )}

        {d.type === "automatic" && (
          <>
            <label className="block">
              <span className="text-xs text-stone-500">Context key (where to store the value)</span>
              <input
                type="text"
                value={d.contextKey ?? ""}
                onChange={(e) => update({ contextKey: e.target.value })}
                placeholder="e.g. summary"
                className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
              />
            </label>
            <label className="block">
              <span className="text-xs text-stone-500">Expression (path to read value from context)</span>
              <input
                type="text"
                value={d.expression ?? ""}
                onChange={(e) => update({ expression: e.target.value })}
                placeholder="e.g. context.stepKey.field"
                className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
              />
            </label>
          </>
        )}

        {d.type === "request" && (
          <>
            <label className="block">
              <span className="text-xs text-stone-500">Prompt (system instructions for agent)</span>
              <textarea
                value={d.prompt ?? ""}
                onChange={(e) => update({ prompt: e.target.value })}
                rows={4}
                className="mt-0.5 w-full rounded border border-stone-600 bg-stone-800 px-2 py-1.5 text-sm text-stone-200"
              />
            </label>
          </>
        )}
      </div>
    </aside>
  );
}
