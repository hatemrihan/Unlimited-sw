/**
 * What the public upload endpoint will accept.
 *
 * `/api/upload` has to stay open — it takes the InstaPay payment screenshot
 * from a customer who has not logged in to anything and never will. So the
 * question is not who is uploading, it is what.
 *
 * `file.type` cannot answer that. It is a string chosen by whoever is
 * uploading: rename `payload.exe` to `receipt.png` and the browser reports
 * `image/png` without being asked twice. The bytes are the only part of an
 * upload the uploader cannot lie about while keeping the file usable.
 */

/**
 * The checkout form already tells customers 5MB. The server was allowing 10.
 * Where two limits disagree the smaller one is the honest number — nobody is
 * served by silently accepting what the interface says is too big.
 */
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

/**
 * Payment screenshots are evidence attached to one order, not permanent site
 * assets, and they accumulate forever. Filing them under one prefix is what
 * makes an S3 lifecycle rule possible; without it, expiring them means picking
 * them out of the bucket root by hand.
 */
export const SCREENSHOT_PREFIX = 'checkout-screenshots/';

/** The formats a phone camera or a screenshot actually produces. */
const MAGIC_NUMBERS: Array<{ mime: string; offset: number; signature: number[] }> = [
  { mime: 'image/jpeg', offset: 0, signature: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', offset: 0, signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', offset: 0, signature: [0x47, 0x49, 0x46, 0x38] },
  // WEBP is a RIFF container: "RIFF", four length bytes, then "WEBP". Matching
  // "RIFF" alone would also admit .wav and .avi files.
  { mime: 'image/webp', offset: 8, signature: [0x57, 0x45, 0x42, 0x50] },
];

/** The ISO-BMFF brands that mean "this is a HEIF/HEIC image". */
const HEIF_BRANDS = ['heic', 'heix', 'heif', 'hevc', 'mif1', 'msf1'];

/**
 * HEIC, which is what an iPhone camera produces by default.
 *
 * Worth the extra branch: a customer photographing their InstaPay receipt on an
 * iPhone sends one of these, and refusing it would block a real payment for a
 * reason the customer cannot understand or fix.
 *
 * The layout is a 4-byte box size, the literal "ftyp", then a 4-character
 * brand — so unlike the others this needs two checks, and matching "ftyp" alone
 * would also admit MP4 video.
 */
function isHeif(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;

  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (ftyp !== 'ftyp') return false;

  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return HEIF_BRANDS.includes(brand);
}

function startsWith(bytes: Uint8Array, signature: number[], offset: number): boolean {
  // Checked before reading, so a truncated file is refused rather than matched
  // against whatever happens to be past the end of the buffer.
  if (bytes.length < offset + signature.length) return false;

  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * The image format these bytes really are, or null if they are not an image.
 *
 * Null is the answer for anything unrecognised, which is the safe direction:
 * an exotic-but-genuine image being refused costs one customer one retry with
 * a screenshot, while the reverse costs an open file host.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  const match = MAGIC_NUMBERS.find(({ signature, offset }) => startsWith(bytes, signature, offset));
  if (match) return match.mime;

  return isHeif(bytes) ? 'image/heic' : null;
}
