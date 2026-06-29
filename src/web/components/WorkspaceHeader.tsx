import { useLocation } from '@tanstack/react-router';
import { useLocale } from '../hooks/useLocale';
import type { Locale } from '../utils/locale';
import type { Crumb } from './Header';
import { Header } from './Header';

// Workspace-wide header. Mounted once at `src/routes/{-$locale}/workspace.tsx`,
// so every workspace page inherits the same chrome:
//
//   logo (links to `/{-$locale}`)  workspace / <where we are>           Assistant
//
// The trail is derived from the current pathname against the title map below;
// the first crumb always links back to `/workspace`, the trailing crumb is
// rendered as the current page. Language and theme selectors are hidden here —
// the workspace is a private surface with its own chrome and those controls
// belong to the public site; only the assistant chat button stays in the
// right cluster.
//
// Adding a new workspace route: add an entry to `WORKSPACE_TITLES` so the
// breadcrumb has a label. The route file itself no longer needs to render a
// `<Header />` or a back-link — both come from the layout.

const workspaceLabel: Record<Locale, string> = { de: 'Workspace', en: 'Workspace' };

// Path segment → bilingual title for every `/workspace/<segment>` route. The
// hub (`/workspace`) has no segment and renders as a single `Workspace` crumb.
const WORKSPACE_TITLES: Record<string, { de: string; en: string }> = {
    assistant: { de: 'Assistent', en: 'Assistant' },
    profile: { de: 'Profil', en: 'Profile' },
    cv: { de: 'Lebenslauf', en: 'CV' },
    software: { de: 'Software', en: 'Software' },
    projects: { de: 'Projekte', en: 'Projects' },
    finances: { de: 'Finanzen', en: 'Finances' },
    tax: { de: 'Steuern', en: 'Tax' },
    fitness: { de: 'Fitness', en: 'Fitness' },
    medical: { de: 'Medizinisches', en: 'Medical' },
    media: { de: 'Filme & Serien', en: 'Movies & TV' },
    'visitor-chats': { de: 'Besucher-Chats', en: 'Visitor chats' },
};

// Strip a leading `/en` (or any non-default locale) segment so the path-segment
// lookup matches both `/workspace/foo` and `/en/workspace/foo`. Trailing slashes
// are normalized away too.
function normalizePath(pathname: string): string {
    let p = pathname.replace(/^\/(en)(?=\/|$)/, '');
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
}

function buildCrumbs(pathname: string, locale: Locale): ReadonlyArray<Crumb> {
    const normalized = normalizePath(pathname);
    // Everything after `/workspace` — `''` on the hub itself, e.g. `cv` on
    // `/workspace/cv`. Deeper paths aren't expected today; if they appear,
    // the title for any unknown segment falls back to the raw segment.
    const tail = normalized.replace(/^\/workspace/, '').replace(/^\//, '');
    if (!tail) {
        // On the hub itself we still want the breadcrumb to read `Workspace`
        // (current page). Single crumb, no link.
        return [{ label: workspaceLabel[locale] }];
    }
    const segments = tail.split('/');
    return [
        { label: workspaceLabel[locale], to: '/{-$locale}/workspace' },
        ...segments.map((segment, index) => {
            const entry = WORKSPACE_TITLES[segment];
            const label = entry ? entry[locale] : segment;
            // Intermediate segments don't have routes of their own today; we
            // render every crumb but only the trailing one is treated as the
            // current page — anything before it without a known `to` is
            // unlinked but visible.
            const isLast = index === segments.length - 1;
            return isLast ? { label } : { label };
        }),
    ];
}

export function WorkspaceHeader() {
    const locale = useLocale();
    const { pathname } = useLocation();
    const crumbs = buildCrumbs(pathname, locale);
    return <Header breadcrumbs={crumbs} hideSelectors chatVariant="workspace" />;
}
