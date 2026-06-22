import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
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

type Props = {
    /** Optional secondary label rendered after the brand (e.g. "/ design preview"). */
    subtitle?: string;
    /** Optional desktop nav links — hidden below `md`. Omit for nav-less pages. */
    navItems?: ReadonlyArray<NavItem>;
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

export function Header({ subtitle, navItems }: Props) {
    const locale = useLocale();
    const scrolled = useHasScrolled();
    const { pathname } = useLocation();
    const currentPath = normalizePath(pathname);

    return (
        <>
            <ProgressiveBlurTop />
            <header className="sticky top-4 z-50 mx-auto w-full max-w-6xl px-6 sm:px-8">
                <GlassCard
                    className={cn(
                        'transition-[background-color,box-shadow] duration-200 ease-out',
                        scrolled && 'bg-white/70 dark:bg-white/8',
                    )}
                >
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <Link to="/{-$locale}" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 active:opacity-70">
                            <img src="/favicon.ico" className="size-8 dark:hidden" alt="" />
                            <img src="/favicon-dark.ico" className="hidden size-8 dark:block" alt="" />
                            <span className="font-display text-sm font-semibold tracking-tight">Cem Yilmaz</span>
                            {subtitle && <span className="hidden text-xs text-muted-foreground sm:inline">{subtitle}</span>}
                        </Link>

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
                            <HeaderChatButton />
                            <LanguageSelector />
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
