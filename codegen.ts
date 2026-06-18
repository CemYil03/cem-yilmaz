import type { CodegenConfig } from '@graphql-codegen/cli';

const sharedConfig = {
    useTypeImports: true,
    declarationKind: { type: 'interface' as const },
    enumsAsTypes: true,
};

const config: CodegenConfig = {
    overwrite: true,
    schema: 'src/server/graphql/schema.graphqls',
    ignoreNoDocuments: true,
    hooks: { afterAllFileWrite: ['prettier --write'] },
    generates: {
        // Server: base schema types + resolver types (Resolvers, *Resolvers, ResolversTypes, etc.)
        'src/server/graphql/generated.ts': {
            plugins: ['typescript', 'typescript-resolvers', 'typescript-validation-schema'],
            config: {
                ...sharedConfig,
                useIndexSignature: true,
                typesPrefix: 'GqlS',
                scalars: {
                    ID: { input: 'string', output: 'string' },
                    // No custom Date scalar registered server-side, so it
                    // crosses the resolver boundary as the raw ISO string.
                    Date: { input: 'string', output: 'string' },
                    // Apollo's DateTime scalar parses to `Date` before the
                    // resolver runs, and serializes from `Date` on the way out.
                    DateTime: { input: 'Date', output: 'Date' },
                    // JSONB columns come back from Drizzle already parsed; we
                    // don't know the shape, so force mappers to cast.
                    JSON: { input: 'unknown', output: 'unknown' },
                },
                schema: 'zodv4',
                withDescriptions: true,
                // typescript-validation-schema doesn't read the `scalars` map above —
                // it needs `scalarSchemas` to know what zod schema to emit for custom
                // scalars (otherwise it warns "unhandled scalar name" and falls back
                // to z.any()).
                scalarSchemas: {
                    Date: 'z.string()',
                    // Server-side `DateTime` is typed as `Date` (already parsed by
                    // Apollo's Date scalar before reaching the resolver), so
                    // `z.date()` matches both input and output. `z.coerce.date()`
                    // would widen the schema's input type to `unknown` and break
                    // the `Properties<T>` constraint emitted by the validation
                    // plugin.
                    DateTime: 'z.date()',
                    JSON: 'z.unknown()',
                },
            },
        },
        // Client: base schema types + operation types + TypedDocumentNode.
        //
        // `importSchemaTypesFrom` is the load-bearing flag here. Without it,
        // stacking `typescript` and `typescript-operations` in one file emits
        // any input type / enum referenced by an operation's variables twice
        // (once per plugin), which fails the build with TS2300
        // duplicate-identifier errors. The flag tells the operations plugin
        // to skip re-emission and reference the already-emitted types through
        // the `Schema` namespace alias. Pointing it at the file's own path
        // turns that into a type-only self-import (TypeScript accepts those
        // because they erase). See `docs/architecture/api-layer.md`.
        'src/web/graphql/generated.ts': {
            documents: ['src/routes/**/*.graphql', 'src/web/components/**/*.graphql'],
            plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
            config: {
                ...sharedConfig,
                inlineFragmentTypes: 'inline',
                typesPrefix: 'GqlC',
                namespacedImportName: 'Schema',
                importSchemaTypesFrom: 'src/web/graphql/generated',
                scalars: {
                    ID: { input: 'string', output: 'string' },
                    Date: { input: 'string', output: 'string' },
                    // DateTime arrives as an ISO string in the JSON response;
                    // components format it with the user's locale on render.
                    DateTime: { input: 'string', output: 'string' },
                    // The UI consumes JSON values as-is (e.g. tool-call args
                    // in an inspect dialog), so a wide `unknown` is correct.
                    JSON: { input: 'unknown', output: 'unknown' },
                },
            },
        },
    },
};

export default config;
