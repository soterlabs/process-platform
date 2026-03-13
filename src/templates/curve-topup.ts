import type { Template } from "@/entities/template";

export const curveTopupTemplate: Template = {
  key: "curve-topup",
  name: "Curve Topup",
  firstStepKey: "input_description",
  steps: [
    {
      key: "input_description",
      type: "input",
      title: "Provide Description",
      allowedRoles: ["Prime"],
      nextStepKey: "review_description",
      viewControls: [
        { data: "${review_description.description_review}", title: "Feedback from OEA" },
      ],
      inputs: [
        { key: "description", type: "string", title: "Describe why you need a new Halo" },
      ],
      confirmationMessage: "Thank you. A member of the OEA team will be in touch.",
    }
  ],
  allowedRoles: ["Prime"],
  resultViewControls: [
    { data: "${agent_recommendation.response}", title: "Recommendation" },
  ],
};
