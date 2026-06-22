import { Link } from '@tanstack/react-router';
import { BriefcaseIcon, CodeXmlIcon, FileTextIcon, FolderGitIcon, MailIcon, UserRoundIcon } from 'lucide-react';
import { personalInfo } from '../content/personalInfo';
import { useLocale } from '../hooks/useLocale';

/* ----------------------------------------------------------------------------
 * Footer — the one footer shared across public pages. Three columns on `md+`
 * (brand block · sitemap · contact), stacked on mobile, with a bottom bar that
 * carries the copyright, an origin line, and the legal links.
 *
 * The visual treatment matches the rest of the site:
 *   - A brand-tinted hairline gradient along the top edge (fades from
 *     transparent through `primary/40` and back). Replaces the flat `border-t`
 *     the inline footer used to ship — that border read as a generic CMS strip
 *     rather than part of the calm-glass system the rest of the page lives in.
 *   - Chip-style social links matching the hero's "popular questions" pills,
 *     so the contact column reads as a deliberate continuation of the page
 *     above instead of a list of bare anchors.
 *   - Generous padding (`py-12 md:py-16`) so the footer feels like the page's
 *     close, not a strip pasted at the bottom.
 *
 * Owns its own bilingual copy and social-link config — the landing page's
 * `COPY` constant doesn't need to know about the footer, and other public
 * routes can drop the component in without threading copy through props.
 * ------------------------------------------------------------------------- */

const PRIMARY_EMAIL = personalInfo.contact.emails[0] ?? '';

const COPY = {
    blurb: {
        de: 'Freelance Software-Architekt und KI-Engineer. Digitalisierung, KI-Workflows und Web-Architektur — für Unternehmen, die liefern müssen.',
        en: 'Freelance software architect and AI engineer. Digitalisation, AI workflows and web architecture — for companies that need to ship.',
    },
    explore: {
        heading: { de: 'Entdecken', en: 'Explore' },
        items: [
            { to: '/{-$locale}/about', label: { de: 'Über mich', en: 'About me' }, icon: UserRoundIcon },
            { to: '/{-$locale}/cv', label: { de: 'Lebenslauf', en: 'CV' }, icon: FileTextIcon },
            { to: '/{-$locale}/projects', label: { de: 'Projekte', en: 'Projects' }, icon: FolderGitIcon },
        ] as const,
    },
    contact: {
        heading: { de: 'Kontakt', en: 'Get in touch' },
    },
    legal: {
        impressum: { de: 'Impressum', en: 'Impressum' },
        datenschutz: { de: 'Datenschutz', en: 'Privacy' },
    },
    madeIn: {
        de: 'Gestaltet und gebaut in Deutschland.',
        en: 'Designed and built in Germany.',
    },
    copyright: {
        de: 'Alle Rechte vorbehalten.',
        en: 'All rights reserved.',
    },
};

const SOCIAL_LINKS: ReadonlyArray<{
    href: string;
    label: { de: string; en: string };
    icon: typeof CodeXmlIcon;
    visible: boolean;
}> = [
    {
        href: personalInfo.contact.github.url,
        label: { de: 'GitHub', en: 'GitHub' },
        icon: CodeXmlIcon,
        visible: personalInfo.publicVisibility.github,
    },
    {
        href: personalInfo.contact.linkedin.url,
        label: { de: 'LinkedIn', en: 'LinkedIn' },
        icon: BriefcaseIcon,
        visible: personalInfo.publicVisibility.linkedin,
    },
    {
        href: `mailto:${PRIMARY_EMAIL}`,
        label: { de: 'E-Mail', en: 'Email' },
        icon: MailIcon,
        visible: personalInfo.publicVisibility.emails && PRIMARY_EMAIL.length > 0,
    },
];

export function Footer() {
    const locale = useLocale();
    const year = new Date().getFullYear();

    return (
        <footer className="relative mt-24">
            {/* Brand-tinted hairline accent — fades from transparent through
             *  primary back to transparent. Replaces the flat `border-t` so
             *  the footer is set off from the page without a hard line. */}
            <div
                aria-hidden
                className="bg-linear-to-r pointer-events-none absolute inset-x-0 top-0 h-px from-transparent via-primary/40 to-transparent"
            />

            <div className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16 lg:px-16">
                <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1.2fr] md:gap-12">
                    <div className="flex flex-col gap-4">
                        <Link to="/{-$locale}" className="inline-flex items-center gap-3 self-start">
                            <img src="/favicon.ico" className="size-9 dark:hidden" alt="" />
                            <img src="/favicon-dark.ico" className="hidden size-9 dark:block" alt="" />
                            <span className="font-display text-base font-semibold tracking-tight">Cem Yilmaz</span>
                        </Link>
                        <p className="max-w-sm text-sm leading-relaxed text-foreground/70">{COPY.blurb[locale]}</p>
                    </div>

                    <nav aria-label={COPY.explore.heading[locale]} className="flex flex-col gap-3">
                        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/55">
                            {COPY.explore.heading[locale]}
                        </h2>
                        <ul className="flex flex-col gap-2 text-sm">
                            {COPY.explore.items.map(({ to, label, icon: Icon }) => (
                                <li key={to}>
                                    <Link
                                        to={to}
                                        className="-mx-2 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-primary active:bg-foreground/10 active:text-primary"
                                    >
                                        <Icon className="size-3.5 text-foreground/45" />
                                        {label[locale]}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="flex flex-col gap-3">
                        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-foreground/55">
                            {COPY.contact.heading[locale]}
                        </h2>
                        <ul className="flex flex-wrap gap-2">
                            {SOCIAL_LINKS.filter((link) => link.visible).map(({ href, label, icon: Icon }) => {
                                const isExternal = !href.startsWith('mailto:');
                                return (
                                    <li key={href}>
                                        <a
                                            href={href}
                                            target={isExternal ? '_blank' : undefined}
                                            rel={isExternal ? 'noreferrer' : undefined}
                                            className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/40 px-3 py-1.5 text-sm text-foreground/85 backdrop-blur-md transition-colors hover:bg-white/70 hover:text-primary dark:border-white/10 dark:bg-white/4 dark:hover:bg-white/8"
                                        >
                                            <Icon className="size-3.5" />
                                            {label[locale]}
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                <div className="mt-10 flex flex-col gap-3 border-t border-foreground/10 pt-6 text-xs text-muted-foreground md:mt-12 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                            © {year} Cem Yilmaz. {COPY.copyright[locale]}
                        </span>
                        <span aria-hidden className="hidden md:inline">
                            ·
                        </span>
                        <span>{COPY.madeIn[locale]}</span>
                    </div>
                    <nav className="-mx-2 flex gap-2">
                        <Link
                            to="/{-$locale}/impressum"
                            className="rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10 active:text-foreground"
                        >
                            {COPY.legal.impressum[locale]}
                        </Link>
                        <Link
                            to="/{-$locale}/datenschutz"
                            className="rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10 active:text-foreground"
                        >
                            {COPY.legal.datenschutz[locale]}
                        </Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}
