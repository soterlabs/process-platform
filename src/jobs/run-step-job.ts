/**
 * Standalone entry point for the step execution job. Run as its own process:
 *
 *   npm run job:step
 *
 * Or: npx tsx src/jobs/run-step-job.ts
 *
 * For dev, run this in a separate terminal alongside `npm run dev`.
 * For production, deploy and run this process independently.
 */
import {
  startStepExecutionJob,
  stopStepExecutionJob,
} from "@/jobs/step-execution-job";

startStepExecutionJob();

process.on("SIGINT", () => {
  stopStepExecutionJob();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopStepExecutionJob();
  process.exit(0);
});
