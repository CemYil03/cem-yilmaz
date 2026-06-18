# Server-Side Rendering (Playwright)

## Context

Many projects built on this template need to render application UI to an image (or PDF) on the server: social-share previews, schema/diagram
exports, invoice PDFs, screenshot-based regression checks. The constraint is that the artifact must look exactly like the in-app rendering —
same React components, same styles, same data — so re-implementing the layout in a server-only renderer (canvas, satori, headless DOM
polyfill) is a non-starter as a default.

The most predictable way to get pixel-perfect parity is to drive a real browser against a route the app already serves. **Playwright with
bundled Chromium** is the most stable cross-platform option, and is therefore declared as a **production dependency** in `package.json` from
the template baseline — even projects that don't use it on day one inherit a working pipeline so the eventual first use does not require a
Dockerfile rewrite.

## Decision

Server-side rendering is a **first-class capability** of the template, exposed on `ServerRuntime` as `serverRuntime.browser`. The pipeline
has four pieces, each independently replaceable:

1. **A long-lived headless Chromium process** managed as a lazy module-scope singleton inside `src/server/utils/browserCapture.ts`. The
   first call to `serverRuntime.browser.capture(...)` launches Chromium; every subsequent call reuses the same browser and just opens a
   fresh `Page`. This avoids per-request launch overhead (~1 s on a warm host, multiple seconds cold) and bounds memory to a single Chromium
   instance per Node process.
2. **An authenticated `/server/*` route convention** the browser navigates to. Server-side renders authenticate with a short-lived HMAC
   token (`src/server/utils/serverToken.ts`) instead of a session cookie, because the headless browser has no way to inherit the user's
   cookie jar and we don't want render endpoints relying on a long-lived bearer token.
3. **A capture API on `ServerRuntime`** (`browser.capture`) that takes a path + token + viewport and returns a `Buffer`. Commands consume it
   like any other runtime capability — they never `import 'playwright'` directly.
4. **Build and runtime configuration** that keeps Playwright out of the Vite/Nitro bundle and ships Chromium + its system libraries inside
   the production Docker image.

### Singleton browser

```typescript
// src/server/utils/browserCapture.ts
import type { Browser } from 'playwright';

let browserSingleton: Browser | undefined;

async function getBrowser(): Promise<Browser> {
  if (!browserSingleton) {
    const { chromium } = await import('playwright');
    browserSingleton = await chromium.launch({ args: ['--no-sandbox'] });
  }
  return browserSingleton;
}

export interface BrowserCaptureOptions {
  /** Absolute URL the browser navigates to — typically `${baseUrl}/server/${path}?token=${createServerToken(...)}`. */
  url: string;
  viewport?: { width: number; height: number };
  /** Optional CSS selector to wait for before screenshotting. */
  waitForSelector?: string;
  /** Navigation + selector wait timeout. Default 15 s. */
  timeoutMs?: number;
  /** Output format. Default `png`. */
  type?: 'png' | 'jpeg';
  /** Full-page screenshot vs. viewport-sized. Default `false` (viewport). */
  fullPage?: boolean;
}

export async function browserCapture(options: BrowserCaptureOptions): Promise<Buffer> {
  /* ... */
}
```

The dynamic `import('playwright')` is intentional — it keeps the module out of the bundle resolution graph at build time so externalization
(see below) doesn't leak into routes that never touch it. `--no-sandbox` is required because the production container runs Chromium in an
environment where user namespaces aren't available; we trade defense-in-depth for portability across Coolify/Docker hosts.

The singleton is **never explicitly closed**. Node exits → Chromium exits with it. There is no `process.on('SIGTERM')` cleanup hook; nitro's
listener handles signal forwarding and the OS reclaims the child process. Adding teardown introduces a class of "browser closed mid-render"
races that we don't need to solve.

### `/server/*` route convention

Routes intended for server-side capture live under `src/routes/server.*` (matches `/server/*` in the URL space). They MUST:

- Validate a `token` search param via `verifyServerToken` before rendering anything sensitive
- Render the same components used by the user-facing route, parameterized for the export viewport (no chrome, no sidebars, no toasts)
- Be excluded from sitemaps and robots indexing — they are an implementation detail of the export pipeline

