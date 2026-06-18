import { describe, it, expect } from 'vitest';

import { environmentVariablesCreate } from './environmentVariablesCreate';

describe('envCreate', () => {
    it('returns a populated Env when all required vars are set', () => {
        const environmentVariables = environmentVariablesCreate({
            DATABASE_URL: 'postgres://x',
            sessionCookieName: 'sid',
            sessionCookieSecure: 'true',
            sessionCookieDomainScope: '.example.com',
            BUILD_SHA: 'abc123',
            WEB_PAGE_URL: 'https://example.com',
        });

        expect(environmentVariables).toEqual({
            databaseUrl: 'postgres://x',
            sessionCookie: {
                name: 'sid',
                secure: true,
                domainScope: '.example.com',
            },
            buildSha: 'abc123',
            webPageUrl: 'https://example.com',
        });
    });

    it('treats sessionCookieSecure other than "true" as false', () => {
        const environmentVariables = environmentVariablesCreate({
            DATABASE_URL: 'postgres://x',
            sessionCookieName: 'sid',
            WEB_PAGE_URL: 'https://example.com',
        });

        expect(environmentVariables.sessionCookie.secure).toBe(false);
    });

    it('defaults buildSha to "unknown" when BUILD_SHA is not set', () => {
        const environmentVariables = environmentVariablesCreate({
            DATABASE_URL: 'postgres://x',
            sessionCookieName: 'sid',
            WEB_PAGE_URL: 'https://example.com',
        });

        expect(environmentVariables.buildSha).toBe('unknown');
    });

    it('strips a trailing slash from WEB_PAGE_URL', () => {
        const environmentVariables = environmentVariablesCreate({
            DATABASE_URL: 'postgres://x',
            sessionCookieName: 'sid',
            WEB_PAGE_URL: 'https://example.com/',
        });

        expect(environmentVariables.webPageUrl).toBe('https://example.com');
    });

    it('throws listing every missing required variable', () => {
        expect(() => environmentVariablesCreate({})).toThrow(/DATABASE_URL/);
        expect(() => environmentVariablesCreate({})).toThrow(/sessionCookieName/);
        expect(() => environmentVariablesCreate({})).toThrow(/WEB_PAGE_URL/);
    });

    it('throws when only some required variables are missing', () => {
        expect(() => environmentVariablesCreate({ DATABASE_URL: 'postgres://x' })).toThrow(/sessionCookieName/);
        expect(() => environmentVariablesCreate({ DATABASE_URL: 'postgres://x', sessionCookieName: 'sid' })).toThrow(/WEB_PAGE_URL/);
    });
});
