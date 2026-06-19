import { createFileRoute, Link } from '@tanstack/react-router';
import { DumbbellIcon } from 'lucide-react';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

const COPY = {
    title: { de: 'Fitness & Wohlbefinden', en: 'Fitness & well-being' },
    description: {
        de: 'Trainingspläne, Notizen, Fortschritt.',
        en: 'Training plans, notes, progress.',
    },
    body: {
        de: 'Dieser Bereich wird gerade aufgebaut. Hier landen Trainingspläne, Notizen zu Routinen und Fortschritt.',
        en: 'This area is being built out. Training plans, routine notes, and progress will live here.',
    },
    comingSoon: { de: 'Bald verfügbar', en: 'Coming soon' },
    back: { de: '← Workspace', en: '← Workspace' },
};

export const Route = createFileRoute('/{-$locale}/workspace/fitness')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: COPY.title[locale],
            description: COPY.description[locale],
            path: '/workspace/fitness',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: FitnessArea,
});

function FitnessArea() {
    const locale = useLocale();
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <Link to="/{-$locale}/workspace" className="text-sm text-muted-foreground hover:text-foreground">
                {COPY.back[locale]}
            </Link>
            <div className="mt-6 flex items-center gap-3 text-primary">
                <DumbbellIcon className="size-6" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{COPY.title[locale]}</h1>
            </div>
            <p className="mt-6">{COPY.body[locale]}</p>
            <p className="mt-8 text-sm text-muted-foreground">{COPY.comingSoon[locale]}</p>
        </main>
    );
}
