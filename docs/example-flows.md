# Example flows

This document shows three flow patterns using the template and step model from [data-model.md](./data-model.md): linear, branched, and branched-with-merge. All examples use generic step names and types (input, condition, request).

---

## 1. Linear flow (left to right)

A simple sequence of two or three steps with no branching. Each step has a single `nextStepKey`; the flow runs in order until the last step (where `nextStepKey` is `null`).

### Diagram

```
[initial_step]  →  [review_step]  →  [final_step]  →  (end)
     (input)           (input)           (request)
```

### Template summary

| Field | Value |
|-------|--------|
| **key** | `linear_flow` |
| **firstStepKey** | `initial_step` |

### Steps

| Key | Type | Title | nextStepKey |
|-----|------|--------|-------------|
| initial_step | input | Initial data | review_step |
| review_step | input | Review | final_step |
| final_step | request | Finalize | null |

### JSON outline

```json
{
  "key": "linear_flow",
  "name": "Linear three-step flow",
  "firstStepKey": "initial_step",
  "steps": [
    {
      "key": "initial_step",
      "type": "input",
      "title": "Initial data",
      "user": true,
      "nextStepKey": "review_step",
      "inputs": [
        { "key": "payload", "type": "string", "title": "Payload" }
      ]
    },
    {
      "key": "review_step",
      "type": "input",
      "title": "Review",
      "user": true,
      "nextStepKey": "final_step",
      "inputs": [
        { "key": "approved", "type": "bool", "title": "Approved" }
      ]
    },
    {
      "key": "final_step",
      "type": "request",
      "requestType": "agent",
      "title": "Finalize",
      "nextStepKey": null,
      "result": true
    }
  ]
}
```

---

## 2. Branched flow (no merge)

A condition step splits the flow into two paths. Each path runs independently and ends on its own terminal step (or steps). There is no shared step after the branch.

### Diagram

```
                    ┌→ [path_a_step]  →  (end)
[initial_step]  →  [check]  ─┘
     (input)       (condition)
                    └→ [path_b_step]  →  (end)
```

### Template summary

| Field | Value |
|-------|--------|
| **key** | `branched_flow` |
| **firstStepKey** | `initial_step` |

### Steps

| Key | Type | Title | thenStepKey | elseStepKey | nextStepKey |
|-----|------|--------|-------------|-------------|-------------|
| initial_step | input | Initial data | — | — | check |
| check | condition | Route by flag | path_a_step | path_b_step | — |
| path_a_step | request | Path A | — | — | null |
| path_b_step | request | Path B | — | — | null |

The condition uses an expression such as `context.initial_step.use_path_a` (or similar) to choose the branch.

### JSON outline

```json
{
  "key": "branched_flow",
  "name": "Branched flow (no merge)",
  "firstStepKey": "initial_step",
  "steps": [
    {
      "key": "initial_step",
      "type": "input",
      "title": "Initial data",
      "user": true,
      "nextStepKey": "check",
      "inputs": [
        { "key": "use_path_a", "type": "bool", "title": "Use path A" }
      ]
    },
    {
      "key": "check",
      "type": "condition",
      "title": "Route by flag",
      "expression": "context.initial_step.use_path_a",
      "thenStepKey": "path_a_step",
      "elseStepKey": "path_b_step",
      "nextStepKey": null
    },
    {
      "key": "path_a_step",
      "type": "request",
      "requestType": "agent",
      "title": "Path A",
      "nextStepKey": null,
      "result": true
    },
    {
      "key": "path_b_step",
      "type": "request",
      "requestType": "agent",
      "title": "Path B",
      "nextStepKey": null,
      "result": true
    }
  ]
}
```

---

## 3. Branched flow with merge

A condition splits the flow into two branches; each branch then points to the same step(s). All paths converge before one or more common final steps.

### Diagram

```
                    ┌→ [path_a]  ─┐
[initial_step]  →  [check]  ─┘     ├→ [merge_step]  →  [final_step]  →  (end)
     (input)       (condition)     │      (input)          (request)
                    └→ [path_b]  ─┘
```

### Template summary

| Field | Value |
|-------|--------|
| **key** | `branched_merge_flow` |
| **firstStepKey** | `initial_step` |

### Steps

| Key | Type | Title | thenStepKey | elseStepKey | nextStepKey |
|-----|------|--------|-------------|-------------|-------------|
| initial_step | input | Initial data | — | — | check |
| check | condition | Route by flag | path_a | path_b | — |
| path_a | request | Path A | — | — | merge_step |
| path_b | request | Path B | — | — | merge_step |
| merge_step | input | Common review | — | — | final_step |
| final_step | request | Finalize | — | — | null |

Both branches target `merge_step`; from there a single path continues to `final_step`.

### JSON outline

```json
{
  "key": "branched_merge_flow",
  "name": "Branched flow with merge",
  "firstStepKey": "initial_step",
  "steps": [
    {
      "key": "initial_step",
      "type": "input",
      "title": "Initial data",
      "user": true,
      "nextStepKey": "check",
      "inputs": [
        { "key": "use_path_a", "type": "bool", "title": "Use path A" }
      ]
    },
    {
      "key": "check",
      "type": "condition",
      "title": "Route by flag",
      "expression": "context.initial_step.use_path_a",
      "thenStepKey": "path_a",
      "elseStepKey": "path_b",
      "nextStepKey": null
    },
    {
      "key": "path_a",
      "type": "request",
      "requestType": "agent",
      "title": "Path A",
      "nextStepKey": "merge_step"
    },
    {
      "key": "path_b",
      "type": "request",
      "requestType": "agent",
      "title": "Path B",
      "nextStepKey": "merge_step"
    },
    {
      "key": "merge_step",
      "type": "input",
      "title": "Common review",
      "user": true,
      "nextStepKey": "final_step",
      "inputs": [
        { "key": "confirmed", "type": "bool", "title": "Confirmed" }
      ]
    },
    {
      "key": "final_step",
      "type": "request",
      "requestType": "agent",
      "title": "Finalize",
      "nextStepKey": null,
      "result": true
    }
  ]
}
```

---

## Summary

| Pattern | Description |
|--------|-------------|
| **Linear** | Single path: first step → … → last step. Use `nextStepKey` only. |
| **Branched** | Condition splits into two (or more) paths; each path has its own end. Use `thenStepKey` / `elseStepKey`. |
| **Branched + merge** | Condition splits; branch steps share the same `nextStepKey` (merge step), then common steps to the end. |

Flow is always determined by step keys: `firstStepKey` on the template, then each step’s `nextStepKey` (and for conditions, `thenStepKey` / `elseStepKey`). Step order in the `steps` array is for display; execution follows the keys.