Authentication uses a one-shot HMAC token bound to a subject string (typically the resource id) and a TTL (60 s default). The signing secret
is `SERVER_TOKEN_SECRET`. The token is **opaque to the client** — no browser code ever creates one. Commands generate the token, hand it to
`browserCapture`, and the captured page is the only consumer.

### Capability on `ServerRuntime`

```typescript
// src/server/domain/ServerRuntime.ts
browser: {
  capture: (options: BrowserCaptureOptions) => Promise<Buffer>;
}
```

Wired in `serverRuntimeCreate.ts` to delegate to `browserCapture`. The capture pipeline does not know about the app's base URL or token
format — callers construct the absolute URL (typically `${baseUrl}/server/${path}?token=${createServerToken(...)}`) and hand it in. Tests
build a `ServerRuntime` directly and stub `browser.capture` to return a fixed `Buffer` — they never launch a real browser.

### Build and runtime configuration

Playwright cannot be bundled. It loads Chromium-bidi via internal paths Vite can't statically resolve, and the Chromium binary is a separate
artifact resolved relative to the install location of the npm package. Three places need to know:

1. **`vite.config.ts`** — `optimizeDeps.exclude` lists `'playwright'` and `'playwright-core'` so the dev server doesn't pre-bundle them.
2. **Nitro rollup** — `nitro({ rollupConfig: { external: ['playwright', 'playwright-core'] } })` keeps the production server bundle from
   inlining them. Imports stay as runtime `require`/`import` calls that resolve against `node_modules` at runtime.
3. **`Dockerfile`** — because Playwright is the only runtime dependency that cannot be inlined into the nitro bundle, the production stage
   must:
   - Use a Debian-based Node image (`node:24-bookworm-slim`), not Alpine — Chromium's prebuilt binaries are linked against glibc.
   - Run `npx playwright install-deps chromium` to install the system libraries Chromium needs (fonts, libnss, libatk, etc.).
   - Run `npx playwright install chromium` to download the matching Chromium build into the image.
   - Install production `node_modules` so the runtime can resolve the externalized `playwright` import.

The first two `RUN` steps are placed before the `COPY --from=builder` of `.output/` so they cache across application code changes — Chromium
downloads dominate image build time and rarely change.

## Alternatives Considered

- **Puppeteer instead of Playwright.** Puppeteer is lighter and has historical Google maintenance, but Playwright's cross-browser story,
  better wait primitives, and Microsoft's ongoing investment make it the safer long-term default. The browser binary footprint is identical
  (it _is_ Chromium).
- **Headless Chrome via `chrome-aws-lambda` / `@sparticuz/chromium`.** Optimized for Lambda-class environments; smaller binary, but they
  ship a stripped Chromium that fails non-trivially on font rendering and modern CSS features. Not a fit for a long-running container
  deploy.
- **`satori` + `resvg` for HTML-to-image.** Fast and bundle-friendly, but only supports a constrained subset of CSS — flex/grid only, no
  Canvas, no animations, no custom fonts without explicit registration. Fine for OG-image generation, useless for "render the actual app".
- **A second Node service running just the renderer.** Cleanest isolation but doubles deployment surface area for a feature most projects
  use sparingly. The singleton-in-process pattern can be promoted to a sidecar later if a project's render volume justifies it.
- **Long-lived bearer token instead of HMAC.** Simpler, but a leaked token would expose every render endpoint until rotated. HMAC + short
  TTL bounds blast radius without a token store.

## Consequences

- Every project built on this template inherits a working SSR pipeline. The first feature that needs an export adds a `/server/*` route, a
  command that calls `serverRuntime.browser.capture(...)`, and ships — no Dockerfile or build-config archaeology.
- The production image is larger (~250 MB Chromium + system libs vs. a baseline `node:24-slim` of ~80 MB). This is the price of correctness;
  we accept it as a template-wide default.
- `playwright` stays in `dependencies` (not `devDependencies`) because the runtime stage needs it. Knip and other unused-dependency tools
  must allowlist it for projects that haven't wired a render path yet.
- Tests must not transitively import `browserCapture.ts` — anything that does inherits a startup dependency on a Chromium binary that isn't
  installed in CI's `node_modules` (CI runs `npm ci`, which does not run Playwright's `postinstall` browser download by default). Commands
  that use the capability take it via `ServerRuntime` and tests inject a stub.
