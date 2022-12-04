import type * as srk from '@algoux/standard-ranklist';
import { lookup as langLookup } from 'bcp-47-match';

export function resolveText(text: srk.Text | undefined): string {
  if (text === undefined) {
    return '';
  }
  if (typeof text === 'string') {
    return text;
  } else {
    const langs = Object.keys(text)
      .filter((k) => k && k !== 'fallback')
      .sort()
      .reverse();
    const userLangs =
      (typeof navigator !== 'undefined' && [...navigator.languages]) || [];
    const usingLang = langLookup(userLangs, langs) || 'fallback';
    return text[usingLang] ?? '';
  }
}

export function formatTimeDuration(
  time: srk.TimeDuration,
  targetUnit: srk.TimeUnit = 'ms',
  fmt: (num: number) => number = (num) => num,
) {
  let ms = -1;
  switch (time[1]) {
    case 'ms':
      ms = time[0];
      break;
    case 's':
      ms = time[0] * 1000;
      break;
    case 'min':
      ms = time[0] * 1000 * 60;
      break;
    case 'h':
      ms = time[0] * 1000 * 60 * 60;
      break;
    case 'd':
      ms = time[0] * 1000 * 60 * 60 * 24;
      break;
  }
  switch (targetUnit) {
    case 'ms':
      return ms;
    case 's':
      return fmt(ms / 1000);
    case 'min':
      return fmt(ms / 1000 / 60);
    case 'h':
      return fmt(ms / 1000 / 60 / 60);
    case 'd':
      return fmt(ms / 1000 / 60 / 60 / 24);
  }
  return -1;
}

export function preZeroFill(num: number, size: number): string {
  if (num >= Math.pow(10, size)) {
    return num.toString();
  } else {
    let str = Array(size + 1).join('0') + num;
    return str.slice(str.length - size);
  }
}

/**
 * format seconds to time string
 * @param {number} second
 * @param {boolean} showDay
 * @returns {string}
 */
export function secToTimeStr(second: number, showDay = false): string {
  let sec = second;
  let d = 0;
  if (showDay) {
    d = Math.floor(sec / 86400);
    sec %= 86400;
  }
  let h = Math.floor(sec / 3600);
  sec %= 3600;
  let m = Math.floor(sec / 60);
  sec %= 60;
  let s = Math.floor(sec);
  let str_d = '';
  if (showDay && d >= 1) {
    str_d = d + 'D ';
  }
  if (sec < 0) {
    return '--';
  }
  return (
    str_d +
    preZeroFill(h, 2) +
    ':' +
    preZeroFill(m, 2) +
    ':' +
    preZeroFill(s, 2)
  );
}

/**
 * Format number index to alphabet index
 * 0 => 'A'
 * 2 => 'C'
 * 25 => 'Z'
 * 26 => 'AA'
 * 28 => 'AC
 * @param {number | string} number
 * @returns {string}
 */
export function numberToAlphabet(number: number | string): string {
  let n = ~~number;
  const radix = 26;
  let cnt = 1;
  let p = radix;
  while (n >= p) {
    n -= p;
    cnt++;
    p *= radix;
  }
  let res = [];
  for (; cnt > 0; cnt--) {
    res.push(String.fromCharCode((n % radix) + 65));
    n = Math.trunc(n / radix);
  }
  return res.reverse().join('');
}

/**
 * Format alphabet index to number index
 * 'A' => 0
 * 'C' => 2
 * 'Z' => 25
 * 'AA' => 26
 * 'AC' => 28
 * @param {string} alphabet
 * @returns {number}
 */
export function alphabetToNumber(alphabet: string): number {
  if (typeof alphabet !== 'string' || !alphabet.length) {
    return -1;
  }
  const chars = `${alphabet}`.toUpperCase().split('').reverse();
  const radix = 26;
  let p = 1;
  let res = -1;
  chars.forEach((ch) => {
    res += (ch.charCodeAt(0) - 65) * p + p;
    p *= radix;
  });
  return res;
}

/**
 * Parse contributor string to an object which contains name, email (optional) and url (optional).
 * @param contributor
 * @returns parsed contributor object
 * @example
 * 'name <mail@example.com> (http://example.com)' -> { name: 'name', email: 'mail@example.com', url: 'http://example.com' }
 * 'name' -> { name: 'name' }
 * 'name <mail@example.com>' -> { name: 'name', email: 'mail@example.com' }
 * 'name (http://example.com)' -> { name: 'name', url: 'http://example.com' }
 * 'John Smith (http://example.com)' -> { name: 'John Smith', url: 'http://example.com' }
 */
export function resolveContributor(
  contributor: srk.Contributor | undefined,
): { name: string; email?: string; url?: string } | null {
  if (!contributor) {
    return null;
  }

  let name = '';
  let email: string | undefined;
  let url: string | undefined;
  const words = contributor.split(' ').map((s) => s.trim());
  let index = words.length - 1;
  while (index > 0) {
    const word = words[index];
    if (word.startsWith('<') && word.endsWith('>')) {
      email = word.slice(1, -1);
      index--;
      continue;
    }
    if (word.startsWith('(') && word.endsWith(')')) {
      url = word.slice(1, -1);
      index--;
      continue;
    }
    break;
  }
  name = words.slice(0, index + 1).join(' ');
  return { name, email, url };
}
