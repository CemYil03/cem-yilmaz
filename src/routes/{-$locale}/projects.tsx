import { createFileRoute } from '@tanstack/react-router';
import { CodeXmlIcon, ExternalLinkIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GlassCard } from '../../web/components/GlassCard';
import { Header } from '../../web/components/Header';
import { portfolioProjects } from '../../web/content/portfolioProjects';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { cn } from '../../web/utils/cn';
import type { Locale } from '../../web/utils/locale';
import { localeFromParam } from '../../web/utils/locale';

const COPY = {
    title: { de: 'Projekte', en: 'Projects' },
    intro: {
        de: 'Eine Auswahl von Dingen, die ich gebaut habe.',
        en: 'A selection of things I have built.',
    },
    visitLabel: { de: 'Besuchen', en: 'Visit site' },
    repoLabel: { de: 'Quellcode', en: 'View source' },
    galleryLabel: { de: 'Bildergalerie', en: 'Gallery' },
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

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full pb-24">
                <header className="py-12 md:py-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{COPY.title[locale]}</h1>
                    <p className="mt-4 text-lg md:text-xl text-muted-foreground">{COPY.intro[locale]}</p>
                </header>

                <div className="flex flex-col gap-16 md:gap-24">
                    {portfolioProjects.map((project, index) => (
                        <ProjectRow key={project.id} project={project} locale={locale} reverse={index % 2 === 1} />
                    ))}
                </div>
            </main>
        </div>
    );
}

type Project = (typeof portfolioProjects)[number];

function ProjectRow({ project, locale, reverse }: { project: Project; locale: Locale; reverse: boolean }) {
    const role = locale === 'de' ? project.roleDe : project.roleEn;
    const tagline = locale === 'de' ? project.taglineDe : project.taglineEn;
    const description = locale === 'de' ? project.descriptionDe : project.descriptionEn;
    const visible = useFadeInOnScroll();

    return (
        <article
            ref={visible.ref}
            className={cn(
                'grid gap-8 md:grid-cols-12 md:items-center transition-all duration-700 ease-out motion-reduce:transition-none',
                visible.shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
            )}
        >
            <div className={cn('md:col-span-7', reverse ? 'md:order-2' : 'md:order-1')}>
                <ProjectGallery project={project} locale={locale} />
            </div>

            <div className={cn('md:col-span-5 flex flex-col gap-4', reverse ? 'md:order-1' : 'md:order-2')}>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>{role}</span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{hostnameOf(project.url)}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{project.name}</h2>
                <p className="text-base md:text-lg text-muted-foreground">{tagline}</p>
                <p className="text-base leading-relaxed">{description}</p>
                <TechStack items={project.techStack} />
                <div className="mt-2 flex flex-wrap gap-3">
                    <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        {COPY.visitLabel[locale]}
                        <ExternalLinkIcon className="size-4" />
                    </a>
                    {project.repoUrl && (
                        <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/5"
                        >
                            <CodeXmlIcon className="size-4" />
                            {COPY.repoLabel[locale]}
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}

// Gallery state lives one level above the hero so the thumbnail strip can
// drive it. The hero cross-fades between source images by stacking them
// absolutely and toggling opacity. Single-image projects skip the strip
// entirely and render exactly like the previous static hero.
function ProjectGallery({ project, locale }: { project: Project; locale: Locale }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const active = project.images[activeIndex] ?? project.images[0];
    if (!active) return null;
    const activeAlt = locale === 'de' ? active.altDe : active.altEn;

    return (
        <div className="flex flex-col gap-3">
            <ProjectHero project={project} active={active} activeAlt={activeAlt} />
            {project.images.length > 1 && (
                <ThumbStrip project={project} locale={locale} activeIndex={activeIndex} onSelect={setActiveIndex} />
            )}
        </div>
    );
}

function ProjectHero({ project, active, activeAlt }: { project: Project; active: Project['images'][number]; activeAlt: string }) {
    const inner = (
        <>
            {project.images.map((image, i) => (
                <img
                    key={image.src}
                    src={image.src}
                    alt={image.src === active.src ? activeAlt : ''}
                    aria-hidden={image.src !== active.src}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className={cn(
                        'block w-full aspect-video object-cover',
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
        <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={activeAlt}
            className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl group/hero"
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
        </a>
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
                                    : 'border-white/40 dark:border-white/10 opacity-60 hover:opacity-100',
                            )}
                        >
                            <img
                                src={image.src}
                                alt=""
                                aria-hidden
                                loading="lazy"
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

function TechStack({ items }: { items: ReadonlyArray<string> }) {
    return (
        <ul className="flex flex-wrap gap-2">
            {items.map((tech) => (
                <li
                    key={tech}
                    className="rounded-full border border-white/40 bg-white/30 px-2.5 py-0.5 text-xs font-medium dark:border-white/10 dark:bg-white/5"
                >
                    {tech}
                </li>
            ))}
        </ul>
    );
}

// Toggles a one-way `shown` flag the first time the element scrolls into the
// viewport. Used to fade rows up as the visitor reaches them. SSR-safe: the
// flag starts `false`, the observer is set up only on the client, and
// reduced-motion users get the final state immediately.
function useFadeInOnScroll() {
    const ref = useRef<HTMLElement | null>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setShown(true);
            return;
        }
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setShown(true);
                        observer.disconnect();
                        break;
                    }
                }
            },
            { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return { ref, shown };
}
