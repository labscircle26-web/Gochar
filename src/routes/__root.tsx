import { lazy, Suspense } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { PwaRegister } from "@/components/pwa-register";

const SolarBackdrop = lazy(() =>
  import("@/components/solar-backdrop").then((mod) => ({ default: mod.SolarBackdrop })),
);
import appCss from "../styles.css?url";

const APP_NAME = "Gochar";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Vedic sidereal transits with planetary degrees and the lagna for any moment — past or future.",
      },
      { name: "theme-color", content: "#190044" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png", sizes: "192x192" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/gochar.webmanifest" },
      { rel: "apple-touch-icon", href: "/gochar-icon-192.png", sizes: "192x192" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <PwaRegister />
        <AuthProvider>
          <Suspense fallback={null}>
            <SolarBackdrop />
          </Suspense>
          <div className="relative z-10">
            <Outlet />
          </div>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
