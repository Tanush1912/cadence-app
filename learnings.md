# Learnings

Dated notes for whoever works on this next. What went wrong, what to do instead.

## 2026-09-13 — UI refresh wave (tokens, Settings, Stats, Home, search, quit habits)

### Build tooling

- **`next dev` must use `--webpack`.** Gun's dynamic `require` does not resolve under Turbopack, so
  dev returned a 500 on every page load while `next build` passed, because the build script already
  carried `--webpack` and dev did not. Both scripts now match. If you ever see
  `Can't resolve <dynamic>` pointing into `node_modules/gun/gun.js`, this is why.
- **A green build is not a running app.** `tsc`, eslint and `next build` were all clean while every
  page 500'd in dev. Always load the app before claiming anything works.
- **Pin `outputFileTracingRoot`.** Stray `package-lock.json` files above the frontend made Next infer
  a workspace root outside the project and mis-trace the bundle.

### Tailwind / tokens

- **`twMerge` treats an unknown `text-*` utility as a colour.** `cn("text-body", "text-foreground")`
  silently dropped the size, with no error anywhere. Custom font-size tokens must be declared via
  `extendTailwindMerge` in `lib/utils.ts` or half your type scale vanishes at runtime.
- **Redefine shadcn tokens in place rather than adding a parallel system.** Changing `--card`,
  `--border`, `--muted-foreground` in `:root` fixed every existing `bg-card` / `text-muted-foreground`
  utility across ~48 files with no per-file edit.
- `--radius` feeds a multiplier scale, so bumping it changes `rounded-xl` / `rounded-2xl` everywhere.
  Stick to `rounded-sm` (8px) / `rounded-lg` (14px) / `rounded-full`.

### Gun

- **`node.off()` cascades.** It deletes the cached chain from the parent, so a hook that unmounts can
  kill a subscription another component still depends on. `app-shell` keeps all three tabs mounted,
  which is the only reason this has not bitten before. Hooks feeding content that lives inside a
  drawer or sheet must be hoisted to a component that never unmounts.
- **Logs are rebuilt field by field in two places**, `use-logs.ts` and `lib/gun/data-provider.tsx`.
  Anything not explicitly listed is silently stripped even when `Log` declares it. This is why
  `skipped` never reached the card and its pill could not render. Add new fields to BOTH.
- `data-provider` guards on `cleaned.done === undefined`. A log shape that omits `done`, like a slip,
  needs that guard widened or the entry is dropped entirely.

### Accent handling

- **`--primary` is set at runtime** by `accent-provider.tsx` via inline root styles; the value in
  `globals.css` is only the default for a brand-new profile. Do not assume the CSS value is live.
- **Never key a colour map on the accent name.** `mini-heatmap` had entries for
  `teal|amber|rose|purple|blue|green` while accents are `white|cyan|amber|green|rose|purple|blue`,
  so `white` and `cyan` both missed and fell back to teal. On the white accent every contribution
  grid rendered the wrong colour. Derive from `var(--primary)` with `color-mix` instead.

### Infrastructure

- **There is no backend.** The Gun relay pointed at `http://100.90.70.23:3099/gun`, a Tailscale IP on
  a machine that has been off for months. It could never have worked from the deployed HTTPS site
  anyway, since a secure page cannot open a `ws://` socket. The app is local-only and fine that way,
  but **there is no server copy of the data** and no backup. All four `/api/*` routes exist in the
  frontend and run on Vercel.
- **Reminders have never worked.** Three independent faults: the Vercel cron has no reachable code
  path (the send logic sits under `POST` gated on `action: "cron"` and the `GET` handler 400s),
  subscribers live in an in-memory `Map` on serverless so they are wiped on every cold start, and the
  schedule is hardcoded to `0 12 * * *` UTC regardless of the chosen hour. Fixing it needs durable
  storage (Upstash Redis via the Vercel Marketplace, since Vercel KV was retired in Dec 2024).
- The live Vercel project is **`cadence`**, not `cadence-frontend` (deleted, it had zero deployments).

### iOS / PWA

- **`dvh` resolves against the layout viewport, which does not shrink for the keyboard.** A drawer
  sized with `max-h-[85dvh]` stays full height, so iOS slides the whole fixed element up to reveal
  the focused input and the header goes off-screen. Size against `visualViewport` and anchor to the
  keyboard inset so the sheet shrinks instead of sliding.
- `interactive-widget=resizes-content` does **not** work; WebKit has not implemented it.
- iOS 26 does not reset `visualViewport.offsetTop` to 0 after the keyboard closes. Treat a small
  computed inset as zero rather than trusting a stale `offsetTop`.
- **WebKit #176896**: the text caret is painted at the untransformed position for an input inside a
  transformed or fixed ancestor. A settled drawer must be positioned, not transformed, or the cursor
  appears outside the field.
- `navigator.vibrate` does nothing on iOS on any path, despite the comment in `haptics.ts`.

### Process

- **Give parallel agents strictly disjoint file lists**, and do the cross-cutting fix yourself. The
  `twMerge` bug was only visible when diffing two agents' work against each other; no single agent
  could have seen it.
- **A worker reporting `BLOCKED` before editing is the system working.** Wave 3 stopped on the
  `data-provider` accumulator rather than overloading `skipped` or `done`, both of which would have
  persisted a semantic lie in local-only data with no backup.
- Measure an eslint baseline **by file and rule**, not by count. Equal counts can hide fixed-3-added-3.

### Deploy, added after shipping

- **`vercel env add` exits 0 without writing.** Both the piped form and `--value` reported success
  and stored nothing; pulling the values back showed length 0. **Always read env vars back after
  writing them.** This is the absent-vs-failed-vs-clean distinction in a place that is easy to miss.
- **A whitespace env var is truthy in JS.** `if (VAPID_PUBLIC && VAPID_PRIVATE)` passed on `" "`, so
  `setVapidDetails` got garbage. Validate shape, not presence.
- **Never call something that can throw at module scope in a route file.** `setVapidDetails` threw
  during page-data collection and failed the entire deploy, not just the push feature. A
  misconfigured environment should disable a feature, never take the site down.
- Route files may only export handlers. `export const pushConfigured` is a type error.
- **Do not run `npm run build` while the dev server is up** on the same tree: the production build
  replaces `.next` and dev 500s with a missing `routes-manifest.json`. Restart dev after a build.
