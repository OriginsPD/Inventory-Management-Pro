import { createAuthClient } from "better-auth/react";

import { getServerBaseUrl } from "@/lib/server-base-url";

export const authClient = createAuthClient({
  baseURL: getServerBaseUrl(),
});
