import { createFileRoute } from '@tanstack/react-router';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

const title = { de: 'Filme & Serien', en: 'Movies & TV shows' };

export const Route = createFileRoute('/{-$locale}/workspace/media')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: { de: 'Watchlist und was ich zuletzt gesehen habe.', en: 'Watchlist and what I have watched recently.' }[locale],
            path: '/workspace/media',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: MediaArea,
});

function MediaArea() {
    const locale = useLocale();
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <p>
                {
                    {
                        de: 'Dieser Bereich wird gerade aufgebaut. Hier landen Watchlist, kurze Notizen zu Filmen und Serien und was ich zuletzt gesehen habe.',
                        en: 'This area is being built out. The watchlist, short notes on films and series, and recently-watched will live here.',
                    }[locale]
                }
            </p>
            <p className="mt-8 text-sm text-muted-foreground">{{ de: 'Bald verfügbar', en: 'Coming soon' }[locale]}</p>
        </main>
    );
}
