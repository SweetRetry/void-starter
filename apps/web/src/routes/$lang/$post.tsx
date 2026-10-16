import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { BlogPage } from "@/components/blog/blog-page"
import { LANGS, POST_IDS, postHead } from "@/components/blog/posts"

const blogParams = z.object({ lang: z.enum(LANGS), post: z.enum(POST_IDS) })

/** A post in a language: `/en/harness`, `/zh/cloud`. The home post's own path is `/`. */
export const Route = createFileRoute("/$lang/$post")({
  loader: ({ params }) => {
    const parsed = blogParams.safeParse(params)
    if (!parsed.success) throw notFound()
    if (parsed.data.lang === "en" && parsed.data.post === POST_IDS[0]) throw redirect({ to: "/" })
    return parsed.data
  },
  head: ({ loaderData }) => (loaderData ? postHead(loaderData.lang, loaderData.post) : {}),
  component: BlogPostRoute,
})

function BlogPostRoute() {
  const { lang, post } = Route.useLoaderData()
  return <BlogPage lang={lang} post={post} />
}
