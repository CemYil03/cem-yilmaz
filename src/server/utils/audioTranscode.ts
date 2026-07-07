import { spawn } from 'node:child_process';
import type { ChildProcessByStdio } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import ffmpegStatic from 'ffmpeg-static';

// PCM → MP3 transcoder. Spawns a long-lived ffmpeg process; the caller
// pushes raw signed-16-bit-LE mono PCM into `child.stdin` and reads MP3
// bytes out of `child.stdout`.
//
// Used by `/api/tts` on the cache-miss path: sentence chunks are fed
// serially through one ffmpeg instance so MP3 output starts flowing to
// the client as soon as the first Gemini synthesis lands, instead of
// waiting for the whole clip. Killing the child on client disconnect is
// the caller's responsibility.
//
// The runtime binary comes from `ffmpeg-static` — a pinned prebuilt with
// `libmp3lame` compiled in, no `apt-get install ffmpeg` in the Dockerfile,
// and no Homebrew dependency for local dev.

const ffmpegPath = ffmpegStatic;

const encoderArgs = (sampleRate: number): string[] => [
    // Input: raw PCM from stdin, no container.
    '-f',
    's16le',
    '-ar',
    String(sampleRate),
    '-ac',
    '1',
    '-i',
    'pipe:0',
    // Output: MP3 at 64 kbps — plenty for speech, ~10× smaller than the
    // WAV that Gemini returns.
    '-c:a',
    'libmp3lame',
    '-b:a',
    '64k',
    '-f',
    'mp3',
    // Flush each encoded MP3 frame to stdout as soon as it's ready
    // instead of holding frames in the muxer buffer. Matters for the
    // streaming pipeline where every millisecond of extra buffering
    // shows up as first-audio delay on the client.
    '-flush_packets',
    '1',
    'pipe:1',
    '-loglevel',
    'error',
];

export function audioTranscodePcmToMp3Stream(sampleRate: number): {
    child: ChildProcessByStdio<Writable, Readable, Readable>;
    mediaType: 'audio/mpeg';
} {
    if (!ffmpegPath) {
        throw new Error('audioTranscodePcmToMp3Stream: ffmpeg-static did not resolve a binary path for this platform');
    }
    const child = spawn(ffmpegPath, encoderArgs(sampleRate), { stdio: ['pipe', 'pipe', 'pipe'] });
    return { child, mediaType: 'audio/mpeg' };
}
