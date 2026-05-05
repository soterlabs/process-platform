/**
 * OpenAPI spec for Process Platform API. Served at /docs via Swagger UI.
 */
export const openApiSpec = {
  openapi: "3.0.0",
  info: { title: "Process Platform API", description: "Process instances with steps identified by step id (unique per step instance).", version: "1.0.0" },
  servers: [{ url: "/", description: "Current origin" }],
  paths: {
    "/api/process": {
      get: {
        summary: "List process",
        description: "Returns all current process (debug).",
        responses: {
          "200": { description: "Array of process" },
          "500": { description: "Server error" },
        },
      },
      post: {
        summary: "Create process instance",
        description: "Create a new instance from a template. Send template (with key) to register and use, or templateKey to use an already-registered template.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  templateKey: { type: "string", description: "Key to look up existing template (when template body not provided)" },
                  template: {
                    type: "object",
                    required: ["key", "firstStepKey", "steps"],
                    properties: {
                      key: { type: "string", description: "Template key; used for registry and lookups" },
                      name: { type: "string" },
                      firstStepKey: { type: "string", description: "Key of the entry step" },
                      steps: {
                        type: "array",
                        minItems: 1,
                        items: {
                          type: "object",
                          required: ["key", "type", "nextStepKey"],
                          properties: {
                            key: { type: "string", description: "Step key" },
                            type: { enum: ["agent", "user_input", "condition"] },
                            nextStepKey: { type: "string", nullable: true, description: "Next step key; null for last step" },
                            agentUrl: { type: "string" },
                            task: { type: "string" },
                            inputKey: { type: "string", description: "User input key (user_input step)" },
                            prompt: { type: "string" },
                            expression: { type: "string" },
                            thenStepKey: { type: "string" },
                            elseStepKey: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Instance created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    processId: { type: "string" },
                    steps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          processId: { type: "string" },
                          stepKey: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Bad request" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/process/{id}": {
      get: {
        summary: "Get process state",
        description: "Get complete instance state (template, steps, context, status). Current step is the last step in steps.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Process instance state" },
          "404": { description: "Process not found" },
          "500": { description: "Server error" },
        },
      },
      delete: {
        summary: "Hard-delete process instance",
        description:
          "Permanently removes the process from storage. Requires Auth0 permission processes:delete.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Deleted" },
          "401": { description: "Unauthorized" },
          "403": { description: "Missing processes:delete" },
          "404": { description: "Process not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/process/{id}/audit": {
      get: {
        summary: "Get full process state (audit)",
        description:
          "Returns persisted process instance JSON including audit fields (e.g. stepContextAudit). Requires Auth0 permission processes:audit.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Full process state" },
          "401": { description: "Unauthorized" },
          "403": { description: "Missing processes:audit" },
          "404": { description: "Process not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/process/{id}/steps/{stepId}": {
      put: {
        summary: "Update step state",
        description:
          "Update a step instance's state without advancing. Body merged into context[stepKey] (context is keyed by template step key). Each non-empty body is appended to process.stepContextAudit with at, userId, stepKey, and updates.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "stepId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": { schema: { type: "object" } },
          },
        },
        responses: {
          "200": { description: "Updated" },
          "404": { description: "Process or step not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/templates/{key}": {
      get: {
        summary: "Get process definition by key",
        description: "Returns the template (process definition) for the given key.",
        parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Process definition (template)" },
          "404": { description: "Process definition not found" },
          "500": { description: "Server error" },
        },
      },
      put: {
        summary: "Save template",
        description: "Stores the template in the template store. Body must be a full template; key in body must match path.",
        parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["key", "firstStepKey", "steps"],
                properties: {
                  key: { type: "string" },
                  name: { type: "string" },
                  firstStepKey: { type: "string" },
                  steps: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Template saved" },
          "400": { description: "Bad request (e.g. key mismatch)" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/process/{id}/abandon": {
      post: {
        summary: "Complete process (abandon)",
        description: "Marks a running process as completed. Only processes with status 'running' can be completed.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Process completed; returns updated process state" },
          "400": { description: "Process is not running (e.g. already completed)" },
          "404": { description: "Process not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/process/{id}/steps/{stepId}/complete": {
      post: {
        summary: "Complete step and advance",
        description: "Optionally update step state (via body), then complete the step instance and advance. Use step id from process.steps (current step is last in array). Returns next step key (or null if completed).",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "stepId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", description: "Optional step state to persist before advancing; if provided, applied via updateStep then advance" },
            },
          },
        },
        responses: {
          "200": {
            description: "Step completed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    nextStepKey: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          "404": { description: "Process or step not found" },
          "500": { description: "Server error" },
        },
      },
    },
  },
} as const;
