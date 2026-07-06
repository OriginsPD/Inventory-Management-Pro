import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import { LazyMotion, domAnimation } from "motion/react";
import { ThemeProvider } from "next-themes";

import { AuthProvider } from "@/components/ui/auth-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FeedbackProvider } from "@/components/ui/feedback-provider";

import appCss from "../index.css?url";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },

  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "IMS Pro" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),

  component: RootDocument,
});

function initTheme() {
  if (typeof window === "undefined") return;
  try {
    const rawAccent = localStorage.getItem("ims_theme_accent") || "brand";
    const validAccents = new Set(["brand", "neutral", "slate", "stone"]);
    const savedAccent = validAccents.has(rawAccent) ? rawAccent : "brand";
    if (savedAccent && savedAccent !== "brand") {
      document.documentElement.setAttribute("data-accent", savedAccent);
    } else {
      document.documentElement.removeAttribute("data-accent");
    }

    const savedDensity = localStorage.getItem("ims_layout_density") || "default";
    document.documentElement.classList.toggle("density-compact", savedDensity === "compact");

    const savedTheme = localStorage.getItem("theme") || "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle(
      "dark",
      savedTheme === "dark" || (savedTheme === "system" && prefersDark),
    );
  } catch (e) {
    console.error("Theme initialization failed", e);
  }
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  if (typeof window !== "undefined") {
    initTheme();
  }

  return (
    <ErrorBoundary>
      <LazyMotion features={domAnimation} strict>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <QueryClientProvider client={queryClient}>
              <FeedbackProvider>{children}</FeedbackProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </AuthProvider>
      </LazyMotion>
    </ErrorBoundary>
  );
}

function RootDocument() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>
          <Outlet />
        </AppProviders>
        <TanStackRouterDevtools position="bottom-left" />
        <Scripts />
      </body>
    </html>
  );
}
