import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep sharp (native module) out of the bundler so its libvips .so files are
  // traced into the serverless function instead of being inlined and broken.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
