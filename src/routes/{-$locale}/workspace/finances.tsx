import { createFileRoute, Link } from '@tanstack/react-router';
import { WalletIcon } from 'lucide-react';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

const COPY = {
    title: { de: 'Finanzen', en: 'Finances' },
    description: {
        de: 'Finanzielle Ziele, Überblick, Trading und Aktien.',
        en: 'Financial goals, overview, trading and stocks.',
    },
    body: {
        de: 'Dieser Bereich wird gerade aufgebaut. Hier landen finanzielle Ziele, ein allgemeiner Überblick sowie Watchlists, Notizen zu Strategien und Beobachtungen vom Aktienmarkt.',
        en: 'This area is being built out. Financial goals, a general overview, plus watchlists, strategy notes, and stock-market observations will live here.',
    },
    comingSoon: { de: 'Bald verfügbar', en: 'Coming soon' },
    back: { de: '← Workspace', en: '← Workspace' },
};

export const Route = createFileRoute('/{-$locale}/workspace/finances')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.title[locale],
            description: COPY.description[locale],
            path: '/workspace/finances',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: FinancesArea,
});

function FinancesArea() {
    const locale = useLocale();
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <Link to="/{-$locale}/workspace" className="text-sm text-muted-foreground hover:text-foreground">
                {COPY.back[locale]}
            </Link>
            <div className="mt-6 flex items-center gap-3 text-primary">
                <WalletIcon className="size-6" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{COPY.title[locale]}</h1>
            </div>
            <p className="mt-6">{COPY.body[locale]}</p>
            <p className="mt-8 text-sm text-muted-foreground">{COPY.comingSoon[locale]}</p>
        </main>
    );
}
