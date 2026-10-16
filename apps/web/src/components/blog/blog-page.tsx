import { Link } from "@tanstack/react-router"
import { Children, isValidElement, type ComponentProps, type ReactNode } from "react"
import { Streamdown } from "streamdown"

import { Toc } from "@/components/blog/toc"
import { SiteHeader } from "@/components/site-header"
import { slugify } from "@/lib/toc"
import { COPY, POST_IDS, postLink, postOf, type Lang, type PostId } from "./posts"

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

/** Streamdown hands every component its hast `node`; it is dropped before the DOM sees it. */
type Props<Tag extends "h1" | "h2" | "h3" | "p" | "a"> = ComponentProps<Tag> & { node?: unknown }

/** Retry › Articles: text-lg, h1 text-4xl, h2 text-3xl, h3 text-xl. */
const article = {
  h1: ({ node, children, ...props }: Props<"h1">) => (
    <h1 className="text-4xl font-semibold text-balance" {...props}>
      {children}
    </h1>
  ),
  h2: ({ node, children, ...props }: Props<"h2">) => (
    <h2
      id={slugify(textOf(children))}
      className="mt-16 scroll-mt-24 text-3xl font-semibold text-balance"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node, children, ...props }: Props<"h3">) => (
    <h3
      id={slugify(textOf(children))}
      className="mt-10 scroll-mt-24 text-xl font-semibold text-balance"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ node, ...props }: Props<"p">) => <p className="mt-4" {...props} />,
  a: ({ node, children, ...props }: Props<"a">) => (
    <a className="link text-primary" {...props}>
      {children}
    </a>
  ),
}

/** One post in one language. Each pair has its own URL, so each is prerendered and linkable. */
export function BlogPage({ lang, post: id }: { lang: Lang; post: PostId }) {
  const post = postOf(lang, id)
  const copy = COPY[lang]
  const nextId = POST_IDS[(POST_IDS.indexOf(id) + 1) % POST_IDS.length]!
  const next = postOf(lang, nextId)

  return (
    <>
      <SiteHeader lang={lang} post={id} />
      {/* The nav sits on the header's left edge; the post runs to the Playground button's. */}
      <div className="mx-auto flex max-w-5xl gap-16 px-4 py-12">
        <aside className="hidden w-54 shrink-0 lg:block">
          <div className="sticky top-24">
            <Toc headings={post.headings} label={copy.toc} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 text-lg">
          <p className="mb-6 text-sm text-muted-foreground tabular-nums">
            {copy.byline(post.minutes)}
          </p>
          {/* Below lg the side column is gone, so the nav folds above the post. */}
          <details className="mb-8 rounded-xl bg-card p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-medium">{copy.toc}</summary>
            <div className="mt-3">
              <Toc headings={post.headings} title={false} label={copy.toc} />
            </div>
          </details>
          <Streamdown components={article} mode="static" controls={{ code: true, table: false }}>
            {post.markdown}
          </Streamdown>
          <div className="mt-16 rounded-xl bg-card p-4">
            <p className="text-xs text-subtle-foreground">{copy.next}</p>
            <Link
              {...postLink(lang, nextId)}
              className="link mt-1 block text-base font-medium text-primary"
            >
              {next.title}
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
