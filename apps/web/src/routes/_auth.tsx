import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router"

import { getSocialProviders } from "@/server/session.functions"

/**
 * Sign-in and sign-up share this layout: one centered group, the form beside the artwork.
 * Swap sides by moving the image first.
 */
export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context }) => {
    if (context.viewer) throw redirect({ to: "/notes" })
  },
  loader: () => getSocialProviders(),
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-sm gap-12 lg:max-w-3xl lg:grid-cols-2">
        <div className="flex flex-col">
          <Link to="/" className="link self-start text-sm font-medium">
            Void Starter
          </Link>
          <div className="mt-10">
            <Outlet />
          </div>
        </div>
        {/* Decorative, and only where there is room for it. */}
        <img
          aria-hidden="true"
          src="/auth/verdant-notes-1000.webp"
          srcSet="/auth/verdant-notes-1000.webp 1000w, /auth/verdant-notes-1600.webp 1600w"
          sizes="360px"
          alt=""
          width={1000}
          height={1000}
          decoding="async"
          className="hidden size-full rounded-2xl bg-surface-1 object-cover lg:block"
        />
      </div>
    </main>
  )
}
