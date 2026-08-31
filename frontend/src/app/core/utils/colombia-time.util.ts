export const COLOMBIA_TIME_ZONE = 'America/Bogota';

const DATE_TIME_KEY_NAMES = new Set([
  'date',
  'datetime',
  'timestamp',
  'createdat',
  'updatedat',
  'deletedat',
  'reviewedat',
  'approvedat',
  'rejectedat',
  'requestedat',
  'expiresat',
  'expirationdate',
  'lastaccessat',
  'lastentry',
  'lastexit',
  'lastloginat',
  'readat',
  'sentat',
  'generatedat',
  'processingat',
  'completedat'
]);

function normalizeKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]/g, '');
}

function isDateTimeKey(key: string): boolean {
  const normalized = normalizeKey(key);

  if (!normalized) {
    return false;
  }

  if (DATE_TIME_KEY_NAMES.has(normalized)) {
    return true;
  }

  return normalized.endsWith('at') || normalized.includes('timestamp');
}

function isDateOnlyString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function isIsoLikeDateTime(value: string): boolean {
  const text = value.trim();

  return /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(text);
}

function hasExplicitTimeZone(value: string): boolean {
  const text = value.trim();

  return /Z$/i.test(text) || /[+-]\d{2}:?\d{2}$/.test(text);
}

function normalizeOffset(value: string): string {
  return value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
}

function parseDateTime(value: any): Date | null {
  if (value == null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getTime());
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();

    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date
      : null;
  }

  if (typeof value === 'object' && typeof value?.seconds === 'number') {
    const nanoseconds =
      typeof value?.nanoseconds === 'number'
        ? value.nanoseconds
        : typeof value?._nanoseconds === 'number'
          ? value._nanoseconds
          : 0;

    const date = new Date(
      (value.seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (typeof value === 'object' && typeof value?._seconds === 'number') {
    const nanoseconds =
      typeof value?._nanoseconds === 'number'
        ? value._nanoseconds
        : 0;

    const date = new Date(
      (value._seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (typeof value !== 'string') {
    return null;
  }

  let text = value.trim();

  if (!text || isDateOnlyString(text) || !isIsoLikeDateTime(text)) {
    return null;
  }

  text = text.replace(' ', 'T');
  text = normalizeOffset(text);

  /*
   * Compatibilidad con registros históricos de SegurEntry:
   * datetime.utcnow().isoformat() generaba UTC sin Z ni offset.
   */
  if (!hasExplicitTimeZone(text)) {
    text = `${text}Z`;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getColombiaParts(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: COLOMBIA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }
  );

  const parts: Record<string, string> = {};

  formatter
    .formatToParts(date)
    .forEach(part => {
      if (part.type !== 'literal') {
        parts[part.type] = part.value;
      }
    });

  return parts;
}

/**
 * Devuelve el reloj oficial de Colombia en ISO local sin offset.
 * Esto mantiene compatibilidad con los componentes existentes que ya usan
 * new Date(valor), incluso si el navegador del usuario está en otra zona.
 */
export function toColombiaWallClockIso(value: any): any {
  const date = parseDateTime(value);

  if (!date) {
    return value;
  }

  const parts = getColombiaParts(date);
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

  return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}:${parts['second']}.${milliseconds}`;
}

/**
 * Normaliza recursivamente únicamente campos que representan fecha/hora.
 * Fechas puras como 2026-08-31 se conservan intactas.
 */
export function normalizeColombiaDateTimes<T>(
  value: T,
  parentKey: string = ''
): T {
  if (value == null) {
    return value;
  }

  if (isDateTimeKey(parentKey)) {
    const normalized = toColombiaWallClockIso(value);

    if (normalized !== value) {
      return normalized as T;
    }
  }

  if (Array.isArray(value)) {
    return value.map(
      item => normalizeColombiaDateTimes(item, parentKey)
    ) as T;
  }

  const anyValue = value as any;

  if (
    value instanceof Date ||
    typeof anyValue?.toDate === 'function'
  ) {
    return value;
  }

  if (typeof value === 'object') {
    const source = value as Record<string, any>;
    const result: Record<string, any> = {};

    Object.keys(source).forEach(key => {
      result[key] = normalizeColombiaDateTimes(source[key], key);
    });

    return result as T;
  }

  return value;
}
