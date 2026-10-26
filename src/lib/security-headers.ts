// Response headers for every page and route, set in next.config.ts. Plain module (no
// "server-only") so next.config.ts can import it.
//
// The Content-Security-Policy has no nonces: a nonce needs every page rendered per
// request, and the catalog is static (prerendered shells, `cacheComponents`). So
// scripts allow 'unsafe-inline', for the inline scripts Next.js writes into each page,
// and the policy's work is in everything else: scripts only from this site and
// Cloudflare Turnstile, no plugins, no <base> changes, forms posting only here, no
// framing by other sites, and no requests to any other host.

/** Cloudflare Turnstile (the spam check on public forms): its script and iframe. */
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

export type HeaderOptions = {
  /** `next dev` needs eval for React's debugging tools. */
  development: boolean;
  /** The site's public origin. On https, browsers are told to use nothing else. */
  siteUrl: string;
};

export function contentSecurityPolicy({ development, siteUrl }: HeaderOptions): string {
  const https = new URL(siteUrl).protocol === "https:";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(development ? ["'unsafe-eval'"] : []),
      TURNSTILE_ORIGIN,
    ],
    // React and next/font write inline styles.
    "style-src": ["'self'", "'unsafe-inline'"],
    // blob: for the previews of photos picked for upload.
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", TURNSTILE_ORIGIN],
    "frame-src": [TURNSTILE_ORIGIN],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** Headers for every response. Private pages add their own on top (next.config.ts). */
export function securityHeaders(options: HeaderOptions): { key: string; value: string }[] {
  const https = new URL(options.siteUrl).protocol === "https:";
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // Two years, the HSTS preload list's minimum. Only over https: on http://localhost
    // browsers ignore it anyway.
    ...(https
      ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
      : []),
    { key: "X-Content-Type-Options", value: "nosniff" },
    // For browsers without frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: ["camera=()", "microphone=()", "geolocation=()", "payment=()", "usb=()"].join(", "),
    },
    // wa.me and other links open in their own browsing context, with no handle back here.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
