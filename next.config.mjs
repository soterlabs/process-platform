/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow importing from src (process, etc.)
  transpilePackages: [],
  experimental: {
    /** Required for `src/instrumentation.ts` `register()` on `next start` (e.g. Railway). */
    instrumentationHook: true,
  },
};

export default nextConfig;
