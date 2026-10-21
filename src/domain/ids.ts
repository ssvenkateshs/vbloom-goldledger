/**
 * Identifiers are RFC 4122 version 4 UUIDs, generated on the device that creates
 * the record. They are globally unique without coordination, which is what makes
 * offline-first use and later merging between devices possible.
 */

export type Id = string;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is Id {
  return typeof value === 'string' && UUID_RE.test(value);
}

type IdGenerator = () => Id;

let generator: IdGenerator = () => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback for environments without WebCrypto. Not cryptographically strong,
  // but still RFC 4122 v4 shaped; the app installs expo-crypto's generator at boot.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Replace the UUID source (the app wires expo-crypto here). */
export function setIdGenerator(next: IdGenerator): void {
  generator = next;
}

export function newId(): Id {
  return generator();
}

/** ISO 8601 timestamp in UTC with millisecond precision. */
export function nowIso(): string {
  return new Date().toISOString();
}
