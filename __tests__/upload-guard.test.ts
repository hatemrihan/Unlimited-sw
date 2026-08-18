/**
 * @jest-environment node
 *
 * What `/api/upload` is allowed to accept.
 *
 * That endpoint has to stay public — it takes the InstaPay payment screenshot,
 * and the customer uploading it has not logged in to anything. But public was
 * all it was: no content-type check of any kind, 10MB per file, no limit on how
 * many. The client politely filtered to images; the server accepted whatever
 * arrived. Anyone who noticed could store arbitrary files in the S3 bucket the
 * storefront serves from, at the owner's expense, indefinitely.
 *
 * `file.type` is not a check. It is a string the uploader chooses, and renaming
 * `payload.exe` to `receipt.png` sets it to `image/png` for free. The only
 * honest answer comes from the bytes themselves, which is what these tests are
 * about.
 */
import {
  sniffImageMime,
  MAX_SCREENSHOT_BYTES,
  SCREENSHOT_PREFIX,
} from '../lib/imageUpload';

/** The first bytes of each format, as a real file would begin. */
const SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/gif': [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00],
};

/** WEBP is "RIFF" + 4 size bytes + "WEBP", so the marker sits at offset 8. */
const WEBP = [
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x24, 0x00, 0x00, 0x00, // size
  0x57, 0x45, 0x42, 0x50, // WEBP
];

function bytes(values: number[], totalLength = values.length): Uint8Array {
  const buffer = new Uint8Array(totalLength);
  buffer.set(values);
  return buffer;
}

describe('sniffImageMime', () => {
  it.each(Object.entries(SIGNATURES))('recognises a real %s', (mime, signature) => {
    expect(sniffImageMime(bytes(signature, 64))).toBe(mime);
  });

  it('recognises a real image/webp, whose marker is not at the start', () => {
    expect(sniffImageMime(bytes(WEBP, 64))).toBe('image/webp');
  });

  it('recognises a HEIC, which is what an iPhone camera produces', () => {
    // A customer photographing their InstaPay receipt on an iPhone sends one of
    // these. Refusing it would block a real payment for an unfixable reason.
    const heic = [
      0x00, 0x00, 0x00, 0x18, // box size
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x68, 0x65, 0x69, 0x63, // heic
    ];
    expect(sniffImageMime(bytes(heic, 64))).toBe('image/heic');
  });

  it('refuses an MP4, which shares the ftyp header but is not an image', () => {
    const mp4 = [
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x6d, 0x70, 0x34, 0x32, // mp42
    ];
    expect(sniffImageMime(bytes(mp4, 64))).toBeNull();
  });

  it('refuses a Windows executable renamed to .png', () => {
    // "MZ" — the whole point of the exercise.
    expect(sniffImageMime(bytes([0x4d, 0x5a, 0x90, 0x00], 64))).toBeNull();
  });

  it('refuses a PDF, a ZIP and an HTML page', () => {
    expect(sniffImageMime(bytes([0x25, 0x50, 0x44, 0x46], 64))).toBeNull(); // %PDF
    expect(sniffImageMime(bytes([0x50, 0x4b, 0x03, 0x04], 64))).toBeNull(); // PK
    expect(sniffImageMime(bytes([0x3c, 0x68, 0x74, 0x6d], 64))).toBeNull(); // <htm
  });

  it('refuses a file that merely starts with the right text', () => {
    // "image/png" written into the body changes nothing.
    const pretend = new TextEncoder().encode('image/png and then whatever I like');
    expect(sniffImageMime(pretend)).toBeNull();
  });

  it('refuses an empty or truncated file instead of reading past the end', () => {
    expect(sniffImageMime(new Uint8Array(0))).toBeNull();
    expect(sniffImageMime(bytes([0x89, 0x50]))).toBeNull(); // half a PNG header
    expect(sniffImageMime(bytes([0x52, 0x49, 0x46, 0x46]))).toBeNull(); // RIFF, no WEBP
  });

  it('refuses a RIFF container that is not WEBP', () => {
    // A .wav is RIFF too. Only WEBP may through.
    const wav = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45];
    expect(sniffImageMime(bytes(wav, 64))).toBeNull();
  });
});

describe('the screenshot limits', () => {
  it('caps uploads at the 5MB the checkout form already promises', () => {
    // The form told customers 5MB while the server allowed 10MB. The smaller
    // of the two numbers is the honest one.
    expect(MAX_SCREENSHOT_BYTES).toBe(5 * 1024 * 1024);
  });

  it('files screenshots under their own prefix, so they can be expired', () => {
    // Payment screenshots are evidence for one order, not permanent assets.
    // A prefix is what makes an S3 lifecycle rule possible at all.
    expect(SCREENSHOT_PREFIX).toBe('checkout-screenshots/');
  });
});
