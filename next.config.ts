import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" dev badge; it covers the narrow side panel.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
