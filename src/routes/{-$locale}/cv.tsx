import { createFileRoute } from '@tanstack/react-router';
import { DownloadIcon } from 'lucide-react';
import { Button } from '../../web/components/base/button';
import type { CvTimelineEntry } from '../../web/components/CvTimeline';
import { CvTimeline } from '../../web/components/CvTimeline';
import { Footer } from '../../web/components/Footer';
import { Header } from '../../web/components/Header';
import { Reveal } from '../../web/components/Reveal';
import type { GqlCCvPageQuery } from '../../web/graphql/generated';
import { CvPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { useLocale } from '../../web/hooks/useLocale';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import type { Locale } from '../../web/utils/locale';
import { localeFromParam } from '../../web/utils/locale';

const title = { de: 'Lebenslauf', en: 'Curriculum Vitae' };
const intro = {
    de: 'Stationen, an denen ich Software gebaut habe — chronologisch.',
    en: 'Where I have built software, in chronological order.',
};

export const Route = createFileRoute('/{-$locale}/cv')({
    loader: () => routeLoaderGraphqlClient(CvPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: intro[locale],
            path: '/cv',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component: CvPage,
});

function CvPage() {
    const locale = useLocale();
    const data = Route.useLoaderData();
    const experience = data.cv.experience;
    const education = data.cv.education;
    const stats = computeStats(experience, locale);
    // Admin-only "Workspace" entry in the header — non-admins (including
    // anonymous visitors) get `user.admin = null` and never see it. Same
    // probe as the landing page. See `docs/architecture/workspace-access.md`.
    const isAdmin = data.currentSession.user?.admin != null;

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header subtitle={`/ ${title[locale].toLowerCase()}`} showWorkspaceLink={isAdmin} />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full pb-16">
                <header className="py-12 md:py-16">
                    <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-12">
                        <div className="max-w-2xl">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{title[locale]}</h1>
                            <p className="mt-4 text-base md:text-lg text-muted-foreground">{intro[locale]}</p>
                            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground/80">{stats.yearsLabel}</span>
                                <span aria-hidden className="text-muted-foreground/50">
                                    •
                                </span>
                                <span>{stats.stationsLabel}</span>
                                <span aria-hidden className="text-muted-foreground/50">
                                    •
                                </span>
                                <span>
                                    {
                                        {
                                            de: 'Karlsruhe, Heidelberg, Frankfurt am Main, Hamburg',
                                            en: 'Karlsruhe, Heidelberg, Frankfurt am Main, Hamburg',
                                        }[locale]
                                    }
                                </span>
                            </div>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            size="default"
                            title={{ de: 'Lebenslauf.pdf · öffnet im neuen Tab', en: 'Lebenslauf.pdf · opens in a new tab' }[locale]}
                            className="self-start md:self-end border-brand/40 bg-brand/10 text-brand hover:bg-brand/15 hover:text-brand active:bg-brand/20 dark:border-brand/50 dark:bg-brand/15 dark:hover:bg-brand/25"
                        >
                            <a href="/Lebenslauf.pdf" target="_blank" rel="noreferrer">
                                <DownloadIcon className="size-4" />
                                {{ de: 'PDF herunterladen', en: 'Download PDF' }[locale]}
                            </a>
                        </Button>
                    </div>
                </header>

                <section className="mt-4">
                    <Reveal>
                        <h2 id="experience" className="mb-6 text-2xl font-semibold tracking-tight scroll-mt-24">
                            {{ de: 'Berufserfahrung', en: 'Experience' }[locale]}
                        </h2>
                    </Reveal>
                    <CvTimeline entries={experience.map((row) => mapExperience(row, locale))} locale={locale} />
                </section>

                <section className="mt-12">
                    <Reveal>
                        <h2 id="education" className="mb-6 text-2xl font-semibold tracking-tight scroll-mt-24">
                            {{ de: 'Ausbildung', en: 'Education' }[locale]}
                        </h2>
                    </Reveal>
                    <CvTimeline entries={education.map((row) => mapEducation(row, locale))} locale={locale} />
                </section>
            </main>
            <Footer />
        </div>
    );
}

type ExperienceRow = GqlCCvPageQuery['cv']['experience'][number];
type EducationRow = GqlCCvPageQuery['cv']['education'][number];

function mapExperience(row: ExperienceRow, locale: Locale): CvTimelineEntry {
    const description = locale === 'de' ? row.descriptionDe : row.descriptionEn;
    const role = locale === 'de' ? row.roleDe : row.roleEn;
    const managerNote = row.managerName ? `${{ de: 'Manager', en: 'Manager' }[locale]}: ${row.managerName}` : null;
    return {
        id: row.cvExperienceId,
        title: role,
        subtitle: row.company,
        startDate: row.startDate,
        endDate: row.endDate,
        description,
        technologies: row.technologies,
        footnote: managerNote,
    };
}

function mapEducation(row: EducationRow, locale: Locale): CvTimelineEntry {
    const degree = locale === 'de' ? row.degreeDe : row.degreeEn;
    const subject = locale === 'de' ? row.subjectDe : row.subjectEn;
    const notes = locale === 'de' ? row.notesDe : row.notesEn;
    return {
        id: row.cvEducationId,
        title: subject ? `${degree} — ${subject}` : degree,
        subtitle: row.institution,
        startDate: row.startDate ?? null,
        endDate: row.endDate,
        footnote: notes || null,
    };
}

// Derive the header stat strip from the loader data so it never drifts from
// the CV itself. We round years down (8.7y → "8+ years") and count distinct
// stations rather than rows so multiple parallel engagements at one company
// don't double-count.
function computeStats(experience: ReadonlyArray<ExperienceRow>, locale: Locale): { yearsLabel: string; stationsLabel: string } {
    const startTimes = experience.map((row) => new Date(row.startDate).getTime()).filter((t) => !Number.isNaN(t));
    const earliestStart = startTimes.length > 0 ? Math.min(...startTimes) : null;
    const years = earliestStart !== null ? Math.floor((Date.now() - earliestStart) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
    const distinctCompanies = new Set(experience.map((row) => row.company)).size;
    return {
        yearsLabel: { de: `${years}+ Jahre Erfahrung`, en: `${years}+ years of experience` }[locale],
        stationsLabel: {
            de: `${distinctCompanies} ${distinctCompanies === 1 ? 'Station' : 'Stationen'}`,
            en: `${distinctCompanies} ${distinctCompanies === 1 ? 'station' : 'stations'}`,
        }[locale],
    };
}
