import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// One-off capture for the public Projects page hero images. Mirrors the
// seedCv.ts shape: idempotent, run it whenever a site's design changes.
//
//   npx tsx scripts/captureProjectScreenshots.ts
//
// Targets are listed inline here rather than imported from
// `portfolioProjects.ts` so the script stays runnable without the app
// graph; the slugs are kept in sync by hand.
//
// Sites that block headless traffic (some hosts return TLS resets to
// non-resident clients) are listed with `manualOnly: true` and skipped —
// drop a hand-picked image into `public/projects/<slug>/1.{jpg,png}`
// instead. Today: `podologie-dudenhofen.de` reuses the practice photo
// from the sibling repo. `draw-schema.com` ships a curated 16:9 product
// shot from its own `public/`, also copied by hand.

interface Shot {
    slug: string;
    url: string;
    fileName: string;
    waitForSelector?: string;
    manualOnly?: boolean;
}

const SHOTS: ReadonlyArray<Shot> = [
    { slug: 'people-eat', url: 'https://people-eat.com', fileName: '1.jpg' },
    { slug: 'people-eat', url: 'https://people-eat.com/chefs', fileName: '2.jpg' },
    { slug: 'people-eat', url: 'https://people-eat.com/about-us', fileName: '3.jpg' },
    { slug: 'people-eat', url: 'https://people-eat.com/cities/Berlin', fileName: '4.jpg' },
    { slug: 'draw-schema', url: 'https://draw-schema.com', fileName: '1.png', manualOnly: true },
    { slug: 'draw-schema', url: 'https://draw-schema.com', fileName: '2.png', manualOnly: true },
    { slug: 'draw-schema', url: 'https://draw-schema.com/landing', fileName: '3.jpg' },
    { slug: 'podologie-dudenhofen', url: 'https://podologie-dudenhofen.de/', fileName: '1.jpg', manualOnly: true },
    { slug: 'podologie-dudenhofen', url: 'https://podologie-dudenhofen.de/leistungen', fileName: '2.jpg', manualOnly: true },
];

const VIEWPORT = { width: 1600, height: 900 } as const;
const OUT_DIR = resolve(import.meta.dirname, '..', 'public', 'projects');

async function captureWithRetry(browser: Awaited<ReturnType<typeof chromium.launch>>, shot: Shot) {
    const attempts = 3;
    let lastError: unknown;
    for (let i = 1; i <= attempts; i++) {
        const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
        try {
            console.log(`→ ${shot.url} (attempt ${i}/${attempts})`);
            await page.goto(shot.url, { waitUntil: 'load', timeout: 60_000 });
            if (shot.waitForSelector) {
                await page.waitForSelector(shot.waitForSelector, { timeout: 10_000 });
            }
            // Give animations/lazy hero content a beat to settle.
            await page.waitForTimeout(2000);
            const dir = resolve(OUT_DIR, shot.slug);
            await mkdir(dir, { recursive: true });
            const out = resolve(dir, shot.fileName);
            const isJpeg = /\.jpe?g$/i.test(shot.fileName);
            await page.screenshot({
                path: out,
                type: isJpeg ? 'jpeg' : 'png',
                quality: isJpeg ? 85 : undefined,
                clip: { x: 0, y: 0, ...VIEWPORT },
            });
            console.log(`   ${out}`);
            return;
        } catch (err) {
            lastError = err;
            console.warn(`   attempt ${i} failed: ${(err as Error).message.split('\n')[0]}`);
            await page.waitForTimeout(2000);
        } finally {
            await page.close();
        }
    }
    throw lastError;
}

async function run() {
    const browser = await chromium.launch();
    try {
        for (const shot of SHOTS) {
            if (shot.manualOnly) {
                console.log(`✕ ${shot.url} — manualOnly, skipping (curate by hand)`);
                continue;
            }
            await captureWithRetry(browser, shot);
        }
    } finally {
        await browser.close();
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
