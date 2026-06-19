import { createFileRoute, Link } from '@tanstack/react-router';
import { CodeXmlIcon } from 'lucide-react';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

const COPY = {
    title: { de: 'Softwareentwicklung & Architektur', en: 'Software development & architecture' },
    description: {
        de: 'Code, Architektur-Notizen, Werkzeuge.',
        en: 'Code, architecture notes, tools.',
    },
    body: {
        de: 'Dieser Bereich wird gerade aufgebaut. Hier landen Notizen, Architektur-Skizzen und Links rund um Softwareentwicklung.',
        en: 'This area is being built out. Notes, architecture sketches, and links around software development will live here.',
    },
    comingSoon: { de: 'Bald verfügbar', en: 'Coming soon' },
    back: { de: '← Workspace', en: '← Workspace' },
};

export const Route = createFileRoute('/{-$locale}/workspace/software')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.title[locale],
            description: COPY.description[locale],
            path: '/workspace/software',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: SoftwareArea,
});

function SoftwareArea() {
    const locale = useLocale();
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <Link to="/{-$locale}/workspace" className="text-sm text-muted-foreground hover:text-foreground">
                {COPY.back[locale]}
            </Link>
            <div className="mt-6 flex items-center gap-3 text-primary">
                <CodeXmlIcon className="size-6" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{COPY.title[locale]}</h1>
            </div>
            <p className="mt-6">{COPY.body[locale]}</p>
            <p className="mt-8 text-sm text-muted-foreground">{COPY.comingSoon[locale]}</p>
        </main>
    );
}
