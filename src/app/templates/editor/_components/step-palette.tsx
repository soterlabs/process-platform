"use client";

const STEP_TYPES = [
  { type: "input" as const, label: "Input", desc: "User or system input" },
  { type: "condition" as const, label: "Condition", desc: "Branch on expression" },
  { type: "request" as const, label: "Request", desc: "Agent / LLM call" },
  { type: "automatic" as const, label: "Set context", desc: "Set context from expression (automatic)" },
  { type: "slack_notify" as const, label: "Slack notify", desc: "Channel + emails/U… → @mentions; body from expression" },
  { type: "script" as const, label: "Script", desc: "Async JS (context) → return object merged into step context" },
];

export function StepPalette() {
  function onDragStart(
    event: React.DragEvent,
    nodeType: "input" | "condition" | "request" | "automatic" | "slack_notify" | "script"
  ) {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-surface-200 bg-white p-3">
      <h2 className="mb-3 text-sm font-medium text-surface-700">Steps</h2>
      <p className="mb-3 text-xs text-surface-500">
        Drag a step onto the canvas, then connect and configure.
      </p>
      <div className="flex flex-col gap-2">
        {STEP_TYPES.map(({ type, label, desc }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            className="cursor-grab rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 transition hover:border-primary-300 hover:bg-primary-50 active:cursor-grabbing"
          >
            <div className="font-medium text-surface-900">{label}</div>
            <div className="text-xs text-surface-500">{desc}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-surface-200 pt-3">
        <a
          href="/templates/editor/new"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          New template
        </a>
      </div>
    </aside>
  );
}
