import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { COPY, POST_IDS, postLink, postOf, type Lang, type PostId } from "@/components/blog/posts"

const GITHUB_URL = "https://github.com/SweetRetry/void-starter"

/**
 * The bar on every page: brand and post nav on the left, language, GitHub and playground on the
 * right. A blog page passes the post it shows; the post nav and the language switch are links to
 * the other pages, so each one is prerendered and shareable.
 */
export function SiteHeader({ lang, post }: { lang?: Lang; post?: PostId }) {
  return (
    <header className="sticky top-0 z-10 shrink-0 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" className="shrink-0 text-sm font-semibold">
            Void Starter
          </Link>
          {lang && post && (
            <nav aria-label="Articles" className="flex items-center gap-1">
              {POST_IDS.map((id) => (
                <Link
                  key={id}
                  {...postLink(lang, id)}
                  aria-current={id === post ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-sm transition-colors",
                    id === post
                      ? "bg-surface-2 font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {postOf(lang, id).label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {lang && post && (
            <Link
              {...postLink(lang === "en" ? "zh" : "en", post)}
              aria-label={COPY[lang].switchTo.aria}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {COPY[lang].switchTo.label}
            </Link>
          )}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
          </a>
          <Link to="/chat" className={buttonVariants({ size: "sm" })}>
            Playground
          </Link>
        </div>
      </div>
    </header>
  )
}
