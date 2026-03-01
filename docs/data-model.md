# Data model: templates and steps

This document describes the template and template-step types used to define processes, and illustrates them with the example risk-assessment flow.

---

## Template

A **template** is the definition of a process: a key, optional name, the entry step, and an ordered list of steps.

| Field           | Type     | Required | Description |
|-----------------|----------|----------|-------------|
| `key`           | `string` | Yes      | Unique identifier for the template (e.g. used in URLs and to start a process). |
| `name`          | `string` | No       | Human-readable name. |
| `firstStepKey`  | `string` | Yes      | Key of the first step to run (must match a step in `steps`). |
| `steps`         | array    | Yes      | List of step definitions. Order matters for display; flow is determined by each step’s `nextStepKey` (and for conditions, `thenStepKey` / `elseStepKey`). |

Each item in `steps` is one of: **input**, **condition**, or **request**.

---

## Base step (TemplateStep)

All steps share these fields:

| Field          | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `key`          | `string` | Yes      | Unique identifier for this step within the template. |
| `title`        | `string` | Yes      | Label shown in the UI (e.g. progress indicator, step heading). |
| `type`         | `"input" \| "condition" \| "request"` | Yes | Step kind; determines behavior and extra fields. |
| `nextStepKey`  | `string \| null` | Yes | Key of the next step after this one completes, or `null` if this is the last step. |
| `result`       | `boolean`| No       | *(Used on request steps.)* If `true`, the step’s output is also written to the process-level `result` and shown on the completion screen. |

---

## Step type: input

An **input** step collects data from the user or from the system.

| Field   | Type     | Required | Description |
|---------|----------|----------|-------------|
| `user`  | `boolean`| Yes      | If `true`, the UI shows a form for this step; if `false`, the step is non-interactive (e.g. system-only). |
| `inputs`| array    | Yes      | List of field definitions (see below). |

### TemplateStepInput (input fields)

| Field  | Type                | Required | Description |
|--------|---------------------|----------|-------------|
| `key`  | `string`            | Yes      | Key used to store the value in process context. |
| `type` | `"bool" \| "string"`| Yes      | Rendered as checkbox (`bool`) or text input (`string`). |
| `title`| `string`            | Yes      | Label shown next to the field. |

---

## Step type: condition

A **condition** step branches the flow based on an expression evaluated against the current context.

| Field         | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `expression`  | `string` | No       | Path into the context (e.g. `context.collect_input.someKey`) used to decide the branch. |
| `thenStepKey` | `string` | No       | Next step when the expression is truthy. |
| `elseStepKey` | `string` | No       | Next step when the expression is falsy. |

If the condition doesn’t resolve a branch, `nextStepKey` is used as fallback.

**Planned:** The `expression` on the condition step will support logical operators (AND, OR, XOR) so multiple context values can be combined in one condition; this is not implemented yet.

---

## Step type: request

A **request** step calls an external agent (e.g. an LLM) with the current context. Used for “agent” automation.

| Field        | Type     | Required | Description |
|--------------|----------|----------|-------------|
| `requestType`| `"agent"`| Yes      | Only `"agent"` is supported; triggers an LLM call. |
| `prompt`     | `string` | No       | System prompt sent to the agent. All prior step outputs (context) are sent as the user message. |
| `result`     | `boolean`| No       | If `true`, the agent’s response is also stored in the process `result` and shown on the completion screen. |

Request steps run asynchronously: after the previous step completes, the API advances to the request step and returns; the agent runs in the background. The frontend shows a waiting state and polls until the process moves on or completes.

---

## Example template: Risk Assessment Flow

The built-in example is the **risk_flow** template. It has two steps: a user questionnaire, then an agent that decides between SA and IMA paths from the answers.

### Template-level

- **key:** `risk_flow`
- **name:** `"Example Risk Assessment Flow"`
- **firstStepKey:** `collect_input`

### Step 1: `collect_input` (input)

- **type:** `input`
- **title:** `"Initial Questionnaire"`
- **user:** `true` → user sees a form
- **nextStepKey:** `process_input`
- **inputs:** Four boolean (yes/no) questions:
  1. **market_prices** – Do you have observable market prices from a verifiable source?
  2. **250_days** – Do you have ≥250 business days of price data (daily or convertible)?
  3. **rfet** – Do key risk factors pass RFET (or have valid proxy with R² ≥ 0.75)?
  4. **backtest** – Can you run IMA governance (backtesting + P&L attribution)?

Values are stored in process context under `collect_input` and passed to the next step.

### Step 2: `process_input` (request)

- **type:** `request`
- **requestType:** `agent`
- **title:** `"Input Processing"`
- **nextStepKey:** `null` (last step)
- **prompt:** Instructions for the agent to decide which path to use (SA if any answer is false, otherwise IMA) and to give a short summary.
- **result:** `true` → the agent’s reply is written to the process `result` and shown on the “Process completed” screen.

Flow: user fills the questionnaire → clicks Continue → UI shows a spinner for step 2 → backend runs the agent in the background → when the agent finishes, the process is completed and the result is displayed.

---

## JSON outline of the example template

```json
{
  "key": "risk_flow",
  "name": "Example Risk Assessment Flow",
  "firstStepKey": "collect_input",
  "steps": [
    {
      "key": "collect_input",
      "type": "input",
      "title": "Initial Questionnaire",
      "user": true,
      "nextStepKey": "process_input",
      "inputs": [
        { "key": "market_prices", "type": "bool", "title": "Q1: ..." },
        { "key": "250_days", "type": "bool", "title": "Q2: ..." },
        { "key": "rfet", "type": "bool", "title": "Q3: ..." },
        { "key": "backtest", "type": "bool", "title": "Q4: ..." }
      ]
    },
    {
      "key": "process_input",
      "type": "request",
      "requestType": "agent",
      "title": "Input Processing",
      "prompt": "Decide which path to use: ...",
      "nextStepKey": null,
      "result": true
    }
  ]
}
```
