import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['routeros-client', 'node-routeros'],
};

export default nextConfig;
