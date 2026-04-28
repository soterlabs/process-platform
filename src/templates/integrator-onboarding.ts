import type { Template } from "@/entities/template";

export const integrationBoostOnboardingTemplate: Template = {
  key: "integrator-onboarding",
  name: "Onboard Integration Boost Partner",
  firstStepKey: "input",
  permissions: [],
  steps: [
    {
      key: "input",
      type: "input",
      title: "Enter Integration Boost Information",
      permissions: [],
      nextStepKey: null,
      inputs: [
        {
          key: "name",
          type: "string",
          title: "Partner Project Name",
        },
        {
          key: "contractAddress",
          type: "string",
          title: "Address of the contract that holds USDS",
        },
        {
          key: "contactPlatform",
          type: "dropdown",
          values: ["Telegram", "Email", "Signal", "Slack", "Other"],
          title: "Contact platform",
        },
        {
          key: "contact",
          type: "string",
          title: "Contact (Telegram handle, email address etc)",
        },
        {
          key: "agent",
          type: "string",
          title: "Sponsoring agent (Spark, Grove, Obex etc)",
        },
        {
          key: "wallet",
          type: "string",
          title: "Integration rewards recipient wallet",
        },
      ],
    },
  ],
  resultViewControls: [
    { data: "${input.name}", title: "Partner Name" },
    { data: "${input.contractAddress}", title: "Contract Address" }
  ],
};
