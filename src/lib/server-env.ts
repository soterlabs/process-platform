/**
 * Server-only env reads using a dynamic key so Next.js does not inline
 * `process.env.FOO` at build time. Build-time inlining can bake in empty values
 * when secrets are injected only at container/runtime (e.g. Docker, some CI).
 */
export function serverEnv(name: string): string {
  return process.env[name] ?? "";
}
