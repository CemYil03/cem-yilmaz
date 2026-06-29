import { createFileRoute, Link } from '@tanstack/react-router';
import { FolderKanbanIcon } from 'lucide-react';
import { useLocale } from '../../../web/hooks/useLocale';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

// Private workspace project tracking — distinct from the public `/projects`
// portfolio surface that ships in Phase 3.

const title = { de: 'Projekte', en: 'Projects' };

export const Route = createFileRoute('/{-$locale}/workspace/projects')({
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: title[locale],
            description: { de: 'Persönliche Projekte, Status und nächste Schritte.', en: 'Personal projects, status, and next steps.' }[
                locale
            ],
            path: '/workspace/projects',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: ProjectsArea,
});

function ProjectsArea() {
    const locale = useLocale();
    return (
        <main className="px-6 md:px-10 lg:px-16 max-w-3xl mx-auto w-full py-12 leading-relaxed">
            <Link to="/{-$locale}/workspace" className="text-sm text-muted-foreground hover:text-foreground">
                {{ de: '← Workspace', en: '← Workspace' }[locale]}
            </Link>
            <div className="mt-6 flex items-center gap-3 text-primary">
                <FolderKanbanIcon className="size-6" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{title[locale]}</h1>
            </div>
            <p className="mt-6">
                {
                    {
                        de: 'Dieser Bereich wird gerade aufgebaut. Hier landen meine persönlichen Projekte, ihr Status und die nächsten Schritte.',
                        en: 'This area is being built out. My personal projects, their status, and next steps will live here.',
                    }[locale]
                }
            </p>
            <p className="mt-8 text-sm text-muted-foreground">{{ de: 'Bald verfügbar', en: 'Coming soon' }[locale]}</p>
        </main>
    );
}
