import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The app itself works fully over plain HTTP (no HTTPS required).
  // `allowedDevOrigins` is only needed for the Next.js DEV server when it is
  // reached from a host other than localhost (it does NOT affect production).
  //
  // For local-network (LAN) deployment, the simplest option is to run the
  // production server (`bun run build && bun run start`) — it has no host
  // restrictions and serves plain HTTP on http://<machine-ip>:3000.
  //
  // If you prefer `bun run dev` on the LAN and colleagues connect via
  // http://<machine-ip>:3000, add that host/IP here, e.g.:
  //   allowedDevOrigins: ["*.space-z.ai", "192.168.1.50", "media.internal"],
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
