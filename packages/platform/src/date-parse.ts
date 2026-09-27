/**
 * `Date.parse` for the date strings Angular's `DatePipe` builds to read a timezone argument.
 *
 * `formatDate` turns `'UTC'`, `'+0500'` or `'EST'` into an offset by parsing
 * `'Jan 01, 1970 00:00:00 ' + timezone` and falls back to the device's own zone when that is
 * `NaN`. A browser's parser accepts that legacy form; Hermes' accepts ISO 8601 and not this, so
 * every timezone argument was ignored and the pipe printed local time without a word.
 *
 * `installDateParse` wraps `Date.parse` once, from `mount()`. The platform's own answer is used
 * whenever it has one; only a string it cannot read and this can is answered here, so nothing a
 * parser already understood changes. A timezone Angular itself cannot honour, in a browser or
 * here, is still ignored, and in development said once per zone.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** The North American abbreviations a browser's legacy parser knows, as minutes east of UTC. */
const ZONES: Readonly<Record<string, number>> = {
  UT: 0,
  UTC: 0,
  GMT: 0,
  Z: 0,
  EST: -300,
  EDT: -240,
  CST: -360,
  CDT: -300,
  MST: -420,
  MDT: -360,
  PST: -480,
  PDT: -420,
};

/** `Mon DD, YYYY HH:MM:SS` with an optional zone: the form `DatePipe` and older code write. */
const LEGACY =
  /^([a-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4}) (\d{1,2}):(\d{2})(?::(\d{2}))?(?: (.*))?$/i;
/** `+0500`, `-05:00` or `+05`, with or without a `GMT` or `UTC` in front. */
const OFFSET = /^(?:GMT|UTC|UT)?([+-])(\d{2}):?(\d{2})?$/i;

/** What `DatePipe` asks to learn a timezone's offset. */
const PROBE = 'Jan 01, 1970 00:00:00 ';

/** Minutes east of UTC for a zone, `null` for none (local time), `NaN` for one not understood. */
function zoneOffset(zone: string | undefined): number | null {
  if (!zone) return null;
  const named = ZONES[zone.toUpperCase()];
  if (named !== undefined) return named;
  const offset = OFFSET.exec(zone);
  if (!offset) return NaN;
  const minutes = Number(offset[2]) * 60 + Number(offset[3] ?? 0);
  return offset[1] === '-' ? -minutes : minutes;
}

/** The legacy form above, as a time; `NaN` for anything else. */
function parseLegacyDate(value: string): number {
  const match = LEGACY.exec(value.trim());
  if (!match) return NaN;
  const [, month, day, year, hours, minutes, seconds, zone] = match;
  const index = MONTHS.indexOf(month!.toLowerCase());
  const east = zoneOffset(zone);
  if (index < 0 || Number.isNaN(east)) return NaN;
  const fields = [
    Number(year),
    index,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds ?? 0),
  ] as const;
  if (east === null) return new Date(...fields).getTime();
  return Date.UTC(...fields) - east * 60_000;
}

let installed = false;
const reported = new Set<string>();

/** Wrap `Date.parse` so the legacy form reads everywhere. Idempotent. */
export function installDateParse(dev: boolean): void {
  if (installed) return;
  installed = true;
  const native = Date.parse;
  Date.parse = function parse(value: string): number {
    const time = native.call(Date, value);
    if (!Number.isNaN(time) || typeof value !== 'string') return time;
    const legacy = parseLegacyDate(value);
    if (Number.isNaN(legacy) && dev) reportZone(value);
    return legacy;
  };
}

function reportZone(value: string): void {
  if (!value.startsWith(PROBE)) return;
  const zone = value.slice(PROBE.length);
  if (reported.has(zone)) return;
  reported.add(zone);
  console.warn(
    `[angular-native] DatePipe cannot use the timezone '${zone}', so it formats in the device's own zone. Angular reads an offset such as '+0100' or '-05:00', 'UTC' or 'GMT', or a North American abbreviation such as 'EST'; a named zone such as 'Europe/London' needs Intl.DateTimeFormat with a timeZone option.`,
  );
}
