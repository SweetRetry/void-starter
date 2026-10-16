import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/components/button"

/** The bar on every page: the blog's name on the left, the playground on the right. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 shrink-0 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="text-sm font-medium">
          Void Starter
        </Link>
        <Link to="/chat" className={buttonVariants({ size: "sm" })}>
          Playground
        </Link>
      </div>
    </header>
  )
}
