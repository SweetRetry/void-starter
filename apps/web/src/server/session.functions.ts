import { createServerFn } from "@tanstack/react-start"

import { enabledSocialProviders, getSessionUser } from "./auth.server"

export interface Viewer {
  id: string
  name: string
  email: string
}

/** The signed-in user, or null. The root route loads it once per navigation. */
export const getViewer = createServerFn().handler(async (): Promise<Viewer | null> => {
  const user = await getSessionUser()
  return user ? { id: user.id, name: user.name, email: user.email } : null
})

/** Social providers whose credentials are configured, so the sign-in page shows only working buttons. */
export const getSocialProviders = createServerFn().handler(() => enabledSocialProviders())
