import { MoonIcon, SunIcon, SunMoonIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

function getInitialMode(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'auto';
    }

    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        return stored;
    }

    return 'auto';
}

function applyThemeMode(mode: ThemeMode) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode;

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);

    if (mode === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', mode);
    }

    document.documentElement.style.colorScheme = resolved;

    applyFaviconForMode(mode, resolved);
}

// Keep the favicon in step with the active theme mode. The two `<link rel="icon">`
// tags in the document head start with `prefers-color-scheme` media queries; on
// `auto` we restore those so the OS preference wins, and on a manual `light` or
// `dark` choice we force one icon `all` and the other `not all`.
// See docs/styles/theme.md.
function applyFaviconForMode(mode: ThemeMode, resolved: 'light' | 'dark') {
    const lightIcon = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-theme-icon="light"]');
    const darkIcon = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-theme-icon="dark"]');
    if (!lightIcon || !darkIcon) return;

    if (mode === 'auto') {
        lightIcon.media = '(prefers-color-scheme: light)';
        darkIcon.media = '(prefers-color-scheme: dark)';
        return;
    }

    lightIcon.media = resolved === 'light' ? 'all' : 'not all';
    darkIcon.media = resolved === 'dark' ? 'all' : 'not all';
}

export function ThemeSelector() {
    const [mode, setMode] = useState<ThemeMode>('auto');

    useEffect(() => {
        const initialMode = getInitialMode();
        setMode(initialMode);
        applyThemeMode(initialMode);
    }, []);

    useEffect(() => {
        if (mode !== 'auto') {
            return;
        }

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => applyThemeMode('auto');

        media.addEventListener('change', onChange);
        return () => {
            media.removeEventListener('change', onChange);
        };
    }, [mode]);

    function toggleMode() {
        const nextMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
        setMode(nextMode);
        applyThemeMode(nextMode);
        window.localStorage.setItem('theme', nextMode);
    }

    const label =
        mode === 'auto' ? 'Theme mode: auto (system). Click to switch to light mode.' : `Theme mode: ${mode}. Click to switch mode.`;

    const Icon = mode === 'light' ? SunIcon : mode === 'dark' ? MoonIcon : SunMoonIcon;

    return (
        <button
            type="button"
            onClick={toggleMode}
            aria-label={label}
            title={label}
            className="grid size-9 place-items-center rounded-full border border-foreground/10 text-foreground/80 transition hover:bg-foreground/5 dark:border-white/10 dark:hover:bg-white/8 cursor-pointer"
        >
            <Icon className="size-4" />
        </button>
    );
}
