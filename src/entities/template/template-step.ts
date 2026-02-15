export type TemplateStep = {
  key: string;
  title: string;
  type: "input" | "condition" | "request";
  nextStepKey: string | null; 
  result?: boolean;
};
