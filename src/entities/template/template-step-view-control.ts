/**
 * Read-only display of a value from another step's output (context).
 * data is shown as-is, except ${context.path} is resolved to the context value, e.g. "${stepKey.inputKey}".
 */
export type TemplateStepViewControl = {
  data: string;
  title: string;
  visibleExpression?: string;
};
