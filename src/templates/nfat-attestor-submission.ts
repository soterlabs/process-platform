import type { Template } from "@/entities/template";

export const nfatAttestorSubmissionTemplate: Template = {
  key: "nfat-attestor-submission",
  name: "NFAT Attestor Data Submission",
  firstStepKey: "input_submit",
  allowedRoles: ["GovOps"],
  steps: [
    {
      key: "input_submit",
      type: "input",
      title: "Submit Attestor Data",
      allowedRoles: ["GovOps"],
      nextStepKey: null,
      confirmationMessage:
        "Attestor data submission recorded. Call PATCH /attestors/{attestorId}/submit-data in the NFAT backend.",
      inputs: [
        {
          key: "attestorId",
          type: "string",
          title: "Attestor ID",
        },
        {
          key: "attestorName",
          type: "string",
          title: "Attestor Name (for reference)",
        },
        {
          key: "facilityId",
          type: "string",
          title: "Facility ID",
        },
        {
          key: "facilityName",
          type: "string",
          title: "Facility Name (for reference)",
        },
        {
          key: "submittedData",
          type: "string-multiline",
          title: "Submitted Data (JSON)",
        },
        {
          key: "notes",
          type: "string-multiline",
          title: "Submission Notes",
        },
      ],
    },
  ],
  resultViewControls: [
    { data: "${input_submit.attestorName}", title: "Attestor" },
    { data: "${input_submit.facilityName}", title: "Facility" },
  ],
};
