import { createFileRoute } from '@tanstack/react-router';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

const title = { de: 'Reisen', en: 'Travel' };

export const Route = createFileRoute('/{-$locale}/workspace/travel')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: {
                de: 'Reisen, Packlisten und Vorbereitungen.',
                en: 'Trips, packing lists, and pre-trip prep.',
            }[locale],
            path: '/workspace/travel',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: TravelArea,
});

function TravelArea() {
    const locale = useLocale();
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <p>
                {
                    {
                        de: 'Dieser Bereich wird gerade aufgebaut. Hier landen anstehende Reisen, wiederverwendbare Packlisten und Aufgaben, die vor der Abreise erledigt sein müssen.',
                        en: 'This area is being built out. Upcoming trips, reusable packing lists, and pre-departure todos will live here.',
                    }[locale]
                }
            </p>
            <p className="mt-8 text-sm text-muted-foreground">{{ de: 'Bald verfügbar', en: 'Coming soon' }[locale]}</p>
        </main>
    );
}
