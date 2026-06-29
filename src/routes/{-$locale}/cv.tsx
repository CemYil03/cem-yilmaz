import { createFileRoute } from '@tanstack/react-router';
import { DownloadIcon } from 'lucide-react';
import { Button } from '../../web/components/base/button';
import type { CvTimelineEntry } from '../../web/components/CvTimeline';
import { CvTimeline } from '../../web/components/CvTimeline';
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

const COPY = {
    title: { de: 'Lebenslauf', en: 'Curriculum Vitae' },
    intro: {
        de: 'Stationen, an denen ich Software gebaut habe — chronologisch.',
        en: 'Where I have built software, in chronological order.',
    },
    sections: {
        experience: { de: 'Berufserfahrung', en: 'Experience' },
        education: { de: 'Ausbildung', en: 'Education' },
    },
    managerLabel: { de: 'Manager', en: 'Manager' },
    download: { de: 'PDF herunterladen', en: 'Download PDF' },
};

export const Route = createFileRoute('/{-$locale}/cv')({
    loader: () => routeLoaderGraphqlClient(CvPageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.title[locale],
            description: COPY.intro[locale],
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

    return (
        <div className="min-h-screen flex flex-col overflow-x-clip">
            <Header subtitle={`/ ${COPY.title[locale].toLowerCase()}`} />
            <main className="flex-1 px-6 md:px-10 lg:px-16 max-w-6xl mx-auto w-full pb-16">
                <header className="py-12 md:py-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{COPY.title[locale]}</h1>
                    <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground">{COPY.intro[locale]}</p>
                    <Button asChild variant="outline" size="default" className="mt-6">
                        <a href="/Lebenslauf.pdf" target="_blank" rel="noreferrer">
                            <DownloadIcon className="size-4" />
                            {COPY.download[locale]}
                        </a>
                    </Button>
                </header>

                <Reveal as="section" className="mt-4">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">{COPY.sections.experience[locale]}</h2>
                    <CvTimeline entries={experience.map((row) => mapExperience(row, locale))} locale={locale} />
                </Reveal>

                <Reveal as="section" className="mt-12">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">{COPY.sections.education[locale]}</h2>
                    <CvTimeline entries={education.map((row) => mapEducation(row, locale))} locale={locale} />
                </Reveal>
            </main>
        </div>
    );
}

type ExperienceRow = GqlCCvPageQuery['cv']['experience'][number];
type EducationRow = GqlCCvPageQuery['cv']['education'][number];

function mapExperience(row: ExperienceRow, locale: Locale): CvTimelineEntry {
    const description = locale === 'de' ? row.descriptionDe : row.descriptionEn;
    const role = locale === 'de' ? row.roleDe : row.roleEn;
    const company = locale === 'de' ? row.companyDe : row.companyEn;
    const managerNote = row.managerName ? `${COPY.managerLabel[locale]}: ${row.managerName}` : null;
    return {
        id: row.cvExperienceId,
        title: role,
        subtitle: company,
        startDate: row.startDate,
        endDate: row.endDate,
        description,
        technologies: row.technologies,
        footnote: managerNote,
    };
}

function mapEducation(row: EducationRow, locale: Locale): CvTimelineEntry {
    const degree = locale === 'de' ? row.degreeDe : row.degreeEn;
    const institution = locale === 'de' ? row.institutionDe : row.institutionEn;
    const subject = locale === 'de' ? row.subjectDe : row.subjectEn;
    const notes = locale === 'de' ? row.notesDe : row.notesEn;
    return {
        id: row.cvEducationId,
        title: subject ? `${degree} — ${subject}` : degree,
        subtitle: institution,
        startDate: row.startDate ?? null,
        endDate: row.endDate,
        footnote: notes || null,
    };
}
