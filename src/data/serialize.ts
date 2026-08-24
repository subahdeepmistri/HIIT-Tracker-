/**
 * Safe serialisation boundary. Every JSON.parse / JSON.stringify in the app's
 * persistence path goes through here — never bare.
 *
 * Storage is untrusted input: it can be hand-edited, truncated by an old bug,
 * or written by a different app version. Parse must never throw upward.
 * Writes must reject values that would silently corrupt (NaN/Infinity become
 * `null` in JSON, undefined vanishes or becomes null in arrays, cycles throw).
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export type SerializeResult =
  | { ok: true; json: string }
  | { ok: false; reason: string };

export type StorageFailureKind = 'quota' | 'unavailable' | 'serialize' | 'unknown';

export interface StorageFailure {
  kind: StorageFailureKind;
  message: string;
}

export function safeParse<T = unknown>(raw: string | null | undefined): ParseResult<T> {
  if (raw == null) return { ok: false, reason: 'empty' };
  if (typeof raw !== 'string') return { ok: false, reason: 'not-a-string' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };
  try {
    return { ok: true, value: JSON.parse(trimmed) as T };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `invalid-json: ${message}` };
  }
}

class SerializationPathError extends Error {
  constructor(public readonly path: string, reason: string) {
    super(`${reason} at ${path}`);
  }
}

const ROOT = '<root>';

export function safeStringify(value: unknown): SerializeResult {
  const ancestors = new Set<unknown>();
  try {
    const json = JSON.stringify(value, function replacer(this: unknown, key: string, val: unknown) {
      if (val === undefined) {
        // Dropped properties are normal (optional fields); undefined array items are not.
        if (Array.isArray(this)) throw new SerializationPathError(pathOf(key), 'undefined-in-array');
        return val;
      }
      if (typeof val === 'number' && !Number.isFinite(val)) {
        throw new SerializationPathError(pathOf(key), 'non-finite-number');
      }
      if (typeof val === 'object' && val !== null) {
        if (ancestors.has(val)) throw new SerializationPathError(pathOf(key), 'circular-reference');
        ancestors.add(val);
      }
      return val;
    });
    return { ok: true, json };
  } catch (error) {
    if (error instanceof SerializationPathError) {
      return { ok: false, reason: error.message };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `serialize-failed: ${message}` };
  } finally {
    ancestors.clear();
  }
}

function pathOf(key: string): string {
  if (!key) return ROOT;
  return key.startsWith('.') || /^\[\d+\]/.test(key) ? `${ROOT}${key}` : `${ROOT}.${key}`;
}

/**
 * Classify an unknown storage error so the UI can tell the user something true:
 * quota means "free space", unavailable means "nothing will persist here",
 * anything else gets reported verbatim rather than guessed at.
 */
export function classifyStorageError(error: unknown): StorageFailure {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const lowered = raw.toLowerCase();
  if (
    lowered.includes('quota') ||
    lowered.includes('exceeded') ||
    lowered.includes('nospace') ||
    lowered.includes('full')
  ) {
    return { kind: 'quota', message: raw };
  }
  if (
    lowered.includes('securityerror') ||
    lowered.includes('permission') ||
    lowered.includes('unavailable') ||
    lowered.includes('storage is disabled') ||
    lowered.includes('private')
  ) {
    return { kind: 'unavailable', message: raw };
  }
  return { kind: 'unknown', message: raw };
}
