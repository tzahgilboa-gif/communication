// Mock of the server API. In production each function is a fetch() to your backend, and status
// updates arrive over a WebSocket/SSE fed by Meta's status webhooks.
import type { Channel, Message, MsgStatus, SendError } from '../types';

export interface SendRequest {
  channel: Channel;
  phone: string;
  /** free-form reply; false for a template */
  freeForm: boolean;
  /** WhatsApp 24h window is open (the server checks this again; the client value can be stale) */
  windowOpen: boolean;
}

export type StatusUpdate = (status: MsgStatus, error?: SendError) => void;

// prototype only: force the next send to fail with this code
let simulated: SendError['code'] | null = null;
export function simulateNextError(code: SendError['code'] | null) {
  simulated = code;
}

// errors WhatsApp reports later, in a "failed" status webhook, instead of rejecting the send call
const ASYNC_CODES = new Set<SendError['code']>([131026, 131050, 131049]);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends a message. Resolves when the server accepted it ("sent"); rejects with a SendError when it
 * was refused. Later status changes (delivered, read, failed) come through onStatus.
 */
export async function sendMessage(req: SendRequest, onStatus: StatusUpdate): Promise<void> {
  await wait(600);
  let code = simulated;
  simulated = null;
  // what Meta does: a free-form WhatsApp message outside the window is refused
  if (code === null && req.channel === 'wa' && req.freeForm && !req.windowOpen) code = 131047;
  // sample data: this number is not on WhatsApp
  if (code === null && req.phone === '058-4441122') code = 131026;

  if (code !== null && !ASYNC_CODES.has(code)) {
    throw { code, detail: code === 'network' ? 'Failed to fetch' : '(#' + code + ')' } satisfies SendError;
  }
  const asyncCode = code;
  setTimeout(() => {
    if (asyncCode !== null) return onStatus('failed', { code: asyncCode, detail: '(#' + asyncCode + ')' });
    onStatus('delivered');
    setTimeout(() => onStatus('read'), 2000);
  }, 1200);
}

const OLDER_PAGE = 5;

/**
 * Older messages of a conversation, newest page first. In production:
 * GET /api/conversations/{id}/messages?before=<oldest time>&limit=50 (an endpoint you build: the
 * WhatsApp Cloud API has no call that returns past messages).
 */
export async function fetchOlderMessages(older: Message[]): Promise<{ page: Message[]; rest: Message[] }> {
  await wait(700);
  const cut = Math.max(0, older.length - OLDER_PAGE);
  return { page: older.slice(cut), rest: older.slice(0, cut) };
}
