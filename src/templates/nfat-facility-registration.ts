import type { Template } from "@/entities/template";

export const nfatFacilityRegistrationTemplate: Template = {
  key: "nfat-facility-registration",
  name: "NFAT Facility Registration",
  firstStepKey: "input_register",
  permissions: ["GovOps"],
  steps: [
    {
      key: "input_register",
      type: "input",
      title: "Register Facility",
      permissions: ["GovOps"],
      nextStepKey: null,
      confirmationMessage:
        "Facility registration recorded. Call POST /facilities/register in the NFAT backend with this data.",
      inputs: [
        // ── Halo ──
        {
          key: "haloId",
          type: "string",
          title: "Halo ID (must have ADMINISTERED status)",
        },

        // ── Facility core ──
        {
          key: "name",
          type: "string",
          title: "Facility Name",
        },
        {
          key: "assetClass",
          type: "dropdown",
          title: "Asset Class",
          values: [
            "CONSUMER_ABS",
            "MORTGAGE",
            "AUTO_LOAN",
            "STUDENT_LOAN",
            "CORPORATE",
            "SME",
            "OTHER",
          ],
        },
        {
          key: "facilityAddress",
          type: "string",
          title: "Facility On-Chain Address",
        },
        {
          key: "initialStatus",
          type: "dropdown",
          title: "Initial Status",
          values: ["DRAFT", "REGISTERED", "READY_FOR_PHASE_1"],
        },

        // ── Risk model ──
        {
          key: "riskModelRef",
          type: "string",
          title: "Risk Model Reference (required for READY_FOR_PHASE_1)",
        },
        {
          key: "riskModelVersion",
          type: "string",
          title: "Risk Model Version",
        },
        {
          key: "riskFrameworkRef",
          type: "string",
          title: "Risk Framework Reference",
        },

        // ── Buy box ──
        {
          key: "buyBox_description",
          type: "string-multiline",
          title: "Buy Box Description",
        },
        {
          key: "buyBox_loanSizeMin",
          type: "number",
          title: "Buy Box: Loan Size Min",
        },
        {
          key: "buyBox_loanSizeMax",
          type: "number",
          title: "Buy Box: Loan Size Max",
        },
        {
          key: "buyBox_durationMinDays",
          type: "number",
          title: "Buy Box: Duration Min (days)",
        },
        {
          key: "buyBox_durationMaxDays",
          type: "number",
          title: "Buy Box: Duration Max (days)",
        },
        {
          key: "buyBox_rateMinBps",
          type: "number",
          title: "Buy Box: Rate Min (bps)",
        },
        {
          key: "buyBox_rateMaxBps",
          type: "number",
          title: "Buy Box: Rate Max (bps)",
        },
        {
          key: "buyBox_collateralTypes",
          type: "string",
          title: "Buy Box: Collateral Types (comma-separated)",
        },
        {
          key: "buyBox_jurisdictions",
          type: "string",
          title: "Buy Box: Jurisdictions (comma-separated)",
        },

        // ── Prime ──
        {
          key: "hasPrime",
          type: "bool",
          title: "Assign a Prime to this facility?",
        },
        {
          key: "primeId",
          type: "string",
          title: "Prime ID",
          visibleExpression: "input_register.hasPrime === true",
        },
        {
          key: "primeType",
          type: "dropdown",
          title: "Prime Type",
          values: ["STAR", "INCUBATOR"],
          visibleExpression: "input_register.hasPrime === true",
        },
        {
          key: "primeAddress",
          type: "string",
          title: "Prime Wallet Address",
          visibleExpression: "input_register.hasPrime === true",
        },
        {
          key: "maxDepositPerDay",
          type: "number",
          title: "Max Deposit Per Day (rate limit)",
          visibleExpression: "input_register.hasPrime === true",
        },

        // ── Attestor ──
        {
          key: "hasAttestor",
          type: "bool",
          title: "Register an attestor at this time?",
        },
        {
          key: "attestorName",
          type: "string",
          title: "Attestor Name",
          visibleExpression: "input_register.hasAttestor === true",
        },
        {
          key: "attestorDescription",
          type: "string",
          title: "Attestor Description",
          visibleExpression: "input_register.hasAttestor === true",
        },
        {
          key: "attestorWalletAddress",
          type: "string",
          title: "Attestor Wallet Address",
          visibleExpression: "input_register.hasAttestor === true",
        },
        {
          key: "attestorJurisdictions",
          type: "string",
          title: "Attestor Jurisdictions (comma-separated)",
          visibleExpression: "input_register.hasAttestor === true",
        },

        // ── Contracts ──
        {
          key: "pauAddress",
          type: "string",
          title: "PAU Contract Address",
        },
        {
          key: "queueAddress",
          type: "string",
          title: "Queue Contract Address",
        },
        {
          key: "redeemAddress",
          type: "string",
          title: "Redeem Contract Address",
        },
        {
          key: "haloClassAddress",
          type: "string",
          title: "Halo Class Contract Address",
        },
        {
          key: "unitStructureAddress",
          type: "string",
          title: "Unit Structure Contract Address",
        },

        // ── Result ──
        {
          key: "nfatFacilityId",
          type: "string",
          title: "NFAT Facility ID (returned from POST /facilities/register)",
        },
      ],
    },
  ],
  resultViewControls: [
    { data: "${input_register.name}", title: "Facility Name" },
    { data: "${input_register.facilityAddress}", title: "Facility Address" },
    { data: "${input_register.initialStatus}", title: "Status" },
    { data: "${input_register.nfatFacilityId}", title: "NFAT Facility ID" },
  ],
};
