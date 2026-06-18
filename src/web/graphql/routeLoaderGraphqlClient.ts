import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest, getRequestHeader, setResponseHeader } from '@tanstack/react-start/server';
import { print } from 'graphql';
import type { DocumentNode } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { urqlClientSimple } from './client';

const printedDocumentCache = new WeakMap<DocumentNode, string>();

function printCached(document: DocumentNode): string {
    let printed = printedDocumentCache.get(document);
    if (!printed) {
        printed = print(document);
        printedDocumentCache.set(document, printed);
    }
    return printed;
}

type GraphqlResponse<TData> = {
    data?: TData;
    errors?: Array<{ message?: string }>;
};

type VariablesParam<TVariables> = TVariables extends Record<string, never> ? [] : [variables: TVariables];

const executeGraphqlRequest: <TData, TVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables: TVariables | undefined,
) => Promise<TData> = createIsomorphicFn()
    .server(
        async <TData, TVariables>(document: TypedDocumentNode<TData, TVariables>, variables: TVariables | undefined): Promise<TData> => {
            const request = getRequest();

            const headersToForward = [
                'cookie',
                'user-agent',
                'accept-language',
                'x-forwarded-for',
                'x-real-ip',
                'origin',
                'referer',
            ] as const;
            const forwardedHeaders: Record<string, string> = {};
            for (const name of headersToForward) {
                const value = getRequestHeader(name);
                if (value) forwardedHeaders[name] = value;
            }

            const response = await fetch(new URL('/api/graphql', request.url), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...forwardedHeaders,
                },
                body: JSON.stringify({
                    query: printCached(document),
                    variables,
                }),
            });

            if (!response.ok) {
                throw new Error(`GraphQL request failed with status ${response.status}`);
            }

            for (const cookie of response.headers.getSetCookie()) {
                setResponseHeader('Set-Cookie', cookie);
            }

            const result = (await response.json()) as GraphqlResponse<TData>;
            if (result.errors?.length) {
                throw new Error(result.errors[0]?.message ?? 'GraphQL request failed.');
            }

            if (!result.data) {
                throw new Error('GraphQL response missing data.');
            }

            return result.data;
        },
    )
    .client(
        async <TData, TVariables>(document: TypedDocumentNode<TData, TVariables>, variables: TVariables | undefined): Promise<TData> => {
            const result = await urqlClientSimple.query(document as any, variables as any).toPromise();
            if (result.error) {
                throw result.error;
            }
            if (!result.data) {
                throw new Error('GraphQL response missing data.');
            }
            return result.data as TData;
        },
    ) as unknown as <TData, TVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables: TVariables | undefined,
) => Promise<TData>;

export function routeLoaderGraphqlClient<TData, TVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    ...args: VariablesParam<TVariables>
) {
    const variables = args.length ? args[0] : undefined;
    return () => executeGraphqlRequest(document, variables);
}
