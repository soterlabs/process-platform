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
import { useMe } from "@/hooks/use-me";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
function AutomaticStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-violet-500 bg-white px-4 py-3 shadow-md">
      <Handle type="target" position={Position.Left} className="!border-2 !border-surface-300 !bg-white" />
      <div className="flex items-center gap-2">
        <span className="text-violet-600">▸</span>
        <span className="font-medium text-surface-900">{data.title || "Set context"}</span>
      </div>
      <div className="mt-1 text-xs text-surface-500">{data.stepKey}</div>
      <Handle type="source" position={Position.Right} className="!border-2 !border-surface-300 !bg-white" />
    </div>
  );
}

function SlackNotifyStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-purple-600 bg-white px-4 py-3 shadow-md">
      <Handle type="target" position={Position.Left} className="!border-2 !border-surface-300 !bg-white" />
      <div className="flex items-center gap-2">
        <span className="text-purple-600">#</span>
        <span className="font-medium text-surface-900">{data.title || "Slack notify"}</span>
      </div>
      <div className="mt-1 text-xs text-surface-500">{data.stepKey}</div>
      <Handle type="source" position={Position.Right} className="!border-2 !border-surface-300 !bg-white" />
    </div>
  );
}

function ScriptStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-rose-600 bg-white px-4 py-3 shadow-md">
      <Handle type="target" position={Position.Left} className="!border-2 !border-surface-300 !bg-white" />
      <div className="flex items-center gap-2">
        <span className="text-rose-600" aria-hidden>
          ≡
        </span>
        <span className="font-medium text-surface-900">{data.title || "Script"}</span>
      </div>
      <div className="mt-1 text-xs text-surface-500">{data.stepKey}</div>
      <Handle type="source" position={Position.Right} className="!border-2 !border-surface-300 !bg-white" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  input: InputStepNode,
  condition: ConditionStepNode,
  request: RequestStepNode,
  automatic: AutomaticStepNode,
  slack_notify: SlackNotifyStepNode,
  script: ScriptStepNode,
};

