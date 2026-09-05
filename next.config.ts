import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  devIndicators: false,
  // 로컬 검증용: localhost 쿠키가 겹치는 다른 dev 서버와 충돌하지 않도록 127.0.0.1로 접속할 때 허용
  allowedDevOrigins: ["127.0.0.1"],
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
