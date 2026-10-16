# Articles

## Sub-features

Overview and tooling articles, English and Chinese URLs, header navigation, language switching, footer links and a responsive table of contents.

## How to get to it (user POV)

Start at `/`. Header article links and the footer's Read next link switch articles. The language control keeps the current article. Direct links include `/zh/cloud`, `/en/harness` and `/zh/harness`.

## Driving it with a browser

Run `pnpm e2e` for the automated path. It clicks `a[aria-label="Switch to Chinese"]`, `nav[aria-label="Articles"] a[href="/zh/harness"]` and `a[aria-label="Switch to English"]`. Literal H1 assertions prove translated content. Reloading `/en/harness` proves a direct request renders the article.

For navigation changes, also exercise the footer link and return to Overview from the header. For TOC changes, use a desktop viewport and click a visible heading entry. Observe the destination heading and active entry. On mobile, open On this page or 目录 and repeat. Capture before and after screenshots for scroll or layout claims.

## Gotchas

Desktop and mobile TOCs both exist in the DOM. Use the visible entry from a fresh snapshot. Smoke runs a dev server and does not prove prerendered production assets or responsive layout. Changes to prerendering also require `pnpm build` and inspection of `apps/web/dist/client`.
