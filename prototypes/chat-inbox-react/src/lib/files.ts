// WhatsApp Cloud API limits
export const LIMITS = { image: 5 * 1024 * 1024, pdf: 100 * 1024 * 1024 };

// first bytes of each allowed format; the browser's file.type only reflects the extension
const MAGIC: Record<'jpeg' | 'png' | 'pdf', number[]> = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
};

export function sniff(bytes: Uint8Array): keyof typeof MAGIC | null {
  for (const k of Object.keys(MAGIC) as (keyof typeof MAGIC)[]) {
    if (MAGIC[k].every((b, i) => bytes[i] === b)) return k;
  }
  return null;
}

// strip control and bidi-override characters (e.g. "fdp.exe" shown as "exe.pdf")
export function cleanName(name: string): string {
  return String(name || '').replace(/[\u0000-\u001f\u007f‎‏‪-‮⁦-⁩]/g, '').slice(0, 120);
}

export type FileCheck = { ok: true; type: 'image' | 'pdf'; name: string } | { ok: false; error: string };

/** checks type, size and the real content of the file */
export async function checkFile(file: File): Promise<FileCheck> {
  const type = /^image\/(jpeg|png)$/.test(file.type) ? 'image' : file.type === 'application/pdf' ? 'pdf' : null;
  if (!type) return { ok: false, error: 'אפשר לצרף רק תמונה (JPG/PNG) או PDF' };
  if (!file.size) return { ok: false, error: 'הקובץ ריק' };
  if (file.size > LIMITS[type]) return { ok: false, error: type === 'image' ? 'התמונה גדולה מ-5MB' : 'הקובץ גדול מ-100MB' };
  let real: ReturnType<typeof sniff>;
  try {
    real = sniff(new Uint8Array(await file.slice(0, 8).arrayBuffer()));
  } catch {
    return { ok: false, error: 'לא הצלחנו לקרוא את הקובץ' };
  }
  const ok = type === 'image' ? real === 'jpeg' || real === 'png' : real === 'pdf';
  if (!ok) return { ok: false, error: 'תוכן הקובץ לא תואם לסוג שלו. אפשר לצרף רק תמונה (JPG/PNG) או PDF אמיתיים' };
  const name = cleanName(file.name) || (type === 'image' ? 'image.' + (real === 'png' ? 'png' : 'jpg') : 'file.pdf');
  return { ok: true, type, name };
}
