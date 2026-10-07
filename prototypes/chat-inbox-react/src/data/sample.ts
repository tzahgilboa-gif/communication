// Sample data for the prototype only. In production all of this comes from the server.
import type { Conversation, Message, QuickReply, Task, Template } from '../types';

const now = new Date();
const ago = (min: number) => new Date(now.getTime() - min * 60000);
const inDays = (d: number, h: number) => {
  const x = new Date(now);
  x.setDate(x.getDate() + d);
  x.setHours(h, 0, 0, 0);
  return x;
};

let seq = 0;
const m = (msg: Omit<Message, 'id'>): Message => ({ id: 'm' + ++seq, ...msg });

// inline sample image (no external file)
const sampleImg =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#cfe3f5"/>' +
      '<circle cx="250" cy="55" r="28" fill="#ffd56b"/><path d="M0 200 L110 90 L190 170 L240 120 L320 200Z" fill="#6b9f73"/>' +
      '<text x="20" y="35" font-family="Arial" font-size="18" fill="#2d4a6b">photo.jpg</text></svg>',
  );

export const templates: Template[] = [
  { name: 'follow_up', label: 'מעקב אחרי פנייה', category: 'utility', body: 'שלום {{1}}, רצינו לבדוק אם הבעיה שפניתם אלינו לגביה נפתרה. נשמח לעזור בכל שאלה.' },
  { name: 'order_ready', label: 'ההזמנה מוכנה', category: 'utility', body: 'היי {{1}}, ההזמנה שלכם מספר {{2}} מוכנה לאיסוף בסניף.' },
  { name: 'appointment', label: 'תזכורת לפגישה', category: 'utility', body: 'שלום {{1}}, תזכורת לפגישה שנקבעה ל-{{2}}. להשיב 1 לאישור או 2 לביטול.' },
  { name: 'autumn_sale', label: 'מבצע סתיו', category: 'marketing', body: 'היי {{1}}, מבצע הסתיו שלנו התחיל! {{2}} הנחה על כל המוצרים עד סוף החודש. להסרה מרשימת התפוצה השיבו "הסר".' },
];

export const quickReplies: QuickReply[] = [
  { key: 'שלום', text: 'שלום, תודה שפניתם אלינו. איך אפשר לעזור?' },
  { key: 'שעות', text: 'שעות הפעילות שלנו: א׳-ה׳ 09:00-18:00, ו׳ 09:00-13:00.' },
  { key: 'אתר', text: 'אפשר לראות את כל המבצעים באתר שלנו: https://www.example.co.il/sale' },
  { key: 'תודה', text: 'תודה רבה! אם יהיו שאלות נוספות, אנחנו כאן.' },
];

type ConvSeed = Omit<Conversation, 'older'>;

