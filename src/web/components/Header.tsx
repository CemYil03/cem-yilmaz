import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { BriefcaseIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './base/breadcrumb';
import { GlassCard } from './GlassCard';
import { HeaderChatButton } from './HeaderChatButton';
import { LanguageSelector } from './LanguageSelector';
import { ThemeSelector } from './ThemeSelector';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

/* Strip a leading `/en` (or any non-default locale) segment so `/about` and
   `/en/about` collapse to the same comparison key. Trailing slashes are
   normalized away too. */
function normalizePath(pathname: string): string {
    let p = pathname.replace(/^\/(en)(?=\/|$)/, '');
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p === '' ? '/' : p;
}

type NavItem = {
    label: { de: string; en: string };
    href: string;
};

/** A single breadcrumb crumb. The last crumb is rendered as the current page
 *  (inert); every earlier crumb is a link. `to` uses the TanStack-style typed
 *  path with `{-$locale}` so the locale param is preserved automatically.
 *  `icon` (optional) renders before the label — workspace surfaces use it on
 *  the trailing crumb so the page's icon lives in the header instead of
 *  repeating in an on-page title row. `iconOnly` (only meaningful with
 *  `icon`) hides the label visually and keeps it for screen readers — used
 *  for nested-route intermediates so deep paths stay compact (e.g. a
 *  project-detail trail collapses to `Workspace / 📁 / <id>`). */
export type Crumb = {
    label: string;
    /** Set on every crumb except the last (which is the current page). */
    to?: string;
    /** Optional Lucide icon rendered before the label. */
    icon?: LucideIcon;
    /** Render only the icon, with the label as `sr-only`. Requires `icon`. */
    iconOnly?: boolean;
};

type Props = {
    /** Optional secondary label rendered after the brand (e.g. "/ design preview"). */
    subtitle?: string;
    /** Optional desktop nav links — hidden below `md`. Omit for nav-less pages. */
    navItems?: ReadonlyArray<NavItem>;
    /** When set, the brand cluster is rendered as `logo + <label>` with only
     *  the logo being a link back to `/{-$locale}`. The label itself is plain
     *  text. Used by surfaces that have their own identity (e.g. `/workspace`,
     *  where the label is "Workspace") so the brand name doesn't shout over
     *  the page's own heading. */
    brandLabel?: string;
    /** When set, replaces the brand cluster with just the logo (linked home)
     *  followed by a breadcrumb trail. Used on workspace pages where the
     *  page's location in the hierarchy is the brand. Mutually exclusive
     *  with `brandLabel`. */
    breadcrumbs?: ReadonlyArray<Crumb>;
    /** Hide the language selector. Used on the workspace, where every page is
     *  English-only and the public locale toggle would be a no-op. The theme
     *  selector stays — dark mode is a workspace concern too. */
    hideLanguageSelector?: boolean;
    /** Which chat sheet the header chat button opens. Defaults to `'visitor'`
     *  for the public site; workspace surfaces pass `'workspace'` so the
     *  button leads to the admin assistant sheet instead of the irrelevant
     *  visitor sheet. */
    chatVariant?: 'visitor' | 'workspace';
    /** Width cap on the header itself. `'standard'` (default) matches the
     *  public site's container; `'wide'` (`max-w-8xl`) matches the broader
     *  workspace pages so the header doesn't sit narrower than the content
     *  underneath it. Workspace surfaces pick per-page. */
    width?: 'standard' | 'wide';
    /** Constrain the progressive-blur strip above the header to the
     *  header's parent box instead of the viewport. Default (`false`)
     *  uses `position: fixed` for the blur, which is correct on the
     *  public site. On workspace pages the layout puts the header inside
     *  shadcn's `<SidebarInset>` — a flex child whose width shrinks as
     *  the sidebar expands — so the blur must scope to that column instead
     *  of spanning the viewport behind the sidebar. `true` switches the
     *  blur to `position: absolute` inside an inset-relative parent the
     *  workspace layout provides. */
    contained?: boolean;
    /** When `true`, surface a "Workspace" link in the action cluster. The
     *  parent decides admin-ness (via `currentSession.user.admin`) and only
     *  passes `true` for admins — the Header itself has no session access.
     *  Public visitors never see this link. */
    showWorkspaceLink?: boolean;
};

/* ----------------------------------------------------------------------------
 * Header — the one header used across public pages. A floating, sticky
 * `GlassCard` with a progressive blur field above it, containing the favicon
 * (light/dark variants), brand name, optional desktop nav links, and the
 * language and theme selectors.
 *
 * Pages that need it can pass a `subtitle` slot and a desktop `navItems` list.
 *
 * For sticky to work, the nearest scroll ancestor must not be a scroll
 * container — `overflow-x: hidden` on a wrapper turns it into one. Use
 * `overflow-x-clip` instead.
 * ------------------------------------------------------------------------- */

export function Header({
    subtitle,
    navItems,
    brandLabel,
    breadcrumbs,
    hideLanguageSelector,
    chatVariant = 'visitor',
    width = 'standard',
    contained = false,
    showWorkspaceLink = false,
}: Props) {
    const locale = useLocale();
    const scrolled = useHasScrolled();
    const { pathname } = useLocation();
    const currentPath = normalizePath(pathname);

    return (
        <>
            <ProgressiveBlurTop contained={contained} width={width} />
            <header className={cn('sticky top-4 z-50 mx-auto w-full px-4 sm:px-8', width === 'wide' ? 'max-w-8xl' : 'max-w-6xl')}>
                <GlassCard
                    className={cn(
                        'transition-[background-color,box-shadow] duration-200 ease-out',
                        scrolled && 'bg-white/70 dark:bg-white/8',
                    )}
                >
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        {breadcrumbs && breadcrumbs.length > 0 ? (
                            // Breadcrumb variant: the logo is the only home link,
                            // and the trail to the right shows the user where they
                            // are inside the hierarchy. Used on workspace surfaces,
                            // where the page's location *is* the brand.
                            <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                                <Link
                                    to="/{-$locale}"
                                    aria-label="Home"
                                    className="flex shrink-0 items-center transition-opacity hover:opacity-80 active:opacity-70"
                                >
                                    <img src="/favicon.ico" className="size-8 dark:hidden" alt="" />
                                    <img src="/favicon-dark.ico" className="hidden size-8 dark:block" alt="" />
                                </Link>
                                <Breadcrumb className="min-w-0 overflow-hidden">
                                    <BreadcrumbList className="flex-nowrap overflow-hidden">
                                        {breadcrumbs.map((crumb, index) => {
                                            const isLast = index === breadcrumbs.length - 1;
                                            const Icon = crumb.icon;
                                            // Ancestor crumbs (everything but the current
                                            // page) collapse to their icon on narrow
                                            // screens and hold a fixed width (`shrink-0`),
                                            // so the flex row shrinks *them* first and the
                                            // current-page label keeps its space instead of
                                            // every crumb truncating to "Works…" at once.
                                            // The label reappears at `sm`. Icon-less
                                            // ancestors (rare fallbacks) keep their label so
                                            // they never collapse to an empty separator.
                                            const collapseAncestor = !isLast && !!Icon;
                                            const labelNode = Icon ? (
                                                crumb.iconOnly ? (
                                                    // Collapsed crumb: just the icon, with the
                                                    // label kept for screen readers and surfaced
                                                    // as a tooltip on hover (desktop) so pointer
                                                    // users can still recover the label.
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="flex shrink-0 items-center">
                                                                <Icon className="size-4 text-primary" aria-hidden />
                                                                <span className="sr-only">{crumb.label}</span>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{crumb.label}</TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <span
                                                        className={cn(
                                                            'flex items-center gap-1.5',
                                                            collapseAncestor ? 'shrink-0' : 'min-w-0',
                                                        )}
                                                    >
                                                        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                                                        <span
                                                            className={cn(
                                                                'min-w-0 truncate',
                                                                collapseAncestor ? 'hidden sm:block' : 'block',
                                                            )}
                                                        >
                                                            {crumb.label}
                                                        </span>
                                                    </span>
                                                )
                                            ) : (
                                                <span className="block min-w-0 truncate">{crumb.label}</span>
                                            );
                                            return (
                                                <span key={`${crumb.label}-${index}`} className="contents">
                                                    <BreadcrumbItem className="min-w-0">
                                                        {isLast || !crumb.to ? (
                                                            <BreadcrumbPage className="min-w-0">{labelNode}</BreadcrumbPage>
                                                        ) : (
                                                            <BreadcrumbLink asChild>
                                                                <Link to={crumb.to as never} className="min-w-0">
                                                                    {labelNode}
                                                                </Link>
                                                            </BreadcrumbLink>
                                                        )}
                                                    </BreadcrumbItem>
                                                    {isLast ? null : <BreadcrumbSeparator />}
                                                </span>
                                            );
                                        })}
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </div>
                        ) : brandLabel ? (
                            // Brand-as-label variant: only the logo links home;
                            // the label itself is inert text so the page's own
                            // identity (e.g. "Workspace") doesn't double as a
                            // self-link the user can't follow anywhere useful.
                            <div className="flex items-center gap-2.5">
                                <Link
                                    to="/{-$locale}"
                                    aria-label="Home"
                                    className="flex items-center transition-opacity hover:opacity-80 active:opacity-70"
                                >
                                    <img src="/favicon.ico" className="size-8 dark:hidden" alt="" />
                                    <img src="/favicon-dark.ico" className="hidden size-8 dark:block" alt="" />
                                </Link>
                                <span className="font-display text-sm font-semibold tracking-tight">{brandLabel}</span>
                            </div>
                        ) : (
                            <Link
                                to="/{-$locale}"
                                className="flex items-center gap-2.5 transition-opacity hover:opacity-80 active:opacity-70"
                            >
                                <img src="/favicon.ico" className="size-8 dark:hidden" alt="" />
                                <img src="/favicon-dark.ico" className="hidden size-8 dark:block" alt="" />
                                <span className="font-display text-sm font-semibold tracking-tight">Cem Yilmaz</span>
                                {subtitle && <span className="hidden text-xs text-muted-foreground sm:inline">{subtitle}</span>}
                            </Link>
                        )}

                        {navItems && navItems.length > 0 && (
                            <nav className="hidden items-center gap-1 text-sm md:flex">
                                {navItems.map((item) => {
                                    const isActive = normalizePath(item.href) === currentPath;
                                    return (
                                        <a
                                            key={item.href + item.label.en}
                                            href={item.href}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={cn(
                                                'rounded-full px-3 py-1.5 transition hover:bg-foreground/5 hover:text-foreground active:bg-foreground/8 active:text-foreground dark:hover:bg-white/6 dark:active:bg-white/12',
                                                isActive ? 'bg-foreground/8 text-foreground dark:bg-white/10' : 'text-foreground/70',
                                            )}
                                        >
                                            {item.label[locale]}
                                        </a>
                                    );
                                })}
                            </nav>
                        )}

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {showWorkspaceLink && (
                                // Admin-only entry into the personal workspace. Rendered
                                // exactly when the parent's `currentSession.user.admin`
                                // resolved non-null — anonymous and non-admin visitors
                                // never see this. Sized and styled to match the rest of
                                // the right-side cluster (chat / language / theme): a
                                // size-10 circular icon button with a tooltip label so
                                // the row stays visually balanced.
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link
                                            to="/{-$locale}/workspace"
                                            aria-label={{ de: 'Workspace', en: 'Workspace' }[locale]}
                                            className="grid size-10 cursor-pointer place-items-center rounded-full border border-foreground/10 text-foreground/80 transition hover:bg-foreground/5 active:bg-foreground/10 dark:border-white/10 dark:hover:bg-white/8 dark:active:bg-white/14"
                                        >
                                            <BriefcaseIcon className="size-4" aria-hidden />
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>{{ de: 'Workspace', en: 'Workspace' }[locale]}</TooltipContent>
                                </Tooltip>
                            )}
                            <HeaderChatButton variant={chatVariant} />
                            {!hideLanguageSelector && <LanguageSelector />}
                            <ThemeSelector />
                        </div>
                    </div>
                </GlassCard>
            </header>
        </>
    );
}

/* Tracks whether the viewport has scrolled past a small threshold. Used by
   the header to firm up its glass surface once the user is below the hero —
   keeps the floating nav legible over arbitrary section content without
   making it heavy at rest. */
function useHasScrolled(threshold = 8) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onScroll = () => setScrolled(window.scrollY > threshold);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);

    return scrolled;
}

