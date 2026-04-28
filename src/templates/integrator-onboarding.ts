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
      nextStepKey: "notify",
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
    {
      key: "notify",
      type: "slack_notify",
      title: "Notify team",
      channelId: "C0ALDU7QVHP",
      mentionUsers: ["filip@soterlabs.com"],
      messageExpression:
        '"New integrator onboarding request for " + (input.name ?? "") + "\\n• Contact: " + (input.contact ?? "") + " (" + (input.contactPlatform ?? "") + ")\\n\\nYou can view this process by clicking <" + currentProcess.url + "|here>"',
      nextStepKey: "approval",
      confirmationMessage: "Slack notification sent.",
    },
    {
      key: "approval",
      type: "input",
      title: "Review and approve entered information",
      permissions: [],
      nextStepKey: "condition",
      inputs: [
        {
          key: "_view_name",
          type: "string",
          title: "Partner Project Name",
          readOnly: true,
          defaultValue: "${input.name}",
        },
        {
          key: "_view_contract_address",
          type: "string",
          title: "Address of the contract that holds USDS",
          readOnly: true,
          defaultValue: "${input.contractAddress}",
        },
        {
          key: "_view_contact_platform",
          type: "string",
          title: "Contact platform",
          readOnly: true,
          defaultValue: "${input.contactPlatform}",
        },
        {
          key: "_view_contact",
          type: "string",
          title: "Contact (Telegram handle, email address etc)",
          readOnly: true,
          defaultValue: "${input.contact}",
        },
        {
          key: "_view_agent",
          type: "string",
          title: "Sponsoring agent (Spark, Grove, Obex etc)",
          readOnly: true,
          defaultValue: "${input.agent}",
        },
        {
          key: "_view_wallet",
          type: "string",
          title: "Integration rewards recipient wallet",
          readOnly: true,
          defaultValue: "${input.wallet}",
        },
        {
          key: "approved",
          type: "bool",
          title: "Approved",
        },
      ],
    },
    {
      key: "condition",
      type: "condition",
      title: "Approval Obtained",
      nextStepKey: null,
      expression: "approval.approved === true",
      thenStepKey: "verification",
      elseStepKey: "not_approved_end",
    },
    {
      key: "verification",
      type: "input",
      title: "Verification",
      permissions: [],
      nextStepKey: null,
      inputs: [
        {
          key: "verified",
          type: "bool",
          title: "Verification complete",
        },
      ],
    },
    {
      key: "not_approved_end",
      type: "input",
      title: "Process Ended",
      permissions: [],
      nextStepKey: null,
      inputs: [
        {
          key: "status",
          type: "string",
          title: "Status",
          readOnly: true,
          defaultValue: "Not approved - process ended",
        },
      ],
    },
  ],
  resultViewControls: [
    { data: "${input.name}", title: "Partner Name" },
    { data: "${input.contractAddress}", title: "Contract Address" }
  ],
};
