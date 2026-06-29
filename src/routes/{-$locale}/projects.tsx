import { createFileRoute } from '@tanstack/react-router';
import { CalendarClockIcon, ChevronLeftIcon, ChevronRightIcon, CodeXmlIcon, ExternalLinkIcon, MailIcon, SendIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useVisitorChat } from '../../web/chat/VisitorChatProvider';
import { Button } from '../../web/components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../web/components/base/dialog';
import { GlassCard } from '../../web/components/GlassCard';
import { Header } from '../../web/components/Header';
import { Reveal } from '../../web/components/Reveal';
import { personalInfo } from '../../web/content/personalInfo';
import { portfolioProjects } from '../../web/content/portfolioProjects';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { cn } from '../../web/utils/cn';
import type { Locale } from '../../web/utils/locale';
import { localeFromParam } from '../../web/utils/locale';

const PRIMARY_EMAIL = personalInfo.contact.emails[0] ?? '';

const COPY = {
    title: { de: 'Projekte', en: 'Projects' },
    intro: {
        de: 'Eine Auswahl meiner Projekte — die, die ich öffentlich zeigen kann.',
        en: 'A selection of my projects — the ones I can share publicly.',
    },
    visitLabel: { de: 'Besuchen', en: 'Visit site' },
    repoLabel: { de: 'Quellcode', en: 'View source' },
    galleryLabel: { de: 'Bildergalerie', en: 'Gallery' },
    openImage: { de: 'Bild vergrößern', en: 'Open image' },
    previousImage: { de: 'Vorheriges Bild', en: 'Previous image' },
    nextImage: { de: 'Nächstes Bild', en: 'Next image' },
    imagePosition: { de: 'Bild {current} von {total}', en: 'Image {current} of {total}' },
    cta: {
        availability: {
            de: 'Aktuell Kapazität für 1 Projekt ab {month}',
            en: 'Currently capacity for 1 project from {month}',
        },
        heading: {
            de: 'Etwas Ähnliches im Kopf?',
            en: 'Got something similar in mind?',
        },
        subheading: {
            de: 'Skizziere kurz, woran du arbeitest — der Assistent stellt ein paar gezielte Fragen, fasst das Briefing zusammen und schickt es mir per E-Mail. Du bekommst eine Antwort von mir, in der Regel innerhalb von 24 Stunden.',
            en: 'Describe what you’re working on in a few sentences — the assistant asks a couple of focused questions, summarises the brief and sends it to me by email. You hear back from me, usually within 24 hours.',
        },
        primary: {
            label: { de: 'Projekt anfragen', en: 'Request a project' },
            seed: {
                de: 'Ich möchte ein Projekt mit Cem besprechen.',
                en: 'I’d like to discuss a project with Cem.',
            },
        },
        secondary: {
            label: { de: 'Erstgespräch buchen', en: 'Book an intro call' },
            seed: {
                de: 'Ich würde gerne ein kurzes Erstgespräch mit Cem vereinbaren.',
                en: 'I’d like to schedule a short intro call with Cem.',
            },
        },
        emailLabel: {
            de: 'Lieber direkt per E-Mail',
            en: 'Prefer email instead',
        },
    },
};

export const Route = createFileRoute('/{-$locale}/projects')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.title[locale],
            description: COPY.intro[locale],
            path: '/projects',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component: ProjectsPage,
});

function ProjectsPage() {
    const locale = useLocale();
    const { openWithMessage } = useVisitorChat();

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header subtitle={`/ ${COPY.title[locale].toLowerCase()}`} />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-5xl mx-auto w-full pb-24">
                <header className="py-12 md:py-16">
                    <h1 className="text-2xl font-bold tracking-tight">{COPY.title[locale]}</h1>
                    <p className="mt-4 text-lg text-muted-foreground">{COPY.intro[locale]}</p>
                </header>

                <div className="flex flex-col gap-20 md:gap-28">
                    {portfolioProjects.map((project, index) => (
                        <Reveal key={project.id} as="div">
                            <ProjectRow project={project} locale={locale} index={index} total={portfolioProjects.length} />
                        </Reveal>
                    ))}
                </div>

                <CallToAction locale={locale} onOpenChat={(text) => openWithMessage(text)} />
            </main>
        </div>
    );
}

type Project = (typeof portfolioProjects)[number];

