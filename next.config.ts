import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // discord.js is a Node-only library; keep it out of the bundler so the
  // bot can boot from instrumentation.ts in the server runtime.
  serverExternalPackages: ["discord.js", "@discordjs/ws", "zlib-sync"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.discordapp.com" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
