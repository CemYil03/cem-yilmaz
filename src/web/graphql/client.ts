import { createClient, fetchExchange, subscriptionExchange } from 'urql';
import { createClient as createSSEClient } from 'graphql-sse';

// URQL ships with a GET-with-query-params default for queries, which trips up
// proxies that cap URL length and complicates request logging. We force every
// GraphQL operation to POST, transcoding any incoming GET-with-query into a
// JSON body.
const urqlPostFetch: typeof fetch = async (url, options) => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.href : url.toString();

    const urlObj = new URL(urlString, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    const isGetWithQueryParams = (!options || !options.method || options.method === 'GET') && urlObj.searchParams.has('query');

    if (isGetWithQueryParams) {
        const query = urlObj.searchParams.get('query');
        const variables = urlObj.searchParams.get('variables');

        return fetch(urlObj.pathname, {
            ...options,
            method: 'POST',
            headers: {
                ...options?.headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: variables ? JSON.parse(variables) : undefined,
            }),
            credentials: options?.credentials || 'same-origin',
        });
    }

    return fetch(url, {
        ...options,
        method: options?.method || 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        credentials: options?.credentials || 'same-origin',
    });
};

// Subscriptions ride graphql-sse, which uses GET (the SSE standard); the POST
// transcoding above only applies to the URQL fetch exchange.
const sseClient = createSSEClient({
    url: '/api/stream',
    credentials: 'same-origin',
});

export const urqlClient = createClient({
    url: '/api/graphql',
    fetch: urqlPostFetch,
    fetchOptions: {
        method: 'POST',
        credentials: 'same-origin',
    },
    preferGetMethod: false,
    requestPolicy: 'cache-first',
    exchanges: [
        fetchExchange,
        subscriptionExchange({
            forwardSubscription: (operation) => {
                return {
                    subscribe: (sink) => {
                        const dispose = sseClient.subscribe(operation as any, sink);
                        return {
                            unsubscribe: dispose,
                        };
                    },
                };
            },
        }),
    ],
});

// Cache-free, subscription-free variant used by `routeLoaderGraphqlClient` for
// one-shot loader queries — route loaders manage their own cache lifecycle, so
// URQL's would just duplicate it.
export const urqlClientSimple = createClient({
    url: '/api/graphql',
    fetch: urqlPostFetch,
    fetchOptions: {
        method: 'POST',
        credentials: 'same-origin',
    },
    preferGetMethod: false,
    exchanges: [fetchExchange],
});
