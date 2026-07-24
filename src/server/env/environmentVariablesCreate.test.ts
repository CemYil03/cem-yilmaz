import { describe, expect, it } from 'vitest';

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
            VISITOR_IP_HASH_SALT: 'test-salt',
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
            googleGenerativeAiApiKey: undefined,
            serverTokenSecret: undefined,
            visitorIpHashSalt: 'test-salt',
        });
    });

    it('treats sessionCookieSecure other than "true" as false', () => {
        const environmentVariables = environmentVariablesCreate({
            DATABASE_URL: 'postgres://x',
            sessionCookieName: 'sid',
            WEB_PAGE_URL: 'https://example.com',
            VISITOR_IP_HASH_SALT: 'test-salt',
        });

        expect(environmentVariables.sessionCookie.secure).toBe(false);
    });

    it('defaults buildSha to "unknown" when BUILD_SHA is not set', () => {
        const environmentVariables = environmentVariablesCreate({
            DATABASE_URL: 'postgres://x',
            sessionCookieName: 'sid',
            WEB_PAGE_URL: 'https://example.com',
            VISITOR_IP_HASH_SALT: 'test-salt',
        });

        expect(environmentVariables.buildSha).toBe('unknown');
    });

    it('strips a trailing slash from WEB_PAGE_URL', () => {
        const environmentVariables = environmentVariablesCreate({
            DATABASE_URL: 'postgres://x',
            sessionCookieName: 'sid',
            WEB_PAGE_URL: 'https://example.com/',
            VISITOR_IP_HASH_SALT: 'test-salt',
        });

        expect(environmentVariables.webPageUrl).toBe('https://example.com');
    });

    it('throws listing every missing required variable', () => {
        expect(() => environmentVariablesCreate({})).toThrow(/DATABASE_URL/);
        expect(() => environmentVariablesCreate({})).toThrow(/sessionCookieName/);
        expect(() => environmentVariablesCreate({})).toThrow(/WEB_PAGE_URL/);
        expect(() => environmentVariablesCreate({})).toThrow(/VISITOR_IP_HASH_SALT/);
    });

    it('throws when only some required variables are missing', () => {
        expect(() => environmentVariablesCreate({ DATABASE_URL: 'postgres://x' })).toThrow(/sessionCookieName/);
        expect(() => environmentVariablesCreate({ DATABASE_URL: 'postgres://x', sessionCookieName: 'sid' })).toThrow(/WEB_PAGE_URL/);
        expect(() =>
            environmentVariablesCreate({ DATABASE_URL: 'postgres://x', sessionCookieName: 'sid', WEB_PAGE_URL: 'https://x' }),
        ).toThrow(/VISITOR_IP_HASH_SALT/);
    });
});
