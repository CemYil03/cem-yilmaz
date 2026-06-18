// Single-file upload to `POST /api/file-uploads`. Returns the persisted
// file-upload metadata so callers (e.g. the chat composer) can transition the
// per-tile UI from `uploading` to `uploaded` and stash the `fileUploadId`
// for the eventual mutation that references it.
//
// The endpoint is same-origin and authorized by the session cookie (the
// browser sends it automatically), so we don't need to thread credentials
// through here. We do throw a typed `FileUploadError` on any non-2xx
// response so callers can map it onto the per-tile error state.

export interface UploadedFile {
    fileUploadId: string;
    filename: string;
    mediaType: string;
    size: number;
}

// Internal — callers only see it via the thrown `Error` shape. We could
// surface `FileUploadError.status` later if a UI wants to branch on it
// (e.g. show a retry button on 5xx vs a "too large" message on 413), at which
// point this becomes `export`.
class FileUploadError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = 'FileUploadError';
    }
}

export async function uploadFile(file: File, signal?: AbortSignal): Promise<UploadedFile> {
    const formData = new FormData();
    // Field name doesn't matter — the route reads the first File entry.
    formData.append('file', file, file.name);

    const response = await fetch('/api/file-uploads', {
        method: 'POST',
        body: formData,
        signal,
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        let message = `Upload failed (${response.status})`;
        try {
            const parsed = JSON.parse(text) as { error?: string };
            if (parsed.error) message = parsed.error;
        } catch {
            // Non-JSON error body — fall back to the generic status message.
        }
        throw new FileUploadError(message, response.status);
    }

    return (await response.json()) as UploadedFile;
}
