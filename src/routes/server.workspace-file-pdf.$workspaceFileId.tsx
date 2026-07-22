import { createFileRoute, notFound } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import { z } from 'zod';
import { AssistantMarkdown, ExternalLinkConfirmationProvider } from '../web/components/AssistantMarkdown';
import type { WorkspaceFilePdfContent } from '../server/queries/workspaceFilePdfContentLoad';

// Print surface for a workspace markdown document — the page headless
// Chromium navigates to and captures into a PDF (see
// `docs/features/workspace-files.md`, `docs/architecture/browser-capture.md`).
// This is the first consumer of the `/server/*` render-route convention.
//
// It authenticates by the short-lived HMAC `token` search param (bound to the
// `workspaceFileId`), NOT a session cookie — the headless browser has no
// cookie jar. The token is minted by the authenticated download route
// (`/api/workspace-files/:id/pdf`) only after that route has verified the
// requester owns the file, so a valid token is proof the capture pipeline is
// rendering a file its owner asked for. Invalid/expired → 404, nothing leaks.
//
// The layout is deliberately NOT the app's on-screen theme: a clean, light,
// A4-oriented sheet (like markdowntopdf.com) with readable body type and no
// app chrome. `printBackground` + the `print` media emulation in
// `browserCapturePdf` make these styles land in the PDF. The route still
// renders inside `__root` (which mounts the ambient backdrop and toaster), so
// we force a white, full-bleed sheet on top of it via inline styles and
// `data-pdf-*` hooks.

// A missing/blank `token` defaults to `''` rather than failing validation, so
// a malformed URL degrades to the loader's clean 404 (invalid token) instead
// of a 500 from a rejected search param.
const searchSchema = z.object({
    token: z.string().catch(''),
});

// Server-only: verify the token and load the document bytes. The `.server()`
// branch dynamically imports the DB-backed loader so neither Drizzle nor the
// `SERVER_TOKEN_SECRET`-reading `serverToken` module is pulled into the client
// bundle. The `.client()` branch is unreachable in practice (the page is only
// ever loaded fresh by Chromium), but returns `null` defensively.
const loadContent: (workspaceFileId: string, token: string) => Promise<WorkspaceFilePdfContent | null> = createIsomorphicFn()
    .server(async (workspaceFileId: string, token: string) => {
        const { workspaceFilePdfContentLoad } = await import('../server/queries/workspaceFilePdfContentLoad');
        return workspaceFilePdfContentLoad(workspaceFileId, token);
    })
    .client(async () => null) as (workspaceFileId: string, token: string) => Promise<WorkspaceFilePdfContent | null>;

export const Route = createFileRoute('/server/workspace-file-pdf/$workspaceFileId')({
    validateSearch: searchSchema,
    loaderDeps: ({ search }) => ({ token: search.token }),
    loader: async ({ params, deps }) => {
        const content = await loadContent(params.workspaceFileId, deps.token);
        if (!content) throw notFound();
        return content;
    },
    component: WorkspaceFilePdfDocument,
});

function WorkspaceFilePdfDocument() {
    const { title, content } = Route.useLoaderData();
    return (
        // Fixed, full-bleed white sheet painted over the app's ambient backdrop
        // so the capture is a clean light page regardless of the app theme.
        // `colorScheme: light` forces light UA defaults; the margins come from
        // `browserCapturePdf`'s `@page` settings, so the inner padding here is
        // only the on-screen breathing room before capture.
        <div data-pdf-ready style={{ colorScheme: 'light' }} className="fixed inset-0 z-50 overflow-auto bg-white text-neutral-900">
            <article className="mx-auto max-w-[720px] px-10 py-8">
                <h1 className="mb-6 text-2xl font-semibold text-neutral-900">{title}</h1>
                {/* Reuse the same renderer as the on-screen preview for content
                    parity. External-link confirmation is irrelevant in a PDF, so
                    disable the interstitial (links become plain anchors). */}
                <ExternalLinkConfirmationProvider enabled={false}>
                    <AssistantMarkdown text={content} className="text-[15px] leading-relaxed text-neutral-800" />
                </ExternalLinkConfirmationProvider>
            </article>
        </div>
    );
}
