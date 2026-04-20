import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "public/materials/**/*",
      ".venv/**/*",
      "scripts/**/*",
    ],
  },
};

export default nextConfig;
