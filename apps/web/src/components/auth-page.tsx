import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import type { SocialProviderId } from "@/server/auth.server"

const providerLabels: Record<SocialProviderId, string> = { github: "GitHub", google: "Google" }

interface AuthPageProps {
  title: string
  providers: SocialProviderId[]
  footer: ReactNode
  children: ReactNode
}

export function AuthPage({ title, providers, footer, children }: AuthPageProps) {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-6 py-16">
      <Link to="/" className="link self-start text-sm text-muted-foreground">
        Void Starter
      </Link>
      <h1 className="mt-2 text-4xl font-semibold text-balance">{title}</h1>
      <div className="mt-8">{children}</div>
      {/* Grouped by space, not a divider line. */}
      {providers.length > 0 ? (
        <div className="mt-8 flex flex-col gap-2">
          {providers.map((provider) => (
            <SocialButton key={provider} provider={provider} />
          ))}
        </div>
      ) : null}
      <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
    </main>
  )
}

function SocialButton({ provider }: { provider: SocialProviderId }) {
  const [pending, setPending] = useState(false)

  async function signIn() {
    setPending(true)
    const result = await authClient.signIn.social({ provider, callbackURL: "/notes" })
    // On success the browser leaves for the provider; only failures come back here.
    if (result.error) {
      toast.error(`${providerLabels[provider]} sign-in didn't start. Try again, or use your email.`)
      setPending(false)
    }
  }

  return (
    <Button variant="secondary" size="lg" disabled={pending} onClick={signIn}>
      Continue with {providerLabels[provider]}
    </Button>
  )
}
