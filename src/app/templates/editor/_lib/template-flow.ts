import type { Node, Edge } from "@xyflow/react";
import type { Template } from "@/entities/template";
import type {
  InputTemplateStep,
  ConditionTemplateStep,
  RequestTemplateStep,
  AutomaticTemplateStep,
} from "@/entities/template";

export type FlowNodeData = {
  stepKey: string;
  type: "input" | "condition" | "request" | "automatic";
  title: string;
  nextStepKey: string | null;
  confirmationMessage?: string;
  // input
  inputs?: {
    key: string;
    type: "bool" | "string" | "dropdown";
    title: string;
    visibleExpression?: string;
    values?: string[];
  }[];
  viewControls?: {
    data: string;
    title: string;
    visibleExpression?: string;
  }[];
  allowedRoles?: string[];
  // condition (required when type === "condition")
  expression?: string;
  thenStepKey?: string;
  elseStepKey?: string;
  // request
  requestType?: "agent";
  prompt?: string;
  // automatic
  contextKey?: string;
};

export function templateToFlow(template: Template): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<FlowNodeData>[] = template.steps.map((step, i) => {
    const data: FlowNodeData = {
      stepKey: step.key,
      type: step.type,
      title: step.title,
      nextStepKey: step.nextStepKey,
      confirmationMessage: step.confirmationMessage,
    };
    if (step.type === "input") {
      data.inputs = step.inputs ?? [];
      data.viewControls = step.viewControls ?? [];
      data.allowedRoles = step.allowedRoles ?? [];
    }
    if (step.type === "condition") {
      const c = step as ConditionTemplateStep;
      data.expression = c.expression;
      data.thenStepKey = c.thenStepKey;
      data.elseStepKey = c.elseStepKey;
    }
    if (step.type === "request") {
      data.requestType = step.requestType ?? "agent";
      data.prompt = step.prompt;
    }
    if (step.type === "automatic") {
      const auto = step as AutomaticTemplateStep;
      data.contextKey = auto.contextKey;
      data.expression = auto.expression;
    }
    const position =
      step.editorProperties != null
        ? { x: step.editorProperties.X, y: step.editorProperties.Y }
        : { x: 80 + i * 280, y: 80 };
    return {
      id: step.key,
      type: step.type,
      position,
      data,
    };
  });

  const edges: Edge[] = [];
  for (const step of template.steps) {
    if (step.type === "condition") {
      const c = step as ConditionTemplateStep;
      if (c.thenStepKey) {
        edges.push({
          id: `${step.key}-then-${c.thenStepKey}`,
          source: step.key,
          target: c.thenStepKey,
          sourceHandle: "then",
        });
      }
      if (c.elseStepKey) {
        edges.push({
          id: `${step.key}-else-${c.elseStepKey}`,
          source: step.key,
          target: c.elseStepKey,
          sourceHandle: "else",
        });
      }
    } else if (step.nextStepKey) {
      edges.push({
        id: `${step.key}-${step.nextStepKey}`,
        source: step.key,
        target: step.nextStepKey,
      });
    }
  }

  return { nodes, edges };
}

export type TemplateOverrides = {
  resultViewControls?: { data: string; title: string; visibleExpression?: string }[];
  allowedRoles?: string[];
};

export function flowToTemplate(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  key: string,
  name?: string,
  overrides?: TemplateOverrides
): Template {
  const steps: (InputTemplateStep | ConditionTemplateStep | RequestTemplateStep | AutomaticTemplateStep)[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const incoming = new Map<string, number>();
  nodes.forEach((n) => incoming.set(n.id, 0));
  edges.forEach((e) => {
    if (nodeIds.has(e.target)) {
      incoming.set(e.target as string, (incoming.get(e.target as string) ?? 0) + 1);
    }
  });
  const firstStepKey =
    nodes.find((n) => incoming.get(n.id) === 0)?.id ?? nodes[0]?.id ?? "";

  for (const node of nodes) {
    const d = node.data;
    const outEdges = edges.filter((e) => e.source === node.id);
    const nextEdge = outEdges.find((e) => !e.sourceHandle || e.sourceHandle === "next");
    const thenEdge = outEdges.find((e) => e.sourceHandle === "then");
    const elseEdge = outEdges.find((e) => e.sourceHandle === "else");

    const editorProperties = {
      X: Math.round(node.position.x),
      Y: Math.round(node.position.y),
    };
    if (d.type === "input") {
      steps.push({
        key: d.stepKey,
        type: "input",
        title: d.title,
        inputs: d.inputs ?? [],
        viewControls: d.viewControls ?? [],
        allowedRoles: d.allowedRoles ?? [],
        nextStepKey: nextEdge?.target ? (nextEdge.target as string) : null,
        confirmationMessage: d.confirmationMessage,
        editorProperties,
      });
    } else if (d.type === "condition") {
      steps.push({
        key: d.stepKey,
        type: "condition",
        title: d.title,
        expression: d.expression ?? "",
        thenStepKey: (thenEdge?.target as string) ?? d.thenStepKey ?? "",
        elseStepKey: (elseEdge?.target as string) ?? d.elseStepKey ?? "",
        nextStepKey: nextEdge?.target ? (nextEdge.target as string) : null,
        confirmationMessage: d.confirmationMessage,
        editorProperties,
      });
    } else if (d.type === "automatic") {
      steps.push({
        key: d.stepKey,
        type: "automatic",
        title: d.title,
        contextKey: d.contextKey ?? "",
        expression: d.expression ?? "",
        nextStepKey: nextEdge?.target ? (nextEdge.target as string) : null,
        confirmationMessage: d.confirmationMessage,
        editorProperties,
      });
    } else {
      steps.push({
        key: d.stepKey,
        type: "request",
        requestType: "agent",
        title: d.title,
        prompt: d.prompt,
        nextStepKey: nextEdge?.target ? (nextEdge.target as string) : null,
        confirmationMessage: d.confirmationMessage,
        editorProperties,
      });
    }
  }

  return {
    key,
    name: name || undefined,
    firstStepKey,
    steps,
    allowedRoles: overrides?.allowedRoles ?? [],
    resultViewControls: overrides?.resultViewControls,
  };
}
