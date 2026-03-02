"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  Panel,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { StepPalette } from "../_components/step-palette";
import { ConfigPanel } from "../_components/config-panel";
import {
  templateToFlow,
  flowToTemplate,
  type FlowNodeData,
} from "../_lib/template-flow";
import type { Template } from "@/entities/template";
import { authFetch } from "@/lib/auth-client";

function AutomaticStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-violet-600/80 bg-stone-800 px-4 py-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!border-2 !border-stone-500 !bg-stone-600" />
      <div className="flex items-center gap-2">
        <span className="text-violet-400">▸</span>
        <span className="font-medium text-stone-200">{data.title || "Set context"}</span>
      </div>
      <div className="mt-1 text-xs text-stone-500">{data.stepKey}</div>
      <Handle type="source" position={Position.Right} className="!border-2 !border-stone-500 !bg-stone-600" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  input: InputStepNode,
  condition: ConditionStepNode,
  request: RequestStepNode,
  automatic: AutomaticStepNode,
};

function InputStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-amber-600/80 bg-stone-800 px-4 py-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!border-2 !border-stone-500 !bg-stone-600" />
      <div className="flex items-center gap-2">
        <span className="text-amber-400">◇</span>
        <span className="font-medium text-stone-200">{data.title || "Input"}</span>
      </div>
      <div className="mt-1 text-xs text-stone-500">{data.stepKey}</div>
      <Handle type="source" position={Position.Right} className="!border-2 !border-stone-500 !bg-stone-600" />
    </div>
  );
}

function ConditionStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-sky-600/80 bg-stone-800 px-4 py-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!border-2 !border-stone-500 !bg-stone-600" />
      <div className="flex items-center gap-2">
        <span className="text-sky-400">◆</span>
        <span className="font-medium text-stone-200">{data.title || "Condition"}</span>
      </div>
      <div className="mt-1 text-xs text-stone-500">{data.stepKey}</div>
      <div className="mt-1 text-xs text-sky-500">then / else</div>
      <Handle type="source" position={Position.Right} id="then" className="!top-[45%] !border-2 !border-sky-500 !bg-sky-700" />
      <Handle type="source" position={Position.Right} id="else" className="!top-[75%] !border-2 !border-stone-500 !bg-stone-600" />
    </div>
  );
}

function RequestStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-emerald-600/80 bg-stone-800 px-4 py-3 shadow-lg">
      <Handle type="target" position={Position.Left} className="!border-2 !border-stone-500 !bg-stone-600" />
      <div className="flex items-center gap-2">
        <span className="text-emerald-400">●</span>
        <span className="font-medium text-stone-200">{data.title || "Request"}</span>
      </div>
      <div className="mt-1 text-xs text-stone-500">{data.stepKey}</div>
      <Handle type="source" position={Position.Right} className="!border-2 !border-stone-500 !bg-stone-600" />
    </div>
  );
}

