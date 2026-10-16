import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router"
import { Toaster } from "@workspace/ui/components/sonner"
import { MotionConfig } from "motion/react"
import type { ReactNode } from "react"

import { langOfPath } from "@/components/blog/posts"
import { EASE } from "@/lib/ease"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Void Starter" },
      {
        name: "description",
        content:
          "A chat app on Cloudflare: D1, R2 and Workers AI through AI Gateway, deployed with Void.",
      },
    ],
    links: [
      // Retry: Inter with the opsz axis.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => <Outlet />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  // A Chinese post says so, for fonts, hyphenation and screen readers.
  const lang = useRouterState({ select: (state) => langOfPath(state.location.pathname) })
  return (
    <html lang={lang} className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Retry: one curve and duration for every Motion transition; reduced motion follows the OS. */}
        <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: EASE }}>
          {children}
          <Toaster />
        </MotionConfig>
        <Scripts />
      </body>
    </html>
  )
}
