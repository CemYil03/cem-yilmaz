import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// `@testing-library/react` mounts every render into `document.body`. Without
// an explicit unmount the DOM accumulates across tests in the same file and
// queries return stale matches. `cleanup()` unmounts everything React
// rendered during the test and restores `document.body` to a blank slate.
afterEach(() => {
    cleanup();
});