const seeds: ConvSeed[] = [
  {
    id: 1, name: 'דנה לוי', phone: '052-7123456', channel: 'wa', status: 'open', unread: 2, pin: 1,
    groups: ['לקוחות VIP', 'ניוזלטר'], lastCampaign: 'מבצע סתיו 2026', optedOut: false,
    messages: [
      m({ dir: 'out', text: 'היי דנה, מבצע הסתיו שלנו התחיל! 20% הנחה על כל המוצרים עד סוף החודש.\nלפרטים: https://www.example.co.il/sale', time: ago(60 * 26), status: 'read', srcLabel: 'קמפיין: מבצע סתיו 2026' }),
      m({ dir: 'in', text: 'היי, ההנחה תקפה גם על הדגם הזה?', time: ago(48), media: { type: 'image', url: sampleImg, name: 'photo.jpg' } }),
      m({ dir: 'in', text: 'ואפשר לשלב עם קוד קופון?', time: ago(45) }),
    ],
  },
  {
    id: 2, name: 'יוסי כהן', phone: '054-9988776', channel: 'wa', status: 'open', unread: 0, pin: 0,
    groups: ['לקוחות'], lastCampaign: 'תזכורת תשלום', optedOut: false,
    messages: [
      m({ dir: 'in', text: 'שלום, לא קיבלתי חשבונית על התשלום האחרון', time: ago(60 * 30) }),
      m({ dir: 'out', text: 'שלום יוסי, הנה החשבונית.', time: ago(60 * 29), status: 'read', media: { type: 'pdf', url: '#', name: 'חשבונית-10452.pdf', size: 184320 } }),
      m({ dir: 'in', text: 'קיבלתי, תודה!', time: ago(60 * 28) }),
    ],
  },
  {
    id: 3, name: 'מיכל אברהם', phone: '050-1234567', channel: 'sms', status: 'open', unread: 1, pin: 0,
    groups: ['ניוזלטר'], lastCampaign: 'הזמנה לאירוע', optedOut: false,
    messages: [
      m({ dir: 'out', text: 'הוזמנתם לערב השקה ביום חמישי ב-19:00. להשיב "כן" לאישור הגעה.', time: ago(60 * 5), status: 'delivered', srcLabel: 'קמפיין: הזמנה לאירוע' }),
      m({ dir: 'in', text: 'כן, נגיע 2 אנשים', time: ago(12) }),
    ],
  },
  {
    id: 4, name: '058-4441122', phone: '058-4441122', channel: 'wa', status: 'open', unread: 0, pin: 0,
    groups: [], lastCampaign: 'מבצע סתיו 2026', optedOut: false,
    messages: [
      m({ dir: 'out', text: 'היי, מבצע הסתיו שלנו התחיל! 20% הנחה על כל המוצרים.', time: ago(60 * 3), status: 'failed', error: { code: 131026 }, srcLabel: 'קמפיין: מבצע סתיו 2026' }),
    ],
  },
  {
    id: 5, name: 'רון שגיא', phone: '053-6655443', channel: 'wa', status: 'closed', unread: 0, pin: 2,
    groups: ['לקוחות'], lastCampaign: '—', optedOut: false,
    messages: [
      m({ dir: 'in', text: 'מתי אתם פתוחים בשישי?', time: ago(60 * 24 * 3) }),
      m({ dir: 'out', text: 'שעות הפעילות שלנו: א׳-ה׳ 09:00-18:00, ו׳ 09:00-13:00.', time: ago(60 * 24 * 3 - 4), status: 'read' }),
      m({ note: true, text: 'לקוח קבוע, מעדיף שיחה טלפונית.', time: ago(60 * 24 * 3 - 10) }),
    ],
  },
  {
    id: 6, name: 'נועה פרידמן', phone: '052-3344556', channel: 'wa', status: 'open', unread: 3, pin: 0,
    groups: ['לקוחות VIP'], lastCampaign: 'מבצע סתיו 2026', optedOut: false,
    messages: [
      m({ dir: 'in', text: 'היי, ההזמנה שלי עוד לא הגיעה', time: ago(30) }),
      m({ dir: 'in', text: 'מספר הזמנה 58213', time: ago(29) }),
      m({ dir: 'in', text: 'אפשר לבדוק מה קורה איתה?', time: ago(8) }),
    ],
  },
  {
    id: 7, name: 'אבי מזרחי', phone: '054-2211334', channel: 'sms', status: 'open', unread: 0, pin: 0,
    groups: ['ניוזלטר'], lastCampaign: 'תזכורת תשלום', optedOut: false,
    messages: [
      m({ dir: 'out', text: 'תזכורת: התשלום החודשי יחויב ב-10 לחודש.', time: ago(60 * 7), status: 'delivered', srcLabel: 'קמפיין: תזכורת תשלום' }),
      m({ dir: 'in', text: 'תודה, ראיתי', time: ago(60 * 6) }),
    ],
  },
  {
    id: 8, name: 'שירה גולן', phone: '050-7788990', channel: 'wa', status: 'open', unread: 1, pin: 0,
    groups: ['לקוחות'], lastCampaign: '—', optedOut: false,
    messages: [m({ dir: 'in', text: 'אפשר לקבוע תור ליום ראשון בבוקר?', time: ago(95) })],
  },
  {
    id: 9, name: 'עומר ביטון', phone: '053-1122445', channel: 'wa', status: 'open', unread: 0, pin: 0,
    groups: ['לקוחות'], lastCampaign: 'מבצע סתיו 2026', optedOut: false,
    messages: [
      m({ dir: 'in', text: 'יש לכם את זה במידה L?', time: ago(60 * 30) }),
      m({ dir: 'out', text: 'כן, יש במלאי בסניף המרכזי.', time: ago(60 * 29), status: 'read' }),
    ],
  },
  {
    id: 10, name: 'ליאת שמעוני', phone: '058-9900112', channel: 'sms', status: 'closed', unread: 0, pin: 0,
    groups: ['ניוזלטר'], lastCampaign: 'הזמנה לאירוע', optedOut: false,
    messages: [
      m({ dir: 'out', text: 'הוזמנתם לערב השקה ביום חמישי ב-19:00. להשיב "כן" לאישור הגעה.', time: ago(60 * 5), status: 'delivered', srcLabel: 'קמפיין: הזמנה לאירוע' }),
      m({ dir: 'in', text: 'הסר', time: ago(60 * 4) }),
    ],
  },
  {
    id: 11, name: 'דוד אוחיון', phone: '052-4455667', channel: 'wa', status: 'open', unread: 0, pin: 0,
    groups: ['לקוחות VIP', 'ניוזלטר'], lastCampaign: 'מבצע סתיו 2026', optedOut: false,
    messages: [
      m({ dir: 'in', text: 'קיבלתי את המשלוח, הכל תקין', time: ago(60 * 2) }),
      m({ dir: 'out', text: 'מעולה, תודה שעדכנת!', time: ago(60 * 2 - 3), status: 'read' }),
    ],
  },
  {
    id: 12, name: 'תמר רוזן', phone: '054-6677889', channel: 'wa', status: 'open', unread: 2, pin: 0,
    groups: ['לקוחות'], lastCampaign: '—', optedOut: false,
    messages: [
      m({ dir: 'in', text: 'שלום, יש לי שאלה על האחריות', time: ago(60 * 4) }),
      m({ dir: 'in', text: 'המוצר הפסיק לעבוד אחרי חודשיים', time: ago(60 * 4 - 1) }),
    ],
  },
  {
    id: 13, name: '050-3322110', phone: '050-3322110', channel: 'sms', status: 'open', unread: 1, pin: 0,
    groups: [], lastCampaign: 'מבצע סתיו 2026', optedOut: false,
    messages: [
      m({ dir: 'out', text: 'מבצע הסתיו התחיל! 20% הנחה על כל המוצרים.', time: ago(60 * 9), status: 'delivered', srcLabel: 'קמפיין: מבצע סתיו 2026' }),
      m({ dir: 'in', text: 'מי זה?', time: ago(60 * 8) }),
    ],
  },
  {
    id: 14, name: 'יעל כץ', phone: '053-8899001', channel: 'wa', status: 'closed', unread: 0, pin: 0,
    groups: ['לקוחות'], lastCampaign: 'תזכורת תשלום', optedOut: false,
    messages: [
      m({ dir: 'in', text: 'שילמתי, תודה על התזכורת', time: ago(60 * 24 * 5) }),
      m({ dir: 'out', text: 'קיבלנו, תודה!', time: ago(60 * 24 * 5 - 6), status: 'read' }),
    ],
  },
  {
    id: 15, name: 'משה דהן', phone: '052-1010203', channel: 'wa', status: 'open', unread: 0, pin: 0,
    groups: ['ניוזלטר'], lastCampaign: 'מבצע סתיו 2026', optedOut: false,
    messages: [
      m({ dir: 'in', text: 'עד מתי המבצע?', time: ago(60 * 24 * 2) }),
      m({ dir: 'out', text: 'עד סוף החודש.', time: ago(60 * 24 * 2 - 5), status: 'read' }),
    ],
  },
];

