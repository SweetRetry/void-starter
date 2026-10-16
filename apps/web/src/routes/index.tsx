import { createFileRoute, Link } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/components/button"

export const Route = createFileRoute("/")({
  component: Home,
})

const stack = [
  ["Auth", "Better Auth on D1. Email and password, plus GitHub and Google when configured."],
  ["Database", "D1 with Drizzle. Migrations are checked in and applied on deploy."],
  ["Files", "R2 uploads, scoped to the signed-in user."],
  ["AI", "Workers AI streamed through AI Gateway, with logs and caching."],
] as const

function Home() {
  const { viewer } = Route.useRouteContext()

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-5xl font-semibold text-balance">
        A full-stack app on Cloudflare, deployed in one command.
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">
        TanStack Start, Tailwind and shadcn/ui on the front. Void provisions D1, R2 and AI Gateway
        and ships it with <code className="font-mono text-base">pnpm deploy</code>.
      </p>
      <div className="mt-8 flex gap-2">
        {viewer ? (
          <Link to="/notes" className={buttonVariants({ size: "lg" })}>
            Open your notes
          </Link>
        ) : (
          <>
            <Link to="/sign-up" className={buttonVariants({ size: "lg" })}>
              Create an account
            </Link>
            <Link to="/sign-in" className={buttonVariants({ size: "lg", variant: "ghost" })}>
              Sign in
            </Link>
          </>
        )}
      </div>
      <dl className="mt-16 grid gap-8 sm:grid-cols-2">
        {stack.map(([term, description]) => (
          <div key={term}>
            <dt className="text-sm font-medium">{term}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{description}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
