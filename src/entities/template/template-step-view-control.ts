/**
 * Read-only display of a value from another step's output (context).
 * key is the context path, e.g. "stepKey.inputKey" → context[stepKey][inputKey].
 */
export type TemplateStepViewControl = {
  key: string;
  title: string;
  visibleExpression?: string;
};
