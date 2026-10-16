import { getCookie, setCookie } from "@tanstack/react-start/server"
import { z } from "zod"

/**
 * A visitor is a random id in an HttpOnly cookie: no sign-up, no fingerprinting. It lets a
 * browser find its own chats again, and it is lost with the browser's cookies.
 */
const COOKIE = "visitor"
const ONE_YEAR = 60 * 60 * 24 * 365

const visitorCookie = z.uuid()

/** The visitor id from the request, if the browser has one. */
export function currentVisitor(): string | undefined {
  const value = getCookie(COOKIE)
  return visitorCookie.safeParse(value).success ? value : undefined
}

/** The visitor id from the request, or a new one set on the response. */
export function ensureVisitor(): string {
  const existing = currentVisitor()
  if (existing) return existing
  const id = crypto.randomUUID()
  setCookie(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: ONE_YEAR,
  })
  return id
}
