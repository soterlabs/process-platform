/** User id used when step context is written by automation (automatic / slack_notify / script / request steps), not an API caller. */
export const SYSTEM_STEP_CONTEXT_USER_ID = "system" as const;

export type StepContextAuditEntry = {
  /** ISO-8601 timestamp when the update was persisted. */
  at: string;
  /** Authenticated user who submitted the update, or {@link SYSTEM_STEP_CONTEXT_USER_ID} for system writes. */
  userId: string;
  /** Template step key whose `context[stepKey]` bucket was updated. */
  stepKey: string;
  /** Keys and values merged in this update (same shape as the update payload). */
  updates: Record<string, unknown>;
};
