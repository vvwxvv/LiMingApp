# Hu Jieming (`myapp`)

Single-artist website for **胡介明 / Hu Jieming** — public site + in-app manager,
in one Next.js 15 (App Router) app.

```bash
npm install
npm run dev        # http://localhost:3000
```

`/` is the sectioned home page; artworks live at `/artworks`. The manager is at
`/manager/*` (pattern-lock; `/manager` redirects to `/manager/artwork`).

**Read [`docs/APP_GUIDE.md`](docs/APP_GUIDE.md) before changing anything** —
routes, the API/Mongo data layer (Prisma is used only for batch edits), the
`Meta` site-settings document, theming, EN/CN rules, manager list configs, and
the dev-cache gotcha.

Do not run Prisma migrations against the shared cluster; `npx prisma generate`
is the only safe Prisma command (`npm run build` already runs it).
