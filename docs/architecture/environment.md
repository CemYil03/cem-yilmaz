# Environment Variables

## Context

Environment variables are read in many places (database connection, session cookie config, etc.). Without a central pattern, missing
variables fail at unpredictable points: a route might handle requests for minutes before a missing var crashes a deep code path, and tests
can drift out of sync with what production actually requires.

## Decision

A single module — `src/server/env/environmentVariablesCreate.ts` — declares every required variable, validates them at startup, and exposes
a typed `EnvironmentVariables` object. No code outside this module reads `process.env` directly. Functions that need configuration receive
it as a parameter (or read it from a shared `environmentVariables` instance).

### Interface

```typescript
// src/server/env/EnvironmentVariables.ts
export interface SessionCookieConfiguration {
  name: string;
  secure: boolean;
  domainScope: string | undefined;
}

export interface EnvironmentVariables {
  databaseUrl: string;
  sessionCookie: SessionCookieConfiguration;
  buildSha: string;
  // Optional at this layer; capability-specific keys are validated where
  // they are consumed, not at boot. See "Capability-Specific Variables"
  // below.
  googleGenerativeAiApiKey: string | undefined;
}
```

### Validation

`environmentVariablesCreate.ts` defines:

```typescript
const requiredEnvironmentVariables = ['DATABASE_URL', 'sessionCookieName'] as const;
```

`environmentVariablesCreate()` collects every missing variable and throws once with all names listed — the operator sees the full picture
instead of fixing one variable at a time. The `export const environmentVariables` at the bottom of the file is a `Proxy` that lazily calls
`environmentVariablesCreate()` on first property access — validation runs the first time real code reads a field (in practice, at server
boot), but merely importing the module does not trigger it. This keeps unit tests that import the factory free of any `process.env`
dependency.

### Consumption

- **Production code**: imports `environmentVariables` from `src/server/env/environmentVariablesCreate.ts` and reads typed fields (e.g.
  `environmentVariables.databaseUrl`, `environmentVariables.sessionCookie.name`).
- **Tests**: unit tests that import `environmentVariablesCreate` pass an explicit source object and never read `process.env`. Integration
  tests that touch the database read `DATABASE_URL` from the shell environment (the project no longer auto-loads `.env*` via a vitest setup
  file).
- **Pure helpers** (e.g. `sessionUtils`): take the relevant slice of `EnvironmentVariables` as a parameter so they remain trivially testable
  without touching `process.env`.

### Adding a New Variable

1. Add the key to `requiredEnvironmentVariables` in `environmentVariablesCreate.ts` (or as an optional field if it has a default).
2. Add the typed field to `EnvironmentVariables` in `src/server/env/EnvironmentVariables.ts`.
3. Map `process.env.X` to the typed field inside `environmentVariablesCreate()`.
4. Document the variable in `docs/infrastructure.md`.
5. Add it to `.env.local` for local runs, and provide it via the shell environment for any test runs that need it.

### Capability-Specific Variables

Some variables are required by the _real-app boot_ but not by every consumer of `EnvironmentVariables` (unit tests, build-time tooling,
codegen). The Google Generative AI API key is the canonical example: production needs it for the Gemini language model, but a unit test that
exercises a command should never call the LLM endpoint at all.

For these, do **not** add the key to `requiredEnvironmentVariables`. Instead:

1. Add the field as `string | undefined` to `EnvironmentVariables`.
2. Validate it at the _capability wiring site_. For LLM clients that means `serverRuntimeCreate.ts` — which throws if the key is missing
   when building the Google provider.
3. Tests that need the capability inject a stub via `ServerRuntime` (see `src/server/test/aiTestUtils.ts` for the LLM model stub) and never
   reach `serverRuntimeCreate`.

This keeps the env validator decoupled from the AI provider: the env file says "is the deploy correctly configured for the _core_ app?" and
each capability says "is _this_ capability correctly wired?". The two questions used to be conflated in `requiredEnvironmentVariables`,
which made unit tests transitively depend on every capability the runtime supports.

## Alternatives Considered

- **Direct `process.env.X!` reads scattered through the code**: The original pattern. Cheap to write, but missing variables fail late and
  individually, and the set of required variables is undiscoverable.
- **Per-feature env modules**: One env helper per feature area. Avoids one big interface but reintroduces the discoverability problem and
  duplicates validation logic.
- **Runtime-injected env on `ServerRuntime`**: Cleanest DI, but `db`, `boss`, and other modules are exported as module-level constants in
  this codebase. Migrating them to factory functions is a larger refactor than the value justifies.

## Consequences

- Validation happens once, at startup. A misconfigured deployment fails immediately with a clear list of missing variables.
- `process.env` access is centralized — an ESLint `no-restricted-syntax` rule bans `process.env` reads everywhere except
  `environmentVariablesCreate.ts`. Build-time configs (`drizzle.config.ts`) and tests (`commandTestUtils.ts`) call
  `environmentVariablesCreate()` like everything else.
- Tests can import `environmentVariablesCreate` and inject their own source object, so unit tests do not depend on `.env` files. Integration
  tests that need real env values should read them from the shell environment.
