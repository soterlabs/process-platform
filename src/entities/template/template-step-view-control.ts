/**
 * Read-only display: ${path} for context lookup, {{ expression }} for JavaScript (context, Date, Math, JSON in scope).
 */
export type TemplateStepViewControl = {
  data: string;
  title: string;
  visibleExpression?: string;
};
