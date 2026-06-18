import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';

// Nitro's vite dev middleware classifies a request as a static asset when
// `Sec-Fetch-Dest` is anything other than `document` / `iframe` / `frame`,
// and routes assets through Vite's static pipeline before the Nitro handler
// ever runs. Browsers send `Sec-Fetch-Dest: image` for `<img src=…>`, which
// means our same-origin `/api/attachments/<id>` route gets diverted into the
// asset pipeline and answered with Vite's generic `Cannot GET …` HTML 404.
//
// We strip the header for `/api/*` paths in dev so those requests fall
// through to Nitro and reach our route handler. This plugin only mounts in
// `serve` mode — production builds skip Vite's middleware entirely, so the
// patch isn't shipped.
const apiSecFetchDestStrip = (): Plugin => ({
    name: 'api-sec-fetch-dest-strip',
    apply: 'serve',
    configureServer(server) {
        server.middlewares.use((req, _res, next) => {
            if (req.url && req.url.startsWith('/api/') && req.headers['sec-fetch-dest']) {
                delete req.headers['sec-fetch-dest'];
            }
            next();
        });
    },
});

const config = defineConfig({
    resolve: { tsconfigPaths: true },
    // Test configuration lives in `vitest.config.ts` — Vitest 4 + Vite 8's
    // module runner cannot evaluate React's CJS entry through the full
    // TanStack Start plugin stack, so the test config defines its own
    // server/web projects with disjoint plugin sets.
    //
    // Playwright drives a separately-installed Chromium binary and loads
    // chromium-bidi via internal paths Vite cannot statically resolve. It
    // must stay external on both the dev server (optimizeDeps) and the
    // production nitro bundle (rollup external) — the runtime image
    // installs it as a real `node_modules` dependency. See
    // `docs/architecture/server-side-rendering.md`.
    optimizeDeps: {
        exclude: ['playwright', 'playwright-core'],
    },
    plugins: [
        apiSecFetchDestStrip(),
        devtools(),
        nitro({
            rollupConfig: {
                external: ['playwright', 'playwright-core'],
            },
        }),
        tailwindcss(),
        tanstackStart(),
        viteReact(),
    ],
});

export default config;
