import { vi } from 'vitest';

// Globally silence and observe `console.*` for every test in this project.
//
// `loggerCreate` echoes every persisted log line to `console[level]` so that
// errors are still visible in production stdout. In tests, that pollutes the
// reporter output with stack traces from negative-path assertions (a test
// that proves the command rejects an empty name will, by design, log an
// error). Globally spying lets tests assert on calls (`expect(console.error)
// .toHaveBeenCalledWith(...)`) without touching the real terminal.
//
// `clearMocks: true` in `vite.config.ts` resets `.mock.calls` between tests,
// so the spies never need to be restored manually. The implementation stays
// a no-op for the whole run.
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});