// One project as a magazine-style spread, all columns capped at the same
// width as the hero so the row reads as a single coherent unit rather
// than a wide hero floating above a wider meta block. The meta block
// below the gallery is two columns on desktop — narrative + primary
// action on the left (8/12), a quiet spec card on the right (4/12) — and
// a single column on mobile. Each row carries a `01 / 03` counter at the
// top so visitors know the list is finite.
function ProjectRow({ project, locale, index, total }: { project: Project; locale: Locale; index: number; total: number }) {
    const role = locale === 'de' ? project.roleDe : project.roleEn;
    const description = locale === 'de' ? project.descriptionDe : project.descriptionEn;
    const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

    return (
        <article className="mx-auto w-full max-w-3xl flex flex-col gap-8">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span className="tabular-nums text-foreground/60">{counter}</span>
                <span aria-hidden className="h-px flex-1 bg-foreground/10" />
                <span className="text-foreground/75">{role}</span>
            </div>

            <ProjectGallery project={project} locale={locale} />

            <div className="grid gap-8 md:gap-10 md:grid-cols-12 md:items-start">
                <div className="md:col-span-8 flex flex-col gap-4">
                    <div className="flex flex-col gap-3">
                        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{project.name}</h2>
                        {project.facts && project.facts.length > 0 && <FactBadges items={project.facts} />}
                    </div>
                    <p className="text-base leading-relaxed text-foreground/85">{description}</p>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <Button asChild size="lg" className="w-full sm:w-auto">
                            <a href={project.url} target="_blank" rel="noopener noreferrer">
                                {COPY.visitLabel[locale]}
                                <ExternalLinkIcon className="size-4" />
                            </a>
                        </Button>
                        {project.repoUrl && (
                            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                                <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                                    <CodeXmlIcon className="size-4" />
                                    {COPY.repoLabel[locale]}
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="md:col-span-4 md:pt-1">
                    <TechStack items={project.techStack} locale={locale} />
                </div>
            </div>
        </article>
    );
}

// Gallery state lives one level above the hero so the thumbnail strip and
// the lightbox can both drive it. The hero cross-fades between source
// images in place (thumb click); clicking the hero opens the lightbox
// dialog, which renders the same images in isolation with prev/next
// controls. The lightbox shares `activeIndex` with the inline hero so
// closing it leaves the inline gallery on whichever image the visitor
// last viewed.
function ProjectGallery({ project, locale }: { project: Project; locale: Locale }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isLightboxOpen, setLightboxOpen] = useState(false);
    const active = project.images[activeIndex] ?? project.images[0];
    if (!active) return null;
    const activeAlt = locale === 'de' ? active.altDe : active.altEn;

    return (
        <div className="flex flex-col gap-3">
            <ProjectHero project={project} active={active} activeAlt={activeAlt} locale={locale} onOpen={() => setLightboxOpen(true)} />
            {project.images.length > 1 && (
                <ThumbStrip project={project} locale={locale} activeIndex={activeIndex} onSelect={setActiveIndex} />
            )}
            <ProjectLightbox
                project={project}
                locale={locale}
                activeIndex={activeIndex}
                onSelect={setActiveIndex}
                open={isLightboxOpen}
                onOpenChange={setLightboxOpen}
            />
        </div>
    );
}

function ProjectHero({
    project,
    active,
    activeAlt,
    locale,
    onOpen,
}: {
    project: Project;
    active: Project['images'][number];
    activeAlt: string;
    locale: Locale;
    onOpen: () => void;
}) {
    const inner = (
        <>
            {project.images.map((image, i) => (
                <img
                    key={image.src}
                    src={image.src}
                    alt={image.src === active.src ? activeAlt : ''}
                    aria-hidden={image.src !== active.src}
                    width={1600}
                    height={900}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding={i === 0 ? 'async' : 'async'}
                    className={cn(
                        'block w-full aspect-video object-cover max-h-[64vh]',
                        project.imageKind === 'browser' ? 'object-top' : 'object-center',
                        i === 0 ? 'relative' : 'absolute inset-0',
                        'transition-opacity duration-500 motion-reduce:transition-none',
                        image.src === active.src ? 'opacity-100' : 'opacity-0',
                    )}
                />
            ))}
        </>
    );

    return (
        <button
            type="button"
            onClick={onOpen}
            aria-label={`${activeAlt} — ${COPY.openImage[locale]}`}
            className="relative block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl group/hero"
        >
            {/* accent glow — sits behind the frame, brightens on hover */}
            <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 rounded-4xl opacity-50 blur-3xl transition-opacity duration-500 group-hover/hero:opacity-90 motion-reduce:transition-none"
                style={{ background: `radial-gradient(closest-side, ${project.accent}, transparent 70%)` }}
            />
            <div className="relative">
                {project.imageKind === 'browser' ? (
                    <BrowserFrame url={project.url}>
                        <div className="relative">{inner}</div>
                    </BrowserFrame>
                ) : (
                    <GlassCard className="overflow-hidden">
                        <div className="relative">{inner}</div>
                    </GlassCard>
                )}
            </div>
        </button>
    );
}

function ThumbStrip({
    project,
    locale,
    activeIndex,
    onSelect,
}: {
    project: Project;
    locale: Locale;
    activeIndex: number;
    onSelect: (index: number) => void;
}) {
    return (
        <ul aria-label={COPY.galleryLabel[locale]} className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
            {project.images.map((image, i) => {
                const alt = locale === 'de' ? image.altDe : image.altEn;
                const isActive = i === activeIndex;
                return (
                    <li key={image.src} className="shrink-0">
                        <button
                            type="button"
                            onClick={() => onSelect(i)}
                            aria-label={alt}
                            aria-current={isActive ? 'true' : undefined}
                            className={cn(
                                'block overflow-hidden rounded-lg border transition-all duration-200 motion-reduce:transition-none cursor-pointer',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                isActive
                                    ? 'border-primary opacity-100'
                                    : 'border-white/40 dark:border-white/10 opacity-60 hover:opacity-100 active:opacity-80',
                            )}
                        >
                            <img
                                src={image.src}
                                alt=""
                                aria-hidden
                                width={1600}
                                height={900}
                                loading="lazy"
                                decoding="async"
                                className={cn(
                                    'block h-16 w-28 object-cover md:h-20 md:w-32',
                                    project.imageKind === 'browser' ? 'object-top' : 'object-center',
                                )}
                            />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

// Lightbox dialog — shows the active image in isolation on a dark
// overlay. Left / right arrow keys and the prev/next buttons walk
// through the gallery; the parent `activeIndex` is the source of truth,
// so the inline hero is in sync when the dialog closes. Wraps around at
// either end. Single-image projects don't render the prev/next controls.
function ProjectLightbox({
    project,
    locale,
    activeIndex,
    onSelect,
    open,
    onOpenChange,
}: {
    project: Project;
    locale: Locale;
    activeIndex: number;
    onSelect: (index: number) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const total = project.images.length;
    const active = project.images[activeIndex] ?? project.images[0];

    const goPrev = useCallback(() => onSelect((activeIndex - 1 + total) % total), [activeIndex, total, onSelect]);
    const goNext = useCallback(() => onSelect((activeIndex + 1) % total), [activeIndex, total, onSelect]);

    useEffect(() => {
        if (!open || total <= 1) return;
        function handleKey(event: KeyboardEvent) {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goPrev();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                goNext();
            }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, total, goPrev, goNext]);

    if (!active) return null;
    const activeAlt = locale === 'de' ? active.altDe : active.altEn;
    const positionLabel = COPY.imagePosition[locale].replace('{current}', String(activeIndex + 1)).replace('{total}', String(total));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-[min(96vw,84rem)] sm:max-w-[min(96vw,84rem)] border-none bg-transparent p-0 shadow-none"
                showCloseButton={false}
            >
                <DialogTitle className="sr-only">{project.name}</DialogTitle>
                <DialogDescription className="sr-only">{activeAlt}</DialogDescription>

                <div className="relative flex flex-col items-center gap-4">
                    <div className="relative w-full overflow-hidden rounded-2xl bg-black/30 backdrop-blur-sm">
                        <img
                            key={active.src}
                            src={active.src}
                            alt={activeAlt}
                            width={1600}
                            height={900}
                            className="block w-full max-h-[80vh] object-contain"
                        />

                        {total > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={goPrev}
                                    aria-label={COPY.previousImage[locale]}
                                    className="absolute top-1/2 left-3 -translate-y-1/2 inline-flex items-center justify-center size-10 rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                                >
                                    <ChevronLeftIcon className="size-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={goNext}
                                    aria-label={COPY.nextImage[locale]}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 inline-flex items-center justify-center size-10 rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                                >
                                    <ChevronRightIcon className="size-5" />
                                </button>
                            </>
                        )}
                    </div>

                    {total > 1 && (
                        <div className="text-xs text-white/80" aria-live="polite">
                            {positionLabel}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-white/55 bg-white/40 shadow-[0_24px_60px_-30px_oklch(0.4_0.1_260/0.45)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/4 dark:shadow-[0_24px_60px_-20px_oklch(0_0_0/0.6)]">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/40 bg-white/30 dark:border-white/8 dark:bg-white/3">
                <div className="flex gap-1.5" aria-hidden>
                    <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="size-2.5 rounded-full bg-[#febc2e]" />
                    <span className="size-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex-1 truncate rounded-md bg-white/40 px-2.5 py-1 text-center text-xs text-muted-foreground dark:bg-white/5">
                    {hostnameOf(url)}
                </div>
            </div>
            {children}
        </div>
    );
}

function hostnameOf(url: string) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '') + (parsed.pathname === '/' ? '' : parsed.pathname);
    } catch {
        return url;
    }
}

function FactBadges({ items }: { items: ReadonlyArray<string> }) {
    return (
        <ul className="flex flex-wrap gap-1.5">
            {items.map((fact) => (
                <li
                    key={fact}
                    className="rounded-full border border-white/55 bg-white/40 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-foreground/75 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
                >
                    {fact}
                </li>
            ))}
        </ul>
    );
}

// Tech stack as a labelled spec card on desktop, plain chip-row on mobile.
// On the wider viewport it sits in the right-hand column of the meta block
// as a quiet vertical list under a `Stack` heading — reads as a spec
// sheet rather than competing with the description. Below the `md`
// breakpoint the label collapses into a screen-reader-only heading and
// the items render as the same wrapping chip row used everywhere else,
// so the mobile rhythm stays unchanged.
function TechStack({ items, locale }: { items: ReadonlyArray<string>; locale: Locale }) {
    if (items.length === 0) return null;
    const label = locale === 'de' ? 'Stack' : 'Stack';
    return (
        <div className="flex flex-col gap-2.5">
            <span className="hidden md:inline text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
            <span className="md:hidden sr-only">{label}</span>
            <ul className="flex flex-wrap gap-1.5">
                {items.map((tech) => (
                    <li
                        key={tech}
                        className="rounded-full border border-white/40 bg-white/30 px-2.5 py-0.5 text-xs font-medium text-foreground/80 dark:border-white/10 dark:bg-white/5"
                    >
                        {tech}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function CallToAction({ locale, onOpenChat }: { locale: Locale; onOpenChat: (text: string) => void }) {
    const monthLabel = availabilityMonthLabel(locale);
    const availability = COPY.cta.availability[locale].replace('{month}', monthLabel);

    return (
        <section className="pt-24 md:pt-32">
            <Reveal>
                <GlassCard className="px-6 py-8 md:px-10 md:py-10">
                    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
                        <div className="max-w-2xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/40 px-3 py-1 text-xs font-medium tracking-wide text-foreground/80 backdrop-blur-md dark:border-white/10 dark:bg-white/4">
                                <CalendarClockIcon className="size-3.5 text-primary" />
                                {availability}
                            </span>
                            <h2 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">{COPY.cta.heading[locale]}</h2>
                            <p className="mt-3 text-sm md:text-base text-foreground/75 leading-relaxed">{COPY.cta.subheading[locale]}</p>
                        </div>
                        <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[16rem]">
                            <Button type="button" size="lg" onClick={() => onOpenChat(COPY.cta.primary.seed[locale])} className="w-full">
                                <SendIcon className="size-4" />
                                {COPY.cta.primary.label[locale]}
                            </Button>
                            <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                onClick={() => onOpenChat(COPY.cta.secondary.seed[locale])}
                                className="w-full"
                            >
                                <CalendarClockIcon className="size-4" />
                                {COPY.cta.secondary.label[locale]}
                            </Button>
                            {PRIMARY_EMAIL.length > 0 && (
                                <a
                                    href={`mailto:${PRIMARY_EMAIL}`}
                                    className="mt-1 inline-flex items-center justify-center gap-2 text-xs text-foreground/65 transition-colors hover:text-primary"
                                >
                                    <MailIcon className="size-3.5" />
                                    {COPY.cta.emailLabel[locale]}
                                </a>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </Reveal>
        </section>
    );
}

/**
 * Localised name of the month one calendar month from today — mirrors the
 * landing-page CTA so the availability badge advances automatically.
 */
function availabilityMonthLabel(locale: Locale): string {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const formatter = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
        month: 'long',
        year: 'numeric',
    });
    return formatter.format(next).replace(/\s/g, ' ');
}
