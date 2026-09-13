import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Pin the trace root: stray lockfiles above this directory otherwise make
  // Next infer a workspace root outside the project and mis-trace the bundle.
  outputFileTracingRoot: __dirname,
  transpilePackages: ["gun"],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "microphone=(self)" },
      ],
    },
  ],
  turbopack: {},
  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
        dgram: false,
        dns: false,
        child_process: false,
      },
    };
    return config;
  },
};

export default withPWA(nextConfig);
