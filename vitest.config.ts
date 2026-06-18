import { defineConfig } from 'vitest/config';
import viteReact from '@vitejs/plugin-react';

// Vitest is intentionally split from `vite.config.ts`. The dev/build config
// loads the full TanStack Start + Nitro + React plugin stack, which Vitest 4 +
// Vite 8's module runner cannot evaluate against React's CJS entry — every
// test file ate a `ReferenceError: module is not defined` at startup before
// this split.
//
// We define two projects with disjoint plugin sets:
//
//   server — Node environment, no plugins. Covers `src/server/**/*.test.ts`
//            (commands, queries, mappers, utils). Pure TS, no JSX, no DOM.
//
//   web    — jsdom environment, `@vitejs/plugin-react` for the JSX runtime.
//            Covers `src/web/**/*.test.{ts,tsx}` and any future component or
//            hook tests. Uses `@testing-library/react` (already a devDep).
//
// Both projects share `src/server/test/vitestSetup.ts` for the global
// console-spy setup; the web project layers its own jsdom-aware setup on top.
export default defineConfig({
    test: {
        projects: [
            {
                resolve: { tsconfigPaths: true },
                test: {
                    name: 'server',
                    environment: 'node',
                    include: ['src/server/**/*.test.{ts,tsx}'],
                    setupFiles: ['src/server/test/vitestSetup.ts'],
                    clearMocks: true,
                },
            },
            {
                resolve: { tsconfigPaths: true },
                plugins: [viteReact()],
                test: {
                    name: 'web',
                    environment: 'jsdom',
                    include: ['src/web/**/*.test.{ts,tsx}', 'src/routes/**/*.test.{ts,tsx}'],
                    setupFiles: ['src/server/test/vitestSetup.ts', 'src/web/test/vitestSetup.ts'],
                    clearMocks: true,
                },
            },
        ],
    },
});
