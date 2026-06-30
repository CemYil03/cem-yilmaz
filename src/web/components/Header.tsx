import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './base/breadcrumb';
import { GlassCard } from './GlassCard';
import { HeaderChatButton } from './HeaderChatButton';
import { LanguageSelector } from './LanguageSelector';
import { ThemeSelector } from './ThemeSelector';
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
    /** Hide the language and theme selectors. Used on the workspace, where
     *  the header is the workspace's own chrome and locale/theme controls
     *  belong to the public surface. The chat button is kept — it is the
     *  only header affordance the workspace needs. */
    hideSelectors?: boolean;
    /** Which chat sheet the header chat button opens. Defaults to `'visitor'`
     *  for the public site; workspace surfaces pass `'workspace'` so the
     *  button leads to the admin assistant sheet instead of the irrelevant
     *  visitor sheet. */
    chatVariant?: 'visitor' | 'workspace';
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

export function Header({ subtitle, navItems, brandLabel, breadcrumbs, hideSelectors, chatVariant = 'visitor' }: Props) {
    const locale = useLocale();
    const scrolled = useHasScrolled();
    const { pathname } = useLocation();
    const currentPath = normalizePath(pathname);

    return (
        <>
            <ProgressiveBlurTop />
            <header className="sticky top-4 z-50 mx-auto w-full max-w-6xl px-4 sm:px-8">
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
                            <div className="flex min-w-0 items-center gap-3">
                                <Link
                                    to="/{-$locale}"
                                    aria-label="Home"
                                    className="flex shrink-0 items-center transition-opacity hover:opacity-80 active:opacity-70"
                                >
                                    <img src="/favicon.ico" className="size-8 dark:hidden" alt="" />
                                    <img src="/favicon-dark.ico" className="hidden size-8 dark:block" alt="" />
                                </Link>
                                <Breadcrumb className="min-w-0">
                                    <BreadcrumbList className="flex-nowrap">
                                        {breadcrumbs.map((crumb, index) => {
                                            const isLast = index === breadcrumbs.length - 1;
                                            const Icon = crumb.icon;
                                            const labelNode = Icon ? (
                                                crumb.iconOnly ? (
                                                    <span className="flex shrink-0 items-center">
                                                        <Icon className="size-4 text-primary" aria-hidden />
                                                        <span className="sr-only">{crumb.label}</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex min-w-0 items-center gap-1.5">
                                                        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                                                        <span className="block min-w-0 truncate">{crumb.label}</span>
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
                            <HeaderChatButton variant={chatVariant} />
                            {!hideSelectors && <LanguageSelector />}
                            {!hideSelectors && <ThemeSelector />}
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

/* Five stacked fixed layers above the page. Each layer blurs more than the
   one above it but is masked to fade out where the next takes over, producing
   a smooth blur falloff from the top edge to the bottom of the floating
   header. Sits below the header (z-40) so the header still floats above. */
function ProgressiveBlurTop() {
    const layers = [
        { blur: '4px', from: 0, to: 100 },
        { blur: '8px', from: 0, to: 80 },
        { blur: '16px', from: 0, to: 60 },
        { blur: '32px', from: 0, to: 40 },
        { blur: '64px', from: 0, to: 20 },
    ];
    return (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-32">
            {layers.map((l, i) => (
                <div
                    key={i}
                    className="absolute inset-0"
                    style={{
                        backdropFilter: `blur(${l.blur})`,
                        WebkitBackdropFilter: `blur(${l.blur})`,
                        maskImage: `linear-gradient(to bottom, black ${l.from}%, transparent ${l.to}%)`,
                        WebkitMaskImage: `linear-gradient(to bottom, black ${l.from}%, transparent ${l.to}%)`,
                    }}
                />
            ))}
        </div>
    );
}
