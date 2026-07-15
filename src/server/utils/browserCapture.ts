import type { Browser } from 'playwright';

// Server-side rendering capability. See
// `docs/architecture/server-side-rendering.md` for the full design — this
// module is the singleton-Chromium half of that pipeline. Routes intended
// for capture live under `/server/*` and authenticate with an HMAC token
// minted by `serverToken.ts`.
//
// The `playwright` import is dynamic so the module stays out of the bundle's
// static resolution graph — combined with the `external` declaration in
// `vite.config.ts`, the production server resolves `playwright` against the
// runtime `node_modules` (where Chromium lives) rather than trying to inline
// it into the nitro bundle (which fails because Chromium-bidi loads internal
// paths Vite cannot statically follow).

let browserSingleton: Browser | undefined;

async function getBrowser(): Promise<Browser> {
    if (!browserSingleton) {
        const { chromium } = await import('playwright');
        // `--no-sandbox` is required because the production container runs
        // Chromium without user-namespace support. We accept the loss of
        // defense-in-depth in exchange for portability across Coolify hosts;
        // the only content rendered is our own application surface, against
        // an internally-minted HMAC token.
        browserSingleton = await chromium.launch({ args: ['--no-sandbox'] });
    }
    return browserSingleton;
}

export interface BrowserCaptureOptions {
    /**
     * Absolute URL the browser navigates to. Typically constructed as
     * `${baseUrl}/server/${path}?token=${createServerToken(...)}` by the
     * caller. The capture pipeline does not know about the app's base URL
     * or token format — it just drives the browser at whatever URL it's
     * handed.
     */
    url: string;
    viewport?: { width: number; height: number };
    /**
     * Optional CSS selector to wait for before screenshotting. If unset,
     * the capture happens once `domcontentloaded` fires plus a short paint
     * delay. Use this when the page renders data asynchronously and the
     * captured frame would otherwise miss the final layout.
     */
    waitForSelector?: string;
    /** Navigation + selector wait timeout. Default 15 s. */
    timeoutMs?: number;
    /** Output format. Default `png`. */
    type?: 'png' | 'jpeg';
    /** Full-page screenshot vs. viewport-sized. Default `false` (viewport). */
    fullPage?: boolean;
}

/**
 * Captures a screenshot of `options.url` using a long-lived headless
 * Chromium. The first call launches Chromium; subsequent calls reuse the
 * same browser process and just open a fresh `Page`.
 *
 * The browser is intentionally never closed — Node exit reaps it. Adding
 * teardown introduces "page on closed browser" races that aren't worth
 * solving for the steady-state lifecycle of a long-running container.
 */
export async function browserCapture(options: BrowserCaptureOptions): Promise<Buffer> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        if (options.viewport) {
            await page.setViewportSize(options.viewport);
        }

        const timeout = options.timeoutMs ?? 15_000;

        await page.goto(options.url, {
            waitUntil: 'domcontentloaded',
            timeout,
        });

        if (options.waitForSelector) {
            await page.waitForSelector(options.waitForSelector, { timeout });
        } else {
            // Small paint budget for the case where the caller did not
            // specify a selector. 200 ms is enough to cover one frame of
            // post-DCL React hydration without noticeably slowing exports.
            await page.waitForTimeout(200);
        }

        return await page.screenshot({
            type: options.type ?? 'png',
            fullPage: options.fullPage ?? false,
        });
    } finally {
        await page.close();
    }
}

export interface BrowserCapturePdfOptions {
    /**
     * Absolute URL the browser navigates to. Same construction as
     * `BrowserCaptureOptions.url` — typically
     * `${baseUrl}/server/${path}?token=${createServerToken(...)}`.
     */
    url: string;
    /** Optional CSS selector to wait for before printing. */
    waitForSelector?: string;
    /** Navigation + selector wait timeout. Default 15 s. */
    timeoutMs?: number;
    /** Page format. Default `A4`. */
    format?: 'A4' | 'Letter';
    /** Page margins. Default 15 mm all round. */
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
}

/**
 * Renders `options.url` to a PDF using the same long-lived headless
 * Chromium as `browserCapture`. `page.pdf()` is Chromium-headless-only —
 * which is exactly what `getBrowser()` launches — so it needs no separate
 * browser process.
 *
 * `printBackground: true` so the print stylesheet's backgrounds/colors
 * survive into the PDF. The render route is expected to ship its own
 * print-oriented layout (light background, readable body type) rather than
 * the app's on-screen theme — see the `/server/*` route that consumes this.
 */
export async function browserCapturePdf(options: BrowserCapturePdfOptions): Promise<Buffer> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        const timeout = options.timeoutMs ?? 15_000;

        await page.goto(options.url, {
            waitUntil: 'domcontentloaded',
            timeout,
        });

        if (options.waitForSelector) {
            await page.waitForSelector(options.waitForSelector, { timeout });
        } else {
            await page.waitForTimeout(200);
        }

        // `print` media so the route's `@media print` rules (and Streamdown's
        // print-friendly defaults) apply, matching what a browser's own
        // "Save as PDF" would produce.
        await page.emulateMedia({ media: 'print' });

        return await page.pdf({
            format: options.format ?? 'A4',
            printBackground: true,
            margin: options.margin ?? { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        });
    } finally {
        await page.close();
    }
}
