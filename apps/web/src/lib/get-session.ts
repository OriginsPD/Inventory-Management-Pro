import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { authClient } from "@/lib/auth-client";

export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await authClient.getSession({
    fetchOptions: { headers },
  });
  return session.data ?? null;
});
