// What to tell the agent when a message fails, and what they can do about it.
//
// WhatsApp errors come back in two places: synchronously from the send call, and later in a status
// webhook with status "failed" (errors[0].code). Both end up here.
// Codes are from Meta's Cloud API error-codes page. Check that page before relying on a code you add.
import type { SendError } from '../types';

export type ErrorAction =
  | 'retry'     // send the same message again
  | 'template'  // the 24h window is closed: switch the composer to templates
  | 'copy';     // copy the text so it can be sent another way

export interface ErrorInfo {
  title: string;
  /** what happened, in words an agent understands */
  explain: string;
  /** what to do next */
  todo?: string;
  actions: ErrorAction[];
  /** account-wide problems are shown once at the top, not only on the message */
  scope: 'message' | 'account';
}

const CATALOG: Record<number, ErrorInfo> = {
  131047: {
    title: 'עברו 24 שעות מההודעה האחרונה של הלקוח',
    explain: 'WhatsApp מאפשרת לשלוח הודעה רגילה רק בתוך 24 שעות מההודעה האחרונה של הלקוח. ההודעה לא נשלחה.',
    todo: 'שלחו תבנית מאושרת. אחרי שהלקוח יענה, אפשר יהיה לשלוח שוב הודעות רגילות.',
    actions: ['template', 'copy'],
    scope: 'message',
  },
  131026: {
    title: 'ההודעה לא נמסרה',
    explain: 'המספר לא רשום ב-WhatsApp, או שהלקוח משתמש בגרסה ישנה מדי של האפליקציה.',
    todo: 'בדקו שהמספר נכון, או פנו ללקוח ב-SMS.',
    actions: ['copy'],
    scope: 'message',
  },
  131050: {
    title: 'הלקוח חסם הודעות שיווקיות',
    explain: 'הלקוח בחר בתוך WhatsApp להפסיק לקבל מכם הודעות שיווקיות.',
    todo: 'אל תנסו שוב. אפשר לשלוח לו רק הודעות שירות.',
    actions: [],
    scope: 'message',
  },
  131049: {
    title: 'WhatsApp עצרה את ההודעה השיווקית',
    explain: 'WhatsApp מגבילה כמה הודעות שיווקיות לקוח מקבל, לפי מידת המעורבות שלו. ההודעה לא נמסרה.',
    todo: 'אל תשלחו שוב מיד. נסו שוב בעוד כמה ימים.',
    actions: [],
    scope: 'message',
  },
  131042: {
    title: 'בעיה באמצעי התשלום של חשבון WhatsApp',
    explain: 'לחשבון ה-WhatsApp Business אין אמצעי תשלום תקין, ולכן WhatsApp לא שולחת הודעות.',
    todo: 'מנהל החשבון צריך לעדכן אמצעי תשלום ב-Meta Business Manager. עד אז הודעות לא יישלחו.',
    actions: ['retry'],
    scope: 'account',
  },
  130429: {
    title: 'נשלחו יותר מדי הודעות בזמן קצר',
    explain: 'החשבון הגיע למגבלת קצב השליחה של WhatsApp.',
    todo: 'נסו שוב בעוד דקה.',
    actions: ['retry'],
    scope: 'account',
  },
  131056: {
    title: 'נשלחו יותר מדי הודעות ללקוח הזה',
    explain: 'WhatsApp מגבילה כמה הודעות אפשר לשלוח לאותו לקוח בזמן קצר.',
    todo: 'חכו כמה שניות ונסו שוב.',
    actions: ['retry'],
    scope: 'message',
  },
  131048: {
    title: 'השליחה הוגבלה בגלל דיווחי ספאם',
    explain: 'WhatsApp הגבילה את המספר כי לקוחות דיווחו על הודעות או חסמו אותן.',
    todo: 'עצרו קמפיינים ופנו למנהל החשבון.',
    actions: [],
    scope: 'account',
  },
  131051: {
    title: 'סוג ההודעה לא נתמך',
    explain: 'WhatsApp לא תומכת בסוג ההודעה או הקובץ ששלחתם.',
    todo: 'שלחו טקסט, תמונה (JPG/PNG) או PDF.',
    actions: ['copy'],
    scope: 'message',
  },
  131053: {
    title: 'העלאת הקובץ נכשלה',
    explain: 'WhatsApp לא הצליחה לעבד את הקובץ.',
    todo: 'נסו שוב, או שלחו קובץ אחר.',
    actions: ['retry'],
    scope: 'message',
  },
  132001: {
    title: 'התבנית לא קיימת',
    explain: 'התבנית לא נמצאה ב-WhatsApp, או שהיא לא אושרה בשפה הזאת.',
    todo: 'בחרו תבנית אחרת, או בדקו את התבנית ב-Business Manager.',
    actions: [],
    scope: 'message',
  },
  132015: {
    title: 'התבנית מושהית',
    explain: 'WhatsApp השהתה את התבנית בגלל איכות נמוכה (למשל לקוחות שחסמו או דיווחו).',
    todo: 'בחרו תבנית אחרת.',
    actions: [],
    scope: 'message',
  },
  132016: {
    title: 'התבנית בוטלה',
    explain: 'WhatsApp ביטלה את התבנית לצמיתות.',
    todo: 'בחרו תבנית אחרת.',
    actions: [],
    scope: 'message',
  },
  131000: {
    title: 'שגיאה ב-WhatsApp',
    explain: 'WhatsApp החזירה שגיאה כללית.',
    todo: 'נסו שוב. אם זה חוזר, פנו לתמיכה עם קוד השגיאה.',
    actions: ['retry', 'copy'],
    scope: 'message',
  },
};

const NETWORK: ErrorInfo = {
  title: 'אין חיבור לשרת',
  explain: 'ההודעה לא יצאה מהמחשב, כנראה בגלל בעיית אינטרנט.',
  todo: 'בדקו את החיבור ונסו שוב.',
  actions: ['retry', 'copy'],
  scope: 'message',
};

export function errorInfo(err: SendError): ErrorInfo {
  if (err.code === 'network') return NETWORK;
  return CATALOG[err.code] ?? {
    title: 'ההודעה נכשלה',
    explain: 'השליחה נכשלה מסיבה לא מוכרת.',
    todo: 'נסו שוב. אם זה חוזר, פנו לתמיכה עם קוד השגיאה.',
    actions: ['retry', 'copy'],
    scope: 'message',
  };
}

/** codes offered in the prototype's "simulate an error" menu */
export const SIMULATED_CODES: (number | 'network')[] = [131047, 131026, 131050, 131049, 131042, 130429, 131056, 131053, 132015, 131000, 'network'];
