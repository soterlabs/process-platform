import type { Template } from "@/entities/template";

/**
 * Minimal flow demonstrating `file-single` and `file-multiple` inputs.
 * Start at /start/file-upload-example (or create a process from the templates list).
 */
export const fileUploadExampleTemplate: Template = {
  key: "file-upload-example",
  name: "File upload example",
  firstStepKey: "upload",
  permissions: [],
  steps: [
    {
      key: "upload",
      type: "input",
      title: "Upload documents",
      permissions: [],
      nextStepKey: "review",
      inputs: [
        {
          key: "title",
          type: "string",
          title: "Submission title",
        },
        {
          key: "coverDocument",
          type: "file-single",
          title: "Cover document (one file)",
        },
        {
          key: "supportingDocuments",
          type: "file-multiple",
          title: "Supporting documents (multiple files)",
        },
        {
          key: "notes",
          type: "string-multiline",
          title: "Notes (optional)",
        },
      ],
      confirmationMessage: "Files saved. Continue to the review step to confirm.",
    },
    {
      key: "review",
      type: "input",
      title: "Review uploads",
      permissions: [],
      nextStepKey: null,
      inputs: [
        {
          key: "_view_title",
          type: "string",
          title: "Title",
          readOnly: true,
          defaultValue: "${upload.title}",
        },
        {
          key: "_view_cover",
          type: "file-single",
          title: "Cover document",
          readOnly: true,
          defaultValue: "${upload.coverDocument}",
        },
        {
          key: "_view_supporting",
          type: "file-multiple",
          title: "Supporting documents",
          readOnly: true,
          defaultValue: "${upload.supportingDocuments}",
        },
        {
          key: "_view_notes",
          type: "string-multiline",
          title: "Notes",
          readOnly: true,
          defaultValue: "${upload.notes}",
        },
        {
          key: "confirmed",
          type: "bool",
          title: "I have reviewed the uploaded files",
        },
      ],
      completeExpression: "review.confirmed === true",
    },
  ],
  resultViewControls: [
    { data: "${upload.title}", title: "Title" },
    { data: "${upload.coverDocument}", title: "Cover document" },
    { data: "${upload.supportingDocuments}", title: "Supporting documents" },
    { data: "${upload.notes}", title: "Notes", plainText: true },
  ],
};
