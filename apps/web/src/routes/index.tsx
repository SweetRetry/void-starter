import { createFileRoute } from "@tanstack/react-router"
import { Children, isValidElement, type ComponentProps, type ReactNode } from "react"
import { Streamdown } from "streamdown"

import { Toc } from "@/components/blog/toc"
import { SiteHeader } from "@/components/site-header"
import { headingsOf, slugify } from "@/lib/toc"
import post from "../../content/blog.md?raw"

/**
 * The blog post, prerendered to static HTML at build (see `pages` in vite.config.ts). The
 * Markdown lives in content/blog.md.
 */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shipping a chat app on Cloudflare with Void" },
      {
        name: "description",
        content:
          "What it took to put a chat app with D1, R2 and Workers AI on Cloudflare with Void, and the seams I hit on the way.",
      },
    ],
  }),
  component: BlogPost,
})

const headings = headingsOf(post)

/** The plain text of rendered Markdown children, so a heading's id matches its nav entry. */
function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? textOf(child.props.children)
          : ""
    )
    .join("")
}

type Props<Tag extends "h1" | "h2" | "h3" | "p" | "a"> = ComponentProps<Tag> & { node?: unknown }

/** Retry › Articles: text-lg, h1 text-4xl, h2 text-3xl, h3 text-xl. */
const article = {
  h1: ({ node: _, ...props }: Props<"h1">) => (
    <h1 className="text-4xl font-semibold text-balance" {...props} />
  ),
  h2: ({ node: _, children, ...props }: Props<"h2">) => (
    <h2
      id={slugify(textOf(children))}
      className="mt-16 scroll-mt-24 text-3xl font-semibold text-balance"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node: _, children, ...props }: Props<"h3">) => (
    <h3
      id={slugify(textOf(children))}
      className="mt-10 scroll-mt-24 text-xl font-semibold text-balance"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ node: _, ...props }: Props<"p">) => <p className="mt-4" {...props} />,
  a: ({ node: _, ...props }: Props<"a">) => <a className="link text-primary" {...props} />,
}

function BlogPost() {
  return (
    <>
      <SiteHeader />
      {/* The nav sits on the header's left edge; the post runs to the Playground button's. */}
      <div className="mx-auto flex max-w-5xl gap-16 px-4 py-12">
        <aside className="hidden w-54 shrink-0 lg:block">
          <div className="sticky top-24">
            <Toc headings={headings} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 text-lg">
          <p className="mb-6 text-sm text-muted-foreground">Zimin · October 16, 2026</p>
          {/* Below lg the side column is gone, so the nav folds above the post. */}
          <details className="mb-8 rounded-xl bg-card p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-medium">On this page</summary>
            <div className="mt-3">
              <Toc headings={headings} title={false} />
            </div>
          </details>
          <Streamdown components={article} mode="static" controls={{ code: true, table: false }}>
            {post}
          </Streamdown>
        </main>
      </div>
    </>
  )
}
