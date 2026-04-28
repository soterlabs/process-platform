export type TemplateStep = {
  key: string;
  title: string;
  type: "input" | "condition" | "request" | "automatic" | "slack_notify";
  nextStepKey: string | null;
  confirmationMessage?: string;
  editorProperties?: {
    X: number;
    Y: number;
    description?: string;
  };
};
