import { createFileRoute, Link } from '@tanstack/react-router';
import { StethoscopeIcon } from 'lucide-react';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

const COPY = {
    title: { de: 'Medizinisches', en: 'Medical' },
    description: {
        de: 'Termine, Befunde und Notizen zur Gesundheit.',
        en: 'Appointments, results, and health notes.',
    },
    body: {
        de: 'Dieser Bereich wird gerade aufgebaut. Hier landen Arzttermine, Befunde, Medikation und Notizen zur Gesundheit.',
        en: 'This area is being built out. Appointments, results, medications, and health notes will live here.',
    },
    comingSoon: { de: 'Bald verfügbar', en: 'Coming soon' },
    back: { de: '← Workspace', en: '← Workspace' },
};

export const Route = createFileRoute('/{-$locale}/workspace/medical')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.title[locale],
            description: COPY.description[locale],
            path: '/workspace/medical',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: MedicalArea,
});

function MedicalArea() {
    const locale = useLocale();
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <Link to="/{-$locale}/workspace" className="text-sm text-muted-foreground hover:text-foreground">
                {COPY.back[locale]}
            </Link>
            <div className="mt-6 flex items-center gap-3 text-primary">
                <StethoscopeIcon className="size-6" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{COPY.title[locale]}</h1>
            </div>
            <p className="mt-6">{COPY.body[locale]}</p>
            <p className="mt-8 text-sm text-muted-foreground">{COPY.comingSoon[locale]}</p>
        </main>
    );
}
