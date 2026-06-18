import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { users } from '../db/schema';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { userUpdate } from './userUpdate';

describe('userUpdate', () => {
    it('updates the row and publishes a userUpdates event on success', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ name: 'original' });

        // Act
        const result = await userUpdate(user.userId, { user: { name: 'renamed' } }, requestingSession, serverRuntime);

        // Assert — mutation reports success and the row is persisted.
        expect(result).toEqual({ success: true });
        const rows = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('renamed');

        // Assert — exactly one publish for this user.
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects an empty name without writing or publishing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ name: 'original' });

        // Act + Assert — guard throws before the DB write.
        await expect(userUpdate(user.userId, { user: { name: '' } }, requestingSession, serverRuntime)).rejects.toThrow(
            /name must not be empty/,
        );

        // Assert — row state and the audit log are independent reads, so we
        // run them together. The `findLogsForSession` call drains the logger
        // queue internally before its SELECT.
        const [rows, logRows] = await Promise.all([
            testDb.select().from(users).where(eq(users.userId, user.userId)),
            findLogsForSession(requestingSession.sessionId),
        ]);

        expect(rows[0]!.name).toBe('original');
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/name must not be empty/);
    });

    it('rejects a whitespace-only name', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ name: 'original' });

        // Act + Assert — `   ` trims to empty; same guard as above.
        await expect(userUpdate(user.userId, { user: { name: '   ' } }, requestingSession, serverRuntime)).rejects.toThrow(
            /name must not be empty/,
        );

        const [rows, logRows] = await Promise.all([
            testDb.select().from(users).where(eq(users.userId, user.userId)),
            findLogsForSession(requestingSession.sessionId),
        ]);

        expect(rows[0]!.name).toBe('original');
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/name must not be empty/);
    });

    it('persists the trimmed name when surrounding whitespace is present', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ name: 'original' });

        // Act — leading/trailing whitespace should be stripped before the write.
        const result = await userUpdate(user.userId, { user: { name: '  renamed with spaces  ' } }, requestingSession, serverRuntime);

        // Assert — success + the persisted value is the trimmed form.
        expect(result).toEqual({ success: true });
        const rows = await testDb.select().from(users).where(eq(users.userId, user.userId));
        expect(rows[0]!.name).toBe('renamed with spaces');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('throws when the user does not exist and does not publish', async () => {
        // Arrange — plain commandSetup() persists a session with no user attached.
        const { serverRuntime, requestingSession } = await commandSetup();
        const nonExistentUserId = crypto.randomUUID();

        // Act + Assert — UPDATE matches zero rows, so we surface a not-found error.
        await expect(userUpdate(nonExistentUserId, { user: { name: 'renamed' } }, requestingSession, serverRuntime)).rejects.toThrow(
            /user not found/,
        );

        const [rows, logRows] = await Promise.all([
            testDb.select().from(users).where(eq(users.userId, nonExistentUserId)),
            findLogsForSession(requestingSession.sessionId),
        ]);

        expect(rows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/user not found/);
    });
});
