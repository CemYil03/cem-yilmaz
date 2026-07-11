import { describe, expect, it } from 'vitest';
import { interpretToolResult } from './toolResult';

describe('interpretToolResult', () => {
    it('is in progress while active, regardless of result', () => {
        expect(interpretToolResult(null, true)).toEqual({ status: 'inProgress', summary: null });
        expect(interpretToolResult({ status: 'completed', summary: 'done' }, true)).toEqual({ status: 'inProgress', summary: null });
    });

    it('reads the delegate-convention summary on a completed result', () => {
        expect(interpretToolResult({ status: 'completed', summary: 'Updated 3 projects.' }, false)).toEqual({
            status: 'done',
            summary: 'Updated 3 projects.',
        });
    });

    it('flags failure on the explicit status', () => {
        expect(interpretToolResult({ status: 'failed', summary: 'Sub-agent unreachable.' }, false)).toEqual({
            status: 'failed',
            summary: 'Sub-agent unreachable.',
        });
    });

    it('flags failure on a top-level error key', () => {
        expect(interpretToolResult({ error: 'boom' }, false)).toEqual({ status: 'failed', summary: null });
    });

    it('treats partial / needsMoreInfo / noOp as done but keeps their summary', () => {
        for (const status of ['partial', 'needsMoreInfo', 'noOp']) {
            expect(interpretToolResult({ status, summary: `via ${status}` }, false)).toEqual({
                status: 'done',
                summary: `via ${status}`,
            });
        }
    });

    it('is done with no summary for arbitrary or empty results', () => {
        expect(interpretToolResult(null, false)).toEqual({ status: 'done', summary: null });
        expect(interpretToolResult({ ok: true }, false)).toEqual({ status: 'done', summary: null });
        expect(interpretToolResult('plain string', false)).toEqual({ status: 'done', summary: null });
    });

    it('ignores a non-string summary field', () => {
        expect(interpretToolResult({ status: 'completed', summary: 42 }, false)).toEqual({ status: 'done', summary: null });
    });
});