/* Progressive-blur strip above the header. Five stacked layers, each
   blurring more than the one above but masked to fade where the next takes
   over — a smooth blur falloff from the top edge down to the bottom of the
   floating header. Sits below the header (z-40) so the header still floats
   above.

   Positioning has two modes:

   - Default (`fixed inset-x-0`) — the strip spans the full viewport width.
     Used on the public site.
   - `contained` — the strip matches the header's own width (same `max-w-*`
     cap, same `mx-auto`, same `px-4 sm:px-8`) so it never extends past the
     header on either side. Used on workspace pages, where the sidebar would
     otherwise be covered by a viewport-wide blur. The wrapper is
     `sticky top-0` with `h-0` so it follows the viewport top during scroll
     without pushing the header / page content down; the blur layers
     themselves render as `absolute` children of it. */
function ProgressiveBlurTop({ contained = false, width = 'standard' }: { contained?: boolean; width?: 'standard' | 'wide' }) {
    const layers = [
        { blur: '4px', from: 0, to: 100 },
        { blur: '8px', from: 0, to: 80 },
        { blur: '16px', from: 0, to: 60 },
        { blur: '32px', from: 0, to: 40 },
        { blur: '64px', from: 0, to: 20 },
    ];
    const layerNodes = layers.map((l, i) => (
        <div
            key={i}
            className="pointer-events-none absolute inset-x-0 top-0 h-32"
            style={{
                backdropFilter: `blur(${l.blur})`,
                WebkitBackdropFilter: `blur(${l.blur})`,
                maskImage: `linear-gradient(to bottom, black ${l.from}%, transparent ${l.to}%)`,
                WebkitMaskImage: `linear-gradient(to bottom, black ${l.from}%, transparent ${l.to}%)`,
            }}
        />
    ));
    if (contained) {
        // Match the header's own width box exactly. Same `max-w-*`, same
        // `mx-auto`, same `px-4 sm:px-8` — the blur covers the header glass
        // card and nothing past it.
        return (
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none sticky top-0 z-40 mx-auto h-0 w-full px-4 sm:px-8',
                    width === 'wide' ? 'max-w-8xl' : 'max-w-6xl',
                )}
            >
                {layerNodes}
            </div>
        );
    }
    return (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-32">
            {layerNodes}
        </div>
    );
}
