import type { NextConfig } from 'next';

// No `/api/backend/*` rewrite here: Route Handlers under `src/app/api/backend/`
// proxy every subsystem via `proxyToBackend` (BACKEND_API_URL). A rewrite would
// take precedence over the dynamic `[...path]` handlers and send requests to
// 127.0.0.1:4000, which does not exist in production.
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
