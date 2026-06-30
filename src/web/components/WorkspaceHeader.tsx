import { useLocation, useMatches } from '@tanstack/react-router';
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

function buildCrumbs(pathname: string, locale: Locale, trailing: TrailingLabel): ReadonlyArray<Crumb> {
    const normalized = normalizePath(pathname);
    // Everything after `/workspace` — `''` on the hub itself, e.g. `cv` on
    // `/workspace/cv`. Deeper paths (e.g. `projects/<id>`) split on `/` and
    // each segment becomes its own crumb; segments without a `WORKSPACE_TITLES`
    // entry fall back to the raw segment, except on routes that have
    // registered a `TRAILING_LABEL_SELECTORS` entry — those use the loader-
    // provided label (and render empty while the loader hasn't produced one
    // yet, so the raw id never flashes on screen).
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
            const fallbackLabel = entry ? entry[locale] : segment;
            const isLast = index === segments.length - 1;
            const icon = WORKSPACE_ICONS[segment];
            if (isLast) {
                // Trailing crumb owns the focus-area icon (replaces the
                // on-page title row). Detail routes that have registered a
                // label selector own the label too: the active route's
                // loader provides a human string, and we render empty until
                // it does — better than flashing a UUID at the user.
                if (trailing.hasSelector) {
                    return { label: trailing.label ?? '', icon };
                }
                return { label: fallbackLabel, icon };
            }
            // Intermediate crumb on a nested route (e.g. `projects` in
            // `projects/<id>`) collapses to its icon + a link back to the
            // section. Falls back to the plain label if the segment has no
            // icon mapping.
            return icon
                ? {
                      label: fallbackLabel,
                      icon,
                      iconOnly: true,
                      to: `/{-$locale}/workspace/${segment}`,
                  }
                : { label: fallbackLabel, to: `/{-$locale}/workspace/${segment}` };
        }),
    ];
}

// Pluck a human-readable label for the trailing crumb out of the deepest
// match's loader data. Each entry maps a TanStack-router route id to a
// selector — when the active route matches, that selector pulls the title
// out of `loaderData`. Add new entries here whenever a workspace detail
// route is added so the breadcrumb stops showing a raw id.
type LoaderDataLike = unknown;
const TRAILING_LABEL_SELECTORS: ReadonlyArray<{
    routeId: string;
    select: (loaderData: LoaderDataLike) => string | undefined;
}> = [
    {
        routeId: '/{-$locale}/workspace/projects_/$projectId',
        select: (loaderData) => {
            const project = (loaderData as { admin?: { project?: { title?: string } } } | undefined)?.admin?.project;
            return typeof project?.title === 'string' ? project.title : undefined;
        },
    },
];

// `hasSelector: true` means the active route owns the trailing crumb's
// label; `label` may still be `undefined` while the loader is resolving (or
// re-resolving on invalidation). `hasSelector: false` is the common case —
// the breadcrumb uses the segment-derived label.
type TrailingLabel = { hasSelector: true; label: string | undefined } | { hasSelector: false };

function useTrailingLabel(): TrailingLabel {
    return useMatches({
        select: (matches): TrailingLabel => {
            // Walk from the deepest match outward so a detail-route selector
            // wins over a parent-route one. Routes without a registered
            // selector fall through to `hasSelector: false`.
            for (let i = matches.length - 1; i >= 0; i -= 1) {
                const match = matches[i];
                if (!match) continue;
                const selector = TRAILING_LABEL_SELECTORS.find((entry) => entry.routeId === match.routeId);
                if (!selector) continue;
                return { hasSelector: true, label: selector.select(match.loaderData) };
            }
            return { hasSelector: false };
        },
    });
}

export function WorkspaceHeader() {
    const locale = useLocale();
    const { pathname } = useLocation();
    const trailing = useTrailingLabel();
    const crumbs = buildCrumbs(pathname, locale, trailing);
    return <Header breadcrumbs={crumbs} hideSelectors chatVariant="workspace" />;
}
