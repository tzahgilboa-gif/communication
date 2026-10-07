import type { Conversation } from '../types';

/** minutes left in WhatsApp's 24h customer service window (null for SMS) */
export function windowLeftMin(c: Conversation, now = new Date()): number | null {
  if (c.channel !== 'wa') return null;
  const ins = c.messages.filter((m) => m.dir === 'in');
  if (!ins.length) return 0;
  const left = 24 * 60 - (now.getTime() - ins[ins.length - 1].time.getTime()) / 60000;
  return left > 0 ? left : 0;
}

/** the customer's last message is an opt-out request */
export function asksOptOut(c: Conversation): boolean {
  const ins = c.messages.filter((m) => m.dir === 'in');
  const last = ins.length ? (ins[ins.length - 1].text || '').trim() : '';
  return /^(הסר|הסירו|הסרה|הסירו אותי|stop|unsubscribe)[.!]?$/i.test(last);
}

/** the latest customer-visible message; undefined when the conversation has none (e.g. all deleted) */
export function lastMsg(c: Conversation) {
  return c.messages.filter((x) => !x.note).at(-1);
}

/** time used to sort the list: last message, else last note, else never */
export const lastActivity = (c: Conversation) => (lastMsg(c) ?? c.messages.at(-1))?.time.getTime() ?? 0;
