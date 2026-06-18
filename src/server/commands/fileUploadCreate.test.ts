import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { fileUploads } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { fileUploadCreate } from './fileUploadCreate';

describe('fileUploadCreate', () => {
    it('persists the file with bytes, size, and the canonical fields', async () => {
        // Arrange
        const { user } = await commandSetup.withUser();
        const bytes = Buffer.from('hello file uploads');

        // Act
        const created = await fileUploadCreate(testDb, {
            userId: user.userId,
            filename: 'note.txt',
            mediaType: 'text/plain',
            bytes,
        });

        // Assert — returned object has the canonical fields and a uuid id.
        expect(created.fileUploadId).toMatch(/^[0-9a-f-]{36}$/);
        expect(created.userId).toBe(user.userId);
        expect(created.filename).toBe('note.txt');
        expect(created.mediaType).toBe('text/plain');
        expect(created.size).toBe(bytes.byteLength);

        // Assert — row is persisted with the same bytes that went in.
        const rows = await testDb.select().from(fileUploads).where(eq(fileUploads.fileUploadId, created.fileUploadId));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.userId).toBe(user.userId);
        expect(rows[0]!.size).toBe(bytes.byteLength);
        expect(Buffer.from(rows[0]!.bytes).equals(bytes)).toBe(true);
    });
});
