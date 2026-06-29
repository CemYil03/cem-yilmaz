import { useLocation } from '@tanstack/react-router';
import {
    CodeXmlIcon,
    DumbbellIcon,
    FileTextIcon,
    FilmIcon,
    FolderKanbanIcon,
    MessageCircleIcon,
    MessageSquareTextIcon,
    ReceiptTextIcon,
    SparklesIcon,
    StethoscopeIcon,
    WalletIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';
import type { Locale } from '../utils/locale';
import type { Crumb } from './Header';
import { Header } from './Header';

// Workspace-wide header. Mounted once at `src/routes/{-$locale}/workspace.tsx`,
// so every workspace page inherits the same chrome:
//
//   logo (links to `/{-$locale}`)  workspace / <icon> <where we are>           Assistant
//
// The trail is derived from the current pathname against the title map below;
// the first crumb always links back to `/workspace`, the trailing crumb is
// rendered as the current page (with its focus-area icon — the workspace pages
// don't render an on-page title row, so the icon lives here instead).
// Language and theme selectors are hidden — the workspace is a private surface
// with its own chrome and those controls belong to the public site; only the
// assistant chat button stays in the right cluster.
//
// Adding a new workspace route: add an entry to `WORKSPACE_TITLES` so the
// breadcrumb has a label, and (optionally) one to `WORKSPACE_ICONS` so the
// trailing crumb gets the same lucide icon used on the hub tile.

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

// Path segment → lucide icon. Matches the icon used on the hub tile so the
// breadcrumb visually anchors the user in the same focus area.
const WORKSPACE_ICONS: Record<string, LucideIcon> = {
    assistant: MessageCircleIcon,
    profile: SparklesIcon,
    cv: FileTextIcon,
    software: CodeXmlIcon,
    projects: FolderKanbanIcon,
    finances: WalletIcon,
    tax: ReceiptTextIcon,
    fitness: DumbbellIcon,
    medical: StethoscopeIcon,
    media: FilmIcon,
    'visitor-chats': MessageSquareTextIcon,
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
            const isLast = index === segments.length - 1;
            // Only the trailing crumb carries the icon — intermediate
            // segments (none today, but defensive) stay plain so the
            // header doesn't grow visually crowded.
            const icon = isLast ? WORKSPACE_ICONS[segment] : undefined;
            return { label, icon };
        }),
    ];
}

export function WorkspaceHeader() {
    const locale = useLocale();
    const { pathname } = useLocation();
    const crumbs = buildCrumbs(pathname, locale);
    return <Header breadcrumbs={crumbs} hideSelectors chatVariant="workspace" />;
}
