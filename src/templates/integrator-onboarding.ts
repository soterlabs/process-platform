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
      completeExpression:
        "trim(input.name).length > 0 && " +
        "trim(input.contractAddress).length > 0 && " +
        "trim(input.contactPlatform).length > 0 && " +
        "trim(input.contact).length > 0 && " +
        "trim(input.agent).length > 0 && " +
        "trim(input.wallet).length > 0",
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
      completeExpression:
        "verification.verifyDataIntegratedIntoTrackingSystems === true && " +
        "verification.verifyPaymentsScheduledInProcessOS === true && " +
        "verification.verifyAtlasEditsRequestedFromFacilitators === true && " +
        "trim(verification.walletTestTransactionHash1).length > 0 && " +
        "trim(verification.walletTestTransactionHash2).length > 0 && " +
        "verification.verifyRunWalletPennyTest === true",
      inputs: [
        {
          key: "verifyDataIntegratedIntoTrackingSystems",
          type: "bool",
          title: "Verify: Data Integrated Into Tracking Systems",
        },
        {
          key: "verifyPaymentsScheduledInProcessOS",
          type: "bool",
          title: "Verify: Payments Scheduled in ProcessOS",
        },
        {
          key: "verifyAtlasEditsRequestedFromFacilitators",
          type: "bool",
          title: "Verify: Atlas Edits Requested From Facilitators",
        },
        {
          key: "walletTestTransactionHash1",
          type: "string",
          title: "Run Wallet Penny Test — Leg 1: Transaction hash",
        },
        {
          key: "walletTestTransactionHash2",
          type: "string",
          title: "Run Wallet Penny Test — Leg 2: Transaction hash",
        },
        {
          key: "verifyRunWalletPennyTest",
          type: "bool",
          title: "Verify: Wallet Penny Test Ran Successfully",
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
    { data: "${input.name}", title: "Partner Project Name" },
    { data: "${input.contractAddress}", title: "Address of the contract that holds USDS" },
    { data: "${input.contact} (${input.contactPlatform})", title: "Contact", },
    { data: "${input.agent}", title: "Sponsoring agent (Spark, Grove, Obex etc)" },
    { data: "${input.wallet}", title: "Integration rewards recipient wallet" },
  ],
};
