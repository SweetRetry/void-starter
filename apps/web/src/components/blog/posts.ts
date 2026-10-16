import { linkOptions } from "@tanstack/react-router"

import { headingsOf, readingMinutes, type Heading } from "@/lib/toc"
import cloudEn from "../../../content/blog.md?raw"
import cloudZh from "../../../content/blog.zh.md?raw"
import harnessEn from "../../../content/harness.md?raw"
import harnessZh from "../../../content/harness.zh.md?raw"

export const LANGS = ["en", "zh"] as const
export type Lang = (typeof LANGS)[number]

/** The words around a post, per language. */
export const COPY = {
  en: {
    toc: "On this page",
    next: "Read next",
    byline: (minutes: number) => `Retry · October 16, 2026 · ${minutes} min read`,
    switchTo: { label: "中文", aria: "Switch to Chinese" },
  },
  zh: {
    toc: "目录",
    next: "下一篇",
    byline: (minutes: number) => `Retry · 2026 年 10 月 16 日 · ${minutes} 分钟阅读`,
    switchTo: { label: "EN", aria: "Switch to English" },
  },
} as const satisfies Record<Lang, unknown>

const SOURCES = {
  cloud: {
    en: {
      label: "Overview",
      title: "Void Starter: a Cloudflare full-stack starter on Void and TanStack Start",
      markdown: cloudEn,
    },
    zh: {
      label: "项目概览",
      title: "Void Starter：基于 Void 与 TanStack Start 的 Cloudflare 全栈模板",
      markdown: cloudZh,
    },
  },
  harness: {
    en: {
      label: "Tooling & UI",
      title: "Tooling, UI and guardrails in Void Starter",
      markdown: harnessEn,
    },
    zh: {
      label: "工程与 UI",
      title: "Void Starter 的工程护栏、工具链与设计系统",
      markdown: harnessZh,
    },
  },
} as const

export type PostId = keyof typeof SOURCES
/** Posts in nav order. The first one, in English, is the site's home. */
export const POST_IDS = Object.keys(SOURCES) as [PostId, ...PostId[]]

type Source = (typeof SOURCES)[PostId][Lang]

/** A post in one language, with what its page derives from the Markdown. */
type Post = Source & { id: PostId; headings: Heading[]; minutes: number }

// Derived once at module load, not on every render.
const POSTS = Object.fromEntries(
  POST_IDS.map((id) => [
    id,
    Object.fromEntries(
      LANGS.map((lang) => {
        const source: Source = SOURCES[id][lang]
        const post: Post = {
          ...source,
          id,
          headings: headingsOf(source.markdown),
          minutes: readingMinutes(source.markdown),
        }
        return [lang, post]
      })
    ),
  ])
) as Record<PostId, Record<Lang, Post>>

export const postOf = (lang: Lang, id: PostId) => POSTS[id][lang]

/** Where a post lives. English's first post is `/`; every other one is `/$lang/$post`. */
export const postLink = (lang: Lang, post: PostId) =>
  lang === "en" && post === POST_IDS[0]
    ? linkOptions({ to: "/" })
    : linkOptions({ to: "/$lang/$post", params: { lang, post } })

/** The language a path is in, the inverse of `postLink`. Pages outside the blog are English. */
export const langOfPath = (pathname: string): Lang =>
  LANGS.find((lang) => pathname.startsWith(`/${lang}/`)) ?? "en"

const DESCRIPTION =
  "A full-stack TypeScript starter on Void and TanStack Start with a D1, R2 and Workers AI chat app, Retry UI and Oxlint guardrails."

/** The `<head>` of a post's page. The home page keeps its own title. */
export const postHead = (lang: Lang, id: PostId, title: string = postOf(lang, id).title) => ({
  meta: [{ title }, { name: "description", content: DESCRIPTION }],
})
