/**
 * Read-only display: ${path} for context lookup, {{ expression }} for JavaScript (step keys, keccak256, generatePayload, Date/Math/JSON).
 */
export type TemplateStepViewControl = {
  data: string;
  title: string;
  visibleExpression?: string;
};
