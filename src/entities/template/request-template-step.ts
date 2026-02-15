import { TemplateStep } from "./template-step";

export type RequestTemplateStep = TemplateStep & {
  type: "request";
  requestType: "agent";
  prompt?: string;
};