import { getRouteApi } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { type ReactNode, useState } from "react"

import { authClient } from "@/lib/auth-client"
import type { SocialProviderId } from "@/server/auth.server"

const authRoute = getRouteApi("/_auth")

const providerLabels: Record<SocialProviderId, string> = { github: "GitHub", google: "Google" }

interface AuthPageProps {
  title: string
  description: string
  footer: ReactNode
  children: ReactNode
}

/** One auth screen: heading, social sign-in when configured, the email form, then the way out. */
export function AuthPage({ title, description, footer, children }: AuthPageProps) {
  const providers = authRoute.useLoaderData()

  return (
    <>
      <h1 className="text-4xl font-semibold text-balance">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {providers.length > 0 ? (
        <>
          <div className="mt-8 flex flex-col gap-2">
            {providers.map((provider) => (
              <SocialButton key={provider} provider={provider} />
            ))}
          </div>
          {/* Grouped by space, not a divider line. */}
          <p className="mt-6 text-xs text-muted-foreground">Or use your email</p>
        </>
      ) : null}
      <div className={providers.length > 0 ? "mt-4" : "mt-8"}>{children}</div>
      <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
    </>
  )
}

function SocialButton({ provider }: { provider: SocialProviderId }) {
  const [state, setState] = useState<"idle" | "pending" | "failed">("idle")
  const label = providerLabels[provider]

  async function signIn() {
    setState("pending")
    const result = await authClient.signIn.social({ provider, callbackURL: "/notes" })
    // On success the browser leaves for the provider; only failures come back here.
    if (result.error) setState("failed")
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" size="lg" disabled={state === "pending"} onClick={signIn}>
        {state === "pending" ? `Opening ${label}…` : `Continue with ${label}`}
      </Button>
      {state === "failed" ? (
        <p role="alert" className="text-sm text-destructive">
          {label} sign-in didn't start. Try again, or use your email.
        </p>
      ) : null}
    </div>
  )
}
