"use client";

const STEP_TYPES = [
  { type: "input" as const, label: "Input", desc: "User or system input" },
  { type: "condition" as const, label: "Condition", desc: "Branch on expression" },
  { type: "request" as const, label: "Request", desc: "Agent / LLM call" },
  { type: "automatic" as const, label: "Set context", desc: "Set context from expression (automatic)" },
];

export function StepPalette() {
  function onDragStart(
    event: React.DragEvent,
    nodeType: "input" | "condition" | "request" | "automatic"
  ) {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-stone-700 bg-stone-900 p-3">
      <h2 className="mb-3 text-sm font-medium text-stone-400">Steps</h2>
      <p className="mb-3 text-xs text-stone-500">
        Drag a step onto the canvas, then connect and configure.
      </p>
      <div className="flex flex-col gap-2">
        {STEP_TYPES.map(({ type, label, desc }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            className="cursor-grab rounded-lg border border-stone-600 bg-stone-800 px-3 py-2.5 transition hover:border-stone-500 hover:bg-stone-800/80 active:cursor-grabbing"
          >
            <div className="font-medium text-stone-200">{label}</div>
            <div className="text-xs text-stone-500">{desc}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-stone-700 pt-3">
        <a
          href="/templates/editor/new"
          className="text-sm text-amber-400 hover:text-amber-300"
        >
          New template
        </a>
      </div>
    </aside>
  );
}
