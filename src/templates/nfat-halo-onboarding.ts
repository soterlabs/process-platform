import type { Template } from "@/entities/template";

export const nfatHaloOnboardingTemplate: Template = {
  key: "nfat-halo-onboarding",
  name: "NFAT Halo Onboarding",
  firstStepKey: "input_onboard",
  permissions: ["GovOps"],
  steps: [
    {
      key: "input_onboard",
      type: "input",
      title: "Onboard Halo",
      permissions: ["GovOps"],
      nextStepKey: null,
      confirmationMessage:
        "Halo onboarding recorded. Call POST /halos and POST /halos/{haloId}/documents in the NFAT backend.",
      inputs: [
        // ── Halo details ──
        {
          key: "name",
          type: "string",
          title: "Halo Name",
        },
        {
          key: "legalEntityName",
          type: "string",
          title: "Legal Entity Name",
        },
        {
          key: "jurisdiction",
          type: "string",
          title: "Jurisdiction",
        },
        {
          key: "atlasStatus",
          type: "dropdown",
          title: "Atlas Status",
          values: ["PENDING", "ADMINISTERED", "REJECTED"],
        },
        {
          key: "admittedAt",
          type: "datetime",
          title: "Admitted At (if ADMINISTERED)",
          visibleExpression: "input_onboard.atlasStatus === 'ADMINISTERED'",
        },

        // ── Documents ──
        {
          key: "fileRef_legal",
          type: "string",
          title: "Legal Documents (articles of incorporation, corporate filings)",
        },
        {
          key: "fileRef_governance",
          type: "string",
          title: "Governance Documents (governance structure, decision-making)",
        },
        {
          key: "fileRef_risk_model",
          type: "string",
          title: "Risk Model Documentation",
        },
        {
          key: "fileRef_technical",
          type: "string",
          title: "Technical Architecture Documentation",
        },
        {
          key: "fileRef_reporting",
          type: "string",
          title: "Reporting Framework Documentation",
        },
        {
          key: "fileRef_economic",
          type: "string",
          title: "Economic / Financial Documentation",
        },

        // ── Result ──
        {
          key: "nfatHaloId",
          type: "string",
          title: "NFAT Halo ID (returned from POST /halos)",
        },
      ],
    },
  ],
  resultViewControls: [
    { data: "${input_onboard.name}", title: "Halo Name" },
    { data: "${input_onboard.legalEntityName}", title: "Legal Entity" },
    { data: "${input_onboard.atlasStatus}", title: "Atlas Status" },
    { data: "${input_onboard.nfatHaloId}", title: "NFAT Halo ID" },
  ],
};
