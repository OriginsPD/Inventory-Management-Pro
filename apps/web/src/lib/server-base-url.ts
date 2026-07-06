import { env } from "@ims_pro/env/web";

function normalizeLocalhost(url: string): string {
  return url.replace(/\/\/localhost\b/g, "//127.0.0.1");
}

/** Browser uses same-origin proxy in dev. SSR uses loopback to reach API. */
export function getServerBaseUrl(): string {
  if (typeof window === "undefined") {
    const raw =
      process.env.SERVER_INTERNAL_URL ??
      process.env.VITE_SERVER_URL ??
      env.VITE_SERVER_URL ??
      "http://127.0.0.1:3002";
    return normalizeLocalhost(raw);
  }

  if (import.meta.env.DEV) {
    return "";
  }

  return env.VITE_SERVER_URL;
}