function TemplateEditorInner() {
  const params = useParams();
  const router = useRouter();
  const urlKey = params.key as string;
  const isNew = urlKey === "new";

  const [templateKey, setTemplateKey] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (isNew) {
      setTemplateKey("");
      setTemplateName("");
      setNodes([]);
      setEdges([]);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoadError(null);
    authFetch(`/api/templates/${encodeURIComponent(urlKey)}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Template not found" : "Failed to load");
        return r.json();
      })
      .then((t: Template) => {
        if (cancelled) return;
        setTemplateKey(t.key);
        setTemplateName(t.name ?? "");
        const { nodes: n, edges: e } = templateToFlow(t);
        setNodes(n);
        setEdges(e);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message ?? "Load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [urlKey, isNew, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type") as
        | "input"
        | "condition"
        | "request"
        | "automatic";
      if (!type) return;
      const position = screenToFlowPosition
        ? screenToFlowPosition({ x: event.clientX, y: event.clientY })
        : { x: event.clientX - 200, y: event.clientY - 50 };
      const stepKey = uniqueStepKey(nodes, type);
      const label =
        type === "input"
          ? "Input"
          : type === "condition"
            ? "Condition"
            : type === "request"
              ? "Request"
              : "Set context";
      const defaultData = defaultStepData(type, stepKey);
      const newNode: Node<FlowNodeData> = {
        id: stepKey,
        type,
        position,
        data: {
          ...defaultData,
          stepKey,
          type,
          title: label,
          nextStepKey: (defaultData.nextStepKey ?? null) as string | null,
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, setNodes, screenToFlowPosition]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node<FlowNodeData>) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<FlowNodeData>) => {
      const newKey = data.stepKey?.trim();
      if (newKey && newKey !== nodeId) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nodeId ? { ...n, id: newKey, data: { ...n.data, ...data, stepKey: newKey } } : n
          )
        );
        setEdges((eds) =>
          eds.map((e) => ({
            ...e,
            source: e.source === nodeId ? newKey : e.source,
            target: e.target === nodeId ? newKey : e.target,
            id: e.id.split(nodeId).join(newKey),
          }))
        );
        setSelectedNodeId(newKey);
      } else {
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
        );
      }
    },
    [setNodes, setEdges]
  );

  const handleSave = useCallback(async () => {
    const key = templateKey.trim();
    if (!key) {
      setSaveStatus("error");
      return;
    }
    setSaveStatus("saving");
    try {
      const template = flowToTemplate(nodes, edges, key, templateName.trim() || undefined);
      const res = await authFetch(`/api/templates/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Save failed");
      }
      setSaveStatus("ok");
      if (isNew) router.replace(`/templates/editor/${key}`);
    } catch (err) {
      setSaveStatus("error");
      console.error(err);
    }
  }, [templateKey, templateName, nodes, edges, isNew, router]);

  return (
    <div className="flex h-screen flex-col bg-stone-950">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-700 bg-stone-900 px-4 py-2">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-stone-400 transition hover:text-stone-200"
          >
            ← Process Platform
          </Link>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Template key"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              className="rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-stone-200 placeholder-stone-500"
            />
            <input
              type="text"
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-56 rounded border border-stone-600 bg-stone-800 px-3 py-1.5 text-stone-200 placeholder-stone-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "ok" && (
            <span className="text-sm text-emerald-400">Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-400">Save failed</span>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving" || !templateKey.trim()}
            className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-stone-900 transition hover:bg-amber-500 disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {loadError && !isNew && (
        <div className="bg-red-900/30 px-4 py-2 text-red-300">
          {loadError}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <StepPalette />
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-stone-900"
            defaultEdgeOptions={{ type: "smoothstep" }}
            connectionLineStyle={{ stroke: "rgb(120 113 108)" }}
          >
            <Background gap={16} size={1} color="rgb(68 64 60)" />
            <Controls className="!border-stone-600 !bg-stone-800" />
            <Panel position="top-left" className="text-stone-500 text-sm">
              Drag steps from the left; connect with edges. Select a step to configure.
            </Panel>
          </ReactFlow>
        </div>
        <ConfigPanel
          node={selectedNode ?? null}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNodeId(null)}
          allStepKeys={nodes.map((n) => n.id)}
        />
      </div>
    </div>
  );
}

export default function TemplateEditorPage() {
  return (
    <ReactFlowProvider>
      <TemplateEditorInner />
    </ReactFlowProvider>
  );
}

function uniqueStepKey(nodes: Node<FlowNodeData>[], type: string): string {
  const base =
    type === "input"
      ? "input"
      : type === "condition"
        ? "condition"
        : type === "request"
          ? "request"
          : "automatic";
  let n = 1;
  let key = `${base}_${n}`;
  while (nodes.some((node) => node.id === key)) {
    n++;
    key = `${base}_${n}`;
  }
  return key;
}

function defaultStepData(
  type: "input" | "condition" | "request" | "automatic",
  stepKey: string
): Partial<FlowNodeData> {
  if (type === "input") {
    return {
      inputs: [{ key: "field_1", type: "string", title: "Field" }],
      allowedRoles: [],
      nextStepKey: null,
    };
  }
  if (type === "condition") {
    return {
      expression: "",
      thenStepKey: "",
      elseStepKey: "",
      nextStepKey: null,
    };
  }
  if (type === "automatic") {
    return {
      contextKey: "",
      expression: "",
      nextStepKey: null,
    };
  }
  return {
    requestType: "agent",
    prompt: "",
    nextStepKey: null,
  };
}
