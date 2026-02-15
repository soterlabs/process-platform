/**
 * OpenAPI spec for Process Platform API. Served at /docs via Swagger UI.
 */
export const openApiSpec = {
  openapi: "3.0.0",
  info: { title: "Process Platform API", description: "Process instances with steps identified by string keys", version: "1.0.0" },
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
                    currentStepKey: { type: "string", nullable: true },
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
        description: "Get complete instance state (template, currentStepKey, context, status).",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Process instance state" },
          "404": { description: "Process not found" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/process/{id}/steps/{stepKey}": {
      put: {
        summary: "Update step state",
        description: "Update a step's state without advancing. Body merged into context[stepKey].",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "stepKey", in: "path", required: true, schema: { type: "string" } },
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
    },
    "/api/process/{id}/steps/{stepKey}/complete": {
      post: {
        summary: "Complete step and advance",
        description: "Update step state and advance to next step. Returns next step key (or null if completed).",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "stepKey", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", description: "Step result/state to store; also updates the step before advancing" },
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
