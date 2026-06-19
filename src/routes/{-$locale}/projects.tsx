import { createFileRoute } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';
import { GlassCard } from '../../web/components/GlassCard';
import { Header } from '../../web/components/Header';
import { portfolioProjects } from '../../web/content/portfolioProjects';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import type { Locale } from '../../web/utils/locale';
import { localeFromParam } from '../../web/utils/locale';

const COPY = {
    title: { de: 'Projekte', en: 'Projects' },
    intro: {
        de: 'Eine Auswahl von Dingen, die ich gebaut habe.',
        en: 'A selection of things I have built.',
    },
    roleLabel: { de: 'Rolle', en: 'Role' },
    techStackLabel: { de: 'Tech-Stack', en: 'Tech stack' },
    visitLabel: { de: 'Besuchen', en: 'Visit site' },
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
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-4xl mx-auto w-full pb-16">
                <header className="py-12 md:py-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{COPY.title[locale]}</h1>
                    <p className="mt-4 text-lg md:text-xl text-muted-foreground">{COPY.intro[locale]}</p>
                </header>

                <ul className="flex flex-col gap-6">
                    {portfolioProjects.map((project) => (
                        <li key={project.id}>
                            <ProjectCard project={project} locale={locale} />
                        </li>
                    ))}
                </ul>
            </main>
        </div>
    );
}

type Project = (typeof portfolioProjects)[number];

function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
    const role = locale === 'de' ? project.roleDe : project.roleEn;
    const tagline = locale === 'de' ? project.taglineDe : project.taglineEn;
    const description = locale === 'de' ? project.descriptionDe : project.descriptionEn;

    return (
        <GlassCard className="px-6 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-semibold tracking-tight">{project.name}</h2>
                        <p className="text-sm text-muted-foreground">{tagline}</p>
                    </div>
                    <RoleBadge label={COPY.roleLabel[locale]} value={role} />
                </div>

                <p className="text-base leading-relaxed">{description}</p>

                <TechStack label={COPY.techStackLabel[locale]} items={project.techStack} />

                <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    {COPY.visitLabel[locale]}
                    <ExternalLinkIcon className="size-4" />
                </a>
            </div>
        </GlassCard>
    );
}

function RoleBadge({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-sm font-medium">{value}</div>
        </div>
    );
}

function TechStack({ label, items }: { label: string; items: ReadonlyArray<string> }) {
    return (
        <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <ul className="flex flex-wrap gap-2">
                {items.map((tech) => (
                    <li
                        key={tech}
                        className="rounded-full border border-white/40 bg-white/30 px-3 py-1 text-xs font-medium dark:border-white/10 dark:bg-white/5"
                    >
                        {tech}
                    </li>
                ))}
            </ul>
        </div>
    );
}
