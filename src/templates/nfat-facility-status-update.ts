import type { Template } from "@/entities/template";

export const nfatFacilityStatusUpdateTemplate: Template = {
  key: "nfat-facility-status-update",
  name: "NFAT Facility Status Update",
  firstStepKey: "input_update",
  allowedRoles: ["GovOps"],
  steps: [
    {
      key: "input_update",
      type: "input",
      title: "Update Facility Status",
      allowedRoles: ["GovOps"],
      nextStepKey: null,
      confirmationMessage:
        "Facility status update recorded. Call PATCH /facilities/{facilityId}/status in the NFAT backend.",
      inputs: [
        {
          key: "facilityId",
          type: "string",
          title: "NFAT Facility ID",
        },
        {
          key: "facilityName",
          type: "string",
          title: "Facility Name (for reference)",
        },
        {
          key: "currentStatus",
          type: "dropdown",
          title: "Current Status",
          values: ["DRAFT", "REGISTERED", "READY_FOR_PHASE_1", "DISABLED"],
        },
        {
          key: "targetStatus",
          type: "dropdown",
          title: "Target Status",
          values: ["REGISTERED", "READY_FOR_PHASE_1", "DISABLED"],
        },
        {
          key: "check_haloAdministered",
          type: "bool",
          title: "Readiness: Halo has ADMINISTERED status",
        },
        {
          key: "check_riskModelRefSet",
          type: "bool",
          title: "Readiness: Risk model ref is set",
        },
        {
          key: "check_contractsPopulated",
          type: "bool",
          title: "Readiness: At least one contract address populated",
        },
        {
          key: "check_hasWhitelistedAttestor",
          type: "bool",
          title: "Readiness: Has whitelisted attestor",
        },
        {
          key: "check_bookExists",
          type: "bool",
          title: "Readiness: Book record exists",
        },
        {
          key: "reason",
          type: "string-multiline",
          title: "Reason for Status Change",
        },
      ],
    },
  ],
  resultViewControls: [
    { data: "${input_update.facilityName}", title: "Facility Name" },
    { data: "${input_update.facilityId}", title: "Facility ID" },
    { data: "${input_update.currentStatus}", title: "Previous Status" },
    { data: "${input_update.targetStatus}", title: "New Status" },
  ],
};
