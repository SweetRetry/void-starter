import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth/minimal"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { redirect } from "@tanstack/react-router"
import { getRequestHeaders } from "@tanstack/react-start/server"
import { db } from "void/db"
import { env } from "void/env"

import * as schema from "../../db/schema"

/** Social providers the app knows how to show. Each turns on only when both credentials exist. */
const socialProviderIds = ["github", "google"] as const

export type SocialProviderId = (typeof socialProviderIds)[number]

function socialCredentials(id: SocialProviderId) {
  const clientId = id === "github" ? env.AUTH_GITHUB_CLIENT_ID : env.AUTH_GOOGLE_CLIENT_ID
  const clientSecret =
    id === "github" ? env.AUTH_GITHUB_CLIENT_SECRET : env.AUTH_GOOGLE_CLIENT_SECRET
  return clientId && clientSecret ? { clientId, clientSecret } : undefined
}

export function enabledSocialProviders(): SocialProviderId[] {
  return socialProviderIds.filter((id) => socialCredentials(id) !== undefined)
}

function createAuth() {
  const github = socialCredentials("github")
  const google = socialCredentials("google")

  return betterAuth({
    appName: "Void Starter",
    secret: env.BETTER_AUTH_SECRET,
    // D1 has no interactive transactions; the adapter runs operations in sequence.
    database: drizzleAdapter(db, { provider: "sqlite", schema, transaction: false }),
    emailAndPassword: { enabled: true },
    socialProviders: {
      ...(github && { github }),
      ...(google && { google }),
    },
    // Must stay last: it forwards Set-Cookie from server functions to the response.
    plugins: [tanstackStartCookies()],
  })
}

let instance: ReturnType<typeof createAuth> | undefined

/** Built on first use, inside a request, where Worker bindings and secrets are available. */
export function getAuth() {
  instance ??= createAuth()
  return instance
}

export async function getSessionUser() {
  const session = await getAuth().api.getSession({ headers: getRequestHeaders() })
  return session?.user ?? null
}

/** For server functions that need a user: the user id, or a redirect to sign-in. */
export async function requireUserId(): Promise<string> {
  const user = await getSessionUser()
  if (!user) throw redirect({ to: "/sign-in" })
  return user.id
}
