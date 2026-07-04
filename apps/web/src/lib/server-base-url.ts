import { env } from "@ims_pro/env/web";

/** Browser uses localhost. SSR in Docker must use the compose service name. */
export function getServerBaseUrl(): string {
  if (typeof window === "undefined") {
    return (
      process.env.SERVER_INTERNAL_URL ??
      process.env.VITE_SERVER_URL ??
      env.VITE_SERVER_URL
    );
  }

  return env.VITE_SERVER_URL;
}