// older messages that are in the DB but not loaded yet (oldest first)
const olderSamples: Record<number, Message[]> = {
  1: [
    m({ dir: 'in', text: 'שלום, רציתי לשאול על זמני משלוח לאילת', time: ago(60 * 24 * 40) }),
    m({ dir: 'out', text: 'היי דנה, משלוח לאילת לוקח 3-5 ימי עסקים.', time: ago(60 * 24 * 40 - 12), status: 'read' }),
    m({ dir: 'in', text: 'מעולה, תודה 🙏', time: ago(60 * 24 * 40 - 20) }),
    m({ dir: 'in', text: 'ההזמנה הגיעה, הכל תקין!', time: ago(60 * 24 * 35) }),
    m({ dir: 'out', text: 'שמחים לשמוע! *תודה* שקנית אצלנו', time: ago(60 * 24 * 35 - 8), status: 'read' }),
    m({ dir: 'in', text: 'יש לכם מבצעים לחגים?', time: ago(60 * 24 * 21) }),
    m({ dir: 'out', text: 'כן! נשלח עדכון ברגע שהמבצע יעלה.', time: ago(60 * 24 * 21 - 30), status: 'read' }),
  ],
  2: [
    m({ dir: 'in', text: 'הי, אפשר לעדכן את כתובת החיוב?', time: ago(60 * 24 * 60) }),
    m({ dir: 'out', text: 'בטח, מה הכתובת החדשה?', time: ago(60 * 24 * 60 - 5), status: 'read' }),
    m({ dir: 'in', text: 'רחוב הרצל 12, חיפה', time: ago(60 * 24 * 60 - 9) }),
    m({ dir: 'out', text: 'עודכן ✅', time: ago(60 * 24 * 60 - 15), status: 'read' }),
    m({ dir: 'in', text: 'תודה רבה', time: ago(60 * 24 * 60 - 16) }),
    m({ dir: 'in', text: 'עוד שאלה: אפשר לשלם ב-3 תשלומים?', time: ago(60 * 24 * 14) }),
    m({ dir: 'out', text: 'כן, בעסקאות מעל 300 ש"ח.', time: ago(60 * 24 * 14 - 20), status: 'read' }),
  ],
  3: [
    m({ dir: 'out', text: 'תודה שנרשמת לניוזלטר שלנו! להסרה השב הסר', time: ago(60 * 24 * 90), status: 'delivered', srcLabel: 'קמפיין: הרשמה לניוזלטר' }),
    m({ dir: 'in', text: 'תודה', time: ago(60 * 24 * 90 - 60) }),
  ],
  5: [
    m({ dir: 'in', text: 'שלום, המנוי שלי מתחדש אוטומטית?', time: ago(60 * 24 * 30) }),
    m({ dir: 'out', text: 'כן, הוא מתחדש ב-1 לחודש. אפשר לבטל בכל רגע.', time: ago(60 * 24 * 30 - 7), status: 'read' }),
  ],
};

export const initialConversations: Conversation[] = seeds.map((c) => ({ ...c, older: olderSamples[c.id] ?? [] }));

export const initialTasks: Task[] = [
  { id: 1, convId: 1, title: 'לבדוק אם הקופון VIP20 משתלב עם המבצע', due: inDays(0, 17), prio: 'high', done: false, created: ago(40) },
  { id: 2, convId: 2, title: 'לשלוח חשבונית מתוקנת עם מספר עוסק', due: inDays(-1, 12), prio: 'normal', done: false, created: ago(60 * 28) },
  { id: 3, convId: 3, title: 'לרשום 2 משתתפים לערב ההשקה', due: inDays(1, 10), prio: 'normal', done: false, created: ago(10) },
  { id: 4, convId: 5, title: 'להתקשר לרון לגבי חידוש מנוי', due: inDays(5, 11), prio: 'low', done: false, created: ago(60 * 24 * 3) },
  { id: 5, convId: 1, title: 'לשלוח לדנה קטלוג סתיו', due: null, prio: 'low', done: true, created: ago(60 * 26), doneAt: ago(60 * 20) },
];

export function newMessageId(): string {
  return 'm' + ++seq;
}
