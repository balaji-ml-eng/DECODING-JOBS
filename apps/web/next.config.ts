import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // The dev-only badge sits on top of the phone tab bar and the map controls.
  devIndicators: false,
};

export default nextConfig;
