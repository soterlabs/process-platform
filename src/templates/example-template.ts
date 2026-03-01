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
      allowedRoles: ["Prime"],
      nextStepKey: "review_description",
      inputs: [
        { key: "description", type: "string", title: "Describe why you need a new Halo" },
      ],
      confirmationMessage: "Thank you. A member of the OEA team will be in touch.",
    },
    {
      key: "review_description",
      type: "input",
      title: "Review Description",
      allowedRoles: ["OEA"],
      nextStepKey: "review_description_condition",
      viewControls: [
        { key: "input_description.description", title: "Description from Prime" },
      ],
      inputs: [
        { key: "description_review_ok", type: "bool", title: "Is the potential new Halo viable?" },
        { key: "description_review", type: "string", title: "Provide feedback for the Prime", visibleExpression: "review_description.description_review_ok === false"},
      ],
    },
    {
      key: "review_description_condition",
      type: "condition",
      title: "Review Description Condition",
      thenStepKey: "input_risk_model_availability",
      elseStepKey: "input_description_retry",
      expression: "review_description.description_review_ok === true",
      nextStepKey: null,
    },
    {
      key: "input_description_retry",
      type: "input",
      title: "Amend Description",
      allowedRoles: ["Prime"],
      nextStepKey: "review_description",
      inputs: [
        { key: "description", type: "string", title: "Describe why you need a new Halo" },
      ],
      confirmationMessage: "Thank you. A member of the OEA team will be in touch.",
    },
    {
      key: "input_risk_model_availability",
      type: "input",
      title: "Indicate Risk Model Availability",
      allowedRoles: ["RiskCouncil"],
      nextStepKey: null,
      inputs: [
        { key: "description", type: "dropdown", title: "Is a risk model available?", values: ["Not Available", "Partially Available", "Available"] },
      ]
    },
   
  ],
  allowedRoles:  ["Prime"],
};
