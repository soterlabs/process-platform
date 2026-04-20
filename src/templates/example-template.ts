import type { Template } from "@/entities/template";

export const exampleTemplate: Template = {
  key: "new-halo",
  name: "New Halo",
  firstStepKey: "input_description",
  steps: [
    {
      key: "input_description",
      type: "input",
      title: "Provide Description",
      permissions: [],
      nextStepKey: "review_description",
      inputs: [
        { key: "_view_0", type: "string", title: "Feedback from OEA", readOnly: true, defaultValue: "${review_description.description_review}" },
        { key: "description", type: "string", title: "Describe why you need a new Halo" },
      ],
      confirmationMessage: "Thank you. A member of the OEA team will be in touch.",
    },
    {
      key: "review_description",
      type: "input",
      title: "Review Description",
      permissions: [],
      nextStepKey: "review_description_condition",
      inputs: [
        { key: "_view_0", type: "string", title: "Description from Prime", readOnly: true, defaultValue: "${input_description.description}" },
        { key: "description_review_ok", type: "bool", title: "Is the potential new Halo viable?" },
        { key: "description_review", type: "string", title: "Provide feedback for the Prime", visibleExpression: "review_description.description_review_ok === false" },
      ],
    },
    {
      key: "review_description_condition",
      type: "condition",
      title: "Review Description Condition",
      thenStepKey: "input_risk_model_availability",
      elseStepKey: "input_description",
      expression: "review_description.description_review_ok === true",
      nextStepKey: null,
    },
    {
      key: "input_risk_model_availability",
      type: "input",
      title: "Indicate Risk Model Availability",
      permissions: [],
      nextStepKey: "agent_recommendation",
      inputs: [
        { key: "availability", type: "dropdown", title: "Is a risk model available?", values: ["Not Available", "Partially Available", "Available"] },
      ]
    },
    {
      key: "agent_recommendation",
      type: "request",
      requestType: "agent",
      title: "LLM Recommendation",
      nextStepKey: null,
      prompt:
        "You are assisting with new Halo requests. You will receive the Prime's description of why they need a new Halo, OEA's review, and the Risk Council's risk model availability. Write a short recommendation (2–4 sentences): whether to proceed, defer, or request more information, and why. Be concise and practical.",
    },
  ],
  permissions: [],
  resultViewControls: [
    { data: "${agent_recommendation.response}", title: "Recommendation" },
  ],
};
