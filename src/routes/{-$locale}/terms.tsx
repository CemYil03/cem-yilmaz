import { createFileRoute, Link } from '@tanstack/react-router';
import { HomePageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/terms')({
    loader: () => routeLoaderGraphqlClient(HomePageDocument)(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: { de: 'Nutzungsbedingungen', en: 'Terms of Service' }[locale],
            description: {
                de: 'Die Nutzungsbedingungen für diese Anwendung.',
                en: 'The terms governing the use of this application.',
            }[locale],
            path: '/terms',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return (
            <div>
                <h1>Hello "/terms"!</h1>
                <Link to="/{-$locale}">home</Link>
            </div>
        );
    },
});
