import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the sandbox preview gateway (e.g. preview-chat-*.space-z.ai) to talk
  // to the dev server without being treated as a cross-origin / unauthorized origin.
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
