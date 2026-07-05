import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { PageLoader } from "@/components/ui/loading";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 280,
    context: {},
    defaultPendingComponent: () => <PageLoader />,
    defaultNotFoundComponent: () => <div>Not Found</div>,
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
