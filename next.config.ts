import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  devIndicators: false,
  headers: async () => [
    {
      // Clip filenames are content hashes (scripts/gen_course_audio.py), so a clip never
      // changes under its name — cache it in the browser and at the edge indefinitely.
      source: "/audio/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/api/(.*)",
      headers: [
        {
          key: "Access-Control-Allow-Origin",
          value: "*",
        },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET, POST, PUT, DELETE, OPTIONS",
        },
        {
          key: "Access-Control-Allow-Headers",
          value: "Content-Type, Authorization",
        },
        {
          key: "Content-Range",
          value: "bytes : 0-9/*",
        },
      ],
    },
  ],
};

export default nextConfig;
