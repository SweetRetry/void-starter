import { createFileRoute } from "@tanstack/react-router"

import { BlogPage } from "@/components/blog/blog-page"
import { POST_IDS, postHead } from "@/components/blog/posts"

/**
 * The home page is the first post in English. The build prerenders it and every post it links
 * to (see `prerender` in vite.config.ts).
 */
export const Route = createFileRoute("/")({
  head: () =>
    postHead(
      "en",
      POST_IDS[0],
      "Void Starter — Cloudflare Full-Stack Starter on Void and TanStack Start"
    ),
  component: () => <BlogPage lang="en" post={POST_IDS[0]} />,
})
