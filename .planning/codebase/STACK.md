# Technology Stack

**Analysis Date:** 2026-05-14

## Languages

**Primary:**
- TypeScript 5.x - All application code in `src/`, config files (`next.config.ts`, `vitest.config.ts`, `playwright.config.ts`)

**Secondary:**
- JavaScript (`.mjs`) - Build scripts in `scripts/` (`generate-icons.mjs`, `update-walkthrough-findings.mjs`)
- Bash - CI/git hook scripts in `scripts/` and `.claude/scripts/`
- MDX - Long-form article content in `content/articles/` and `content/glossary/`

## Runtime

**Environment:**
- Node.js v23.x (system; no `.nvmrc` or `.node-version` in repo — environment-matched)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Next.js 16.1.6 - App Router, static export (`output: "export"` in `next.config.ts`). No server-side runtime; site is fully statically generated.
- React 19.2.3 - UI rendering

**i18n:**
- next-intl 4.8.3 - Six-locale routing (`en`, `fr`, `es`, `pt`, `zh`, `ar`) via `src/i18n/request.ts`. Configured with `createNextIntlPlugin` in `next.config.ts`. Locale config at `src/i18n/config.ts`.

**Testing:**
- Vitest 3.2.4 - Unit/integration test runner. Config at `vitest.config.ts`. Environment: jsdom. Path alias `@` maps to `src/`.
- Playwright 1.59.1 - E2E tests against production (`https://myflowcheck.com`). Config at `playwright.config.ts`. Six locale projects plus `deep-flow` and `a11y`.
- @axe-core/playwright 4.11.3 - Accessibility scanning in `e2e/a11y.spec.ts`
- @testing-library/react 16.3.2 + @testing-library/user-event 14.6.1 - Component-level test utilities

**Build/Dev:**
- Tailwind CSS 4.x - Utility-first CSS. PostCSS config at `postcss.config.mjs` using `@tailwindcss/postcss`. Accessed via `globals.css`.
- ESLint 9.x - Linting via `eslint.config.mjs`. Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- TypeScript strict mode - `"strict": true` in `tsconfig.json`

## Key Dependencies

**Critical:**
- zustand 5.0.11 - Global state management with `persist` middleware for localStorage hydration. Single store at `src/lib/store.ts`. Pattern: `create(persist(...))` with migration function.
- date-fns 4.1.0 - Date arithmetic (`parseISO`, `addDays`) in `src/lib/utils.ts`. Primary date operations use `Intl.DateTimeFormat` directly for timezone-aware formatting.
- next-mdx-remote 6.0.0 - MDX rendering for article content via `src/lib/mdx.tsx`. Uses RSC variant (`next-mdx-remote/rsc`).
- gray-matter 4.0.3 - Frontmatter parsing for MDX articles in `src/lib/content.ts`.
- jspdf 4.2.0 + jspdf-autotable 5.0.7 - Client-side PDF generation. Module at `src/lib/exportPdf/` (7 files). Entry point: `src/lib/exportPdf/index.ts`.
- @vercel/analytics 2.0.0 - Page view and custom event tracking (`track()` calls in 6 components). Injected in `src/app/[locale]/layout.tsx` as `<Analytics />`.

**Content Processing:**
- remark-gfm 4.0.1 - GitHub Flavored Markdown in articles
- rehype-slug 6.0.0 + rehype-autolink-headings 7.1.0 - Heading anchors in rendered MDX
- reading-time 1.5.0 - Word-count-based reading estimate in `src/lib/content.ts`
- image-size 2.0.2 - Auto-detect image dimensions for `<img>` width/height attributes in `src/lib/mdx.tsx`

**UI:**
- lucide-react 0.577.0 - Icon library. Used in 39+ component files. Icon names typed in `src/lib/constants.ts` as `DrinkIconName` and `LeakIconName`.

**PDF Testing:**
- pdf-parse 2.4.5 - PDF content verification in E2E tests

## Configuration

**Environment:**
- No `.env` file detected. The app requires no runtime environment variables for standard operation.
- Test-time optional vars: `WALKTHROUGH_BASE_URL` (default `https://myflowcheck.com`), `HEADED` (Playwright headed mode), `DIARY_PDF_OUT` (PDF test output directory).
- `NODE_ENV` is the only runtime env var used in `src/` (production cache gating in `src/lib/content.ts`).

**Path Alias:**
- `@/*` → `./src/*` (in both `tsconfig.json` and `vitest.config.ts`)

**Build:**
- `next.config.ts` - Static export mode, unoptimized images (required for `output: "export"`), next-intl plugin wrapper
- `tsconfig.json` - ES2017 target, bundler module resolution, incremental compilation
- `postcss.config.mjs` - Tailwind CSS via `@tailwindcss/postcss`

**Git Hooks:**
- `.githooks/pre-commit` - Enforces article i18n completeness via `.claude/scripts/article-i18n-completeness.sh`. Registered by `npm run prepare`.

**Claude Automation Hooks (`.claude/settings.json`):**
- PostToolUse on `messages/en.json` edits → triggers `i18n-sync` skill
- PostToolUse on `content/articles/en/**/*.mdx` edits → triggers `article-translate` skill
- Stop hook → blocks if any English article lacks all 5 non-English locale mirrors

## Platform Requirements

**Development:**
- Node.js v20+ (inferred from `@types/node: ^20` devDependency)
- `jq` CLI required for i18n sync hooks and key-parity checks

**Production:**
- Static site deployed to Vercel
- Routing handled by `vercel.json`: bare paths rewrite to `/en/`, `/en/*` paths redirect to bare (en is the default locale served without prefix)
- PWA: `public/manifest.json` + `public/sw.js` (cache-first service worker, pre-caches app shell routes)
- No server-side runtime — all dynamic behavior is client-side via localStorage + Zustand

---

*Stack analysis: 2026-05-14*
