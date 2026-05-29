import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next doesn't pick up an unrelated lockfile
  // higher in the file system when inferring the project root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    // SEC-003: Content-Security-Policy. Next 16 + React 19 RSC ships small
    // inline scripts for hydration payloads and route segment data, and Tailwind
    // generates an inline <style> for critical CSS, so 'unsafe-inline' must
    // remain on script-src/style-src here. The nonce-based variant requires
    // proxy.ts (Next 16) which is scheduled in Batch 9.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // SEC-009: X-XSS-Protection is deprecated and can introduce XSS
          // when enabled in modern browsers; explicitly disabled.
          { key: "X-XSS-Protection", value: "0" },
          // SEC-004: HSTS. Two-year max-age, include subdomains, preload-eligible.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