function InputStepNode({ data }: { data: FlowNodeData }) {
  const readOnlyInputs = (data.inputs ?? []).filter((inp) => inp.readOnly);
  const itemLists = (data.inputs ?? []).filter((inp) => inp.type === "item_list");
  return (
    <div className="relative min-w-[180px] rounded-lg border-2 border-amber-500 bg-white px-4 py-3 shadow-md">
      <Handle type="target" position={Position.Left} className="!border-2 !border-surface-300 !bg-white" />
      <div className="flex items-center gap-2">
        <span className="text-amber-600">◇</span>
        <span className="font-medium text-surface-900">{data.title || "Input"}</span>
      </div>
      <div className="mt-1 text-xs text-surface-500">{data.stepKey}</div>
      {itemLists.length > 0 && (
        <div className="mt-1 text-xs text-amber-800">
          {itemLists.length} item list{itemLists.length === 1 ? "" : "s"}
        </div>
      )}
      {readOnlyInputs.length > 0 && (
        <div className="mt-2 border-t border-surface-200 pt-2">
          <div className="text-[10px] uppercase tracking-wider text-surface-500">View controls</div>
          <ul className="mt-1 space-y-0.5">
            {readOnlyInputs.map((inp, i) => (
              <li key={i} className="truncate text-xs text-surface-600" title={inp.defaultValue ?? ""}>
                {inp.title || inp.defaultValue || "—"}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!border-2 !border-surface-300 !bg-white" />
    </div>
  );
}

function ConditionStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-sky-500 bg-white px-4 py-3 shadow-md">
      <Handle type="target" position={Position.Left} className="!border-2 !border-surface-300 !bg-white" />
      <div className="flex items-center gap-2">
        <span className="text-sky-600">◆</span>
        <span className="font-medium text-surface-900">{data.title || "Condition"}</span>
      </div>
      <div className="mt-1 text-xs text-surface-500">{data.stepKey}</div>
      <div className="mt-1 text-xs text-sky-600">then / else</div>
      <Handle type="source" position={Position.Right} id="then" className="!top-[45%] !border-2 !border-sky-500 !bg-sky-500" />
      <Handle type="source" position={Position.Right} id="else" className="!top-[75%] !border-2 !border-surface-300 !bg-white" />
    </div>
  );
}

function RequestStepNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative rounded-lg border-2 border-emerald-500 bg-white px-4 py-3 shadow-md">
      <Handle type="target" position={Position.Left} className="!border-2 !border-surface-300 !bg-white" />
      <div className="flex items-center gap-2">
        <span className="text-emerald-600">●</span>
        <span className="font-medium text-surface-900">{data.title || "Request"}</span>
      </div>
      <div className="mt-1 text-xs text-surface-500">{data.stepKey}</div>
      <Handle type="source" position={Position.Right} className="!border-2 !border-surface-300 !bg-white" />
    </div>
  );
}

function TemplateEditorInner() {
  const params = useParams();
  const router = useRouter();
  const urlKey = params.key as string;
  const isNew = urlKey === "new";
  const { me, loading: meLoading } = useMe();

  const [templateKey, setTemplateKey] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [resultViewControls, setResultViewControls] = useState<
    { data: string; title: string; visibleExpression?: string; plainText?: boolean }[]
  >([]);
  const [templatePermissions, setTemplatePermissions] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (!meLoading && me && !hasPermission(me.permissions, PERMISSIONS.TEMPLATES_WRITE)) {
      router.replace("/");
    }
  }, [meLoading, me, router]);

  useEffect(() => {
    if (isNew) {
      setTemplateKey("");
      setTemplateName("");
      setNodes([]);
      setEdges([]);
      setResultViewControls([]);
      setTemplatePermissions([]);
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
        setResultViewControls(t.resultViewControls ?? []);
        setTemplatePermissions(t.permissions ?? []);
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
        | "automatic"
        | "slack_notify"
        | "script";
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
              : type === "slack_notify"
                ? "Slack notify"
                : type === "script"
                  ? "Script"
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
      const template = flowToTemplate(nodes, edges, key, templateName.trim() || undefined, {
        resultViewControls,
        permissions: templatePermissions,
      });
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
  }, [templateKey, templateName, nodes, edges, resultViewControls, templatePermissions, isNew, router]);

  if (meLoading || (me && !hasPermission(me.permissions, PERMISSIONS.TEMPLATES_WRITE))) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-surface-300 border-t-primary-600"
          aria-hidden
        />
        <p className="text-surface-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-surface-50">
      <header className="flex shrink-0 items-center justify-between border-b border-surface-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/templates"
            className="text-sm text-surface-600 transition hover:text-surface-900"
          >
            ← Templates
          </Link>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Template key"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              className="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            <input
              type="text"
              placeholder="Template name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-56 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-sm text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "ok" && (
            <span className="text-sm text-emerald-600">Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-600">Save failed</span>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving" || !templateKey.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {loadError && !isNew && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
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
            className="template-flow-canvas bg-surface-100"
            defaultEdgeOptions={{ type: "smoothstep" }}
            connectionLineStyle={{ stroke: "rgb(148 163 184)" }}
          >
            <Background gap={16} size={1} color="rgb(203 213 225)" />
            <Controls className="!border-surface-200 !bg-white !shadow-md" />
            <Panel position="top-left" className="rounded-md bg-white/90 px-2 py-1 text-xs text-surface-600 shadow-sm backdrop-blur-sm">
              Drag steps from the left; connect with edges. Select a step to configure.
            </Panel>
          </ReactFlow>
        </div>
        <ConfigPanel
          node={selectedNode ?? null}
          onUpdate={updateNodeData}
          onClose={() => setSelectedNodeId(null)}
          allStepKeys={nodes.map((n) => n.id)}
          resultViewControls={resultViewControls}
          onUpdateResultViewControls={setResultViewControls}
          templatePermissions={templatePermissions}
          onUpdateTemplatePermissions={setTemplatePermissions}
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
          : type === "slack_notify"
            ? "slack_notify"
            : type === "script"
              ? "script"
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
  type: "input" | "condition" | "request" | "automatic" | "slack_notify" | "script",
  _stepKey: string
): Partial<FlowNodeData> {
  if (type === "input") {
    return {
      inputs: [{ key: "field_1", type: "string", title: "Field" }],
      permissions: [],
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
  if (type === "slack_notify") {
    return {
      channelId: "",
      mentionUsers: [],
      messageExpression: "",
      nextStepKey: null,
    };
  }
  if (type === "script") {
    return {
      source: "",
      nextStepKey: null,
    };
  }
  return {
    requestType: "agent",
    prompt: "",
    nextStepKey: null,
  };
}
