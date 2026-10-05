import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: `output: "standalone"` is intentionally REMOVED.
  // It caused `EINVAL: copyfile` on Windows because Next.js traces node
  // built-ins into chunk files named like `[externals]_node:fs_promises...js`,
  // and the `:` character is illegal in Windows filenames. Standard
  // `next build` + `next start` is used instead (no standalone tracing).
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // The app works fully over plain HTTP (no HTTPS required).
  // `allowedDevOrigins` is only needed for the Next.js DEV server when it is
  // reached from a host other than localhost (it does NOT affect production).
  //
  // For LAN deployment: `npm run build` then `npm run start` — the production
  // server (`next start`) binds to 0.0.0.0:3000 and serves plain HTTP, so
  // colleagues access http://<machine-ip>:3000.
  //
  // If using `npm run dev` on the LAN and colleagues connect directly, add
  // that host/IP here, e.g.:
  //   allowedDevOrigins: ["*.space-z.ai", "192.168.1.50", "media.internal"],
  allowedDevOrigins: ["*.space-z.ai"],
};

export default nextConfig;
