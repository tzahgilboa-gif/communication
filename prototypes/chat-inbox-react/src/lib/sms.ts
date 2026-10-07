// GSM-7 alphabet; anything else (Hebrew, emoji) makes the whole SMS Unicode
const GSM7 = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXT = '^{}\\[~]|€'; // count as 2 characters

export function smsSegments(text: string): { chars: number; segments: number } {
  let gsm = true, len = 0;
  for (const ch of text) {
    if (GSM7.includes(ch)) len += 1;
    else if (GSM7_EXT.includes(ch)) len += 2;
    else { gsm = false; break; }
  }
  if (!gsm) len = text.length; // UTF-16 code units: an emoji counts as 2
  const single = gsm ? 160 : 70, multi = gsm ? 153 : 67;
  return { chars: len, segments: len <= single ? 1 : Math.ceil(len / multi) };
}

/** "201 תווים · 3 מקטעים · הודעה אחת לחיוב" */
export function smsParts(text: string, factor: number): string {
  if (!text.length) return '';
  const r = smsSegments(text);
  const billed = Math.ceil(r.segments / factor);
  return r.chars + ' תווים · ' + r.segments + ' ' + (r.segments === 1 ? 'מקטע' : 'מקטעים') + ' · ' +
    (billed === 1 ? 'הודעה אחת' : billed + ' הודעות') + ' לחיוב';
}
