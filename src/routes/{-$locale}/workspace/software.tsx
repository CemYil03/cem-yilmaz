import { createFileRoute } from '@tanstack/react-router';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

const title = { de: 'Softwareentwicklung & Architektur', en: 'Software development & architecture' };

export const Route = createFileRoute('/{-$locale}/workspace/software')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: { de: 'Code, Architektur-Notizen, Werkzeuge.', en: 'Code, architecture notes, tools.' }[locale],
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
            <p>
                {
                    {
                        de: 'Dieser Bereich wird gerade aufgebaut. Hier landen Notizen, Architektur-Skizzen und Links rund um Softwareentwicklung.',
                        en: 'This area is being built out. Notes, architecture sketches, and links around software development will live here.',
                    }[locale]
                }
            </p>
            <p className="mt-8 text-sm text-muted-foreground">{{ de: 'Bald verfügbar', en: 'Coming soon' }[locale]}</p>
        </main>
    );
}
