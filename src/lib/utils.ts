import type * as srk from '@algoux/standard-ranklist';
import { lookup as langLookup } from 'bcp-47-match';

export function resolveText(text: srk.Text | undefined): string {
  if (text === undefined) {
    return '';
  }
  if (typeof text === 'string') {
    return text;
  } else {
    const langs = Object.keys(text).filter(k => k && k !== 'fallback').sort().reverse();
    const userLangs = typeof navigator !== 'undefined' && [...navigator.languages] || [];
    const usingLang = langLookup(userLangs, langs) || 'fallback';
    return text[usingLang] ?? '';
  }
}