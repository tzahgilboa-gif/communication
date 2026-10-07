import { createContext, useContext } from 'react';
import type { Conversation, Message, Task } from './types';

export const MAX_PINS = 3;

export type View = 'inbox' | 'tasks';
export type StatusFilter = 'all' | 'unread' | 'open' | 'closed';
export type ChannelFilter = 'all' | 'wa' | 'sms';
export type TaskFilter = 'open' | 'late' | 'today' | 'week' | 'done' | 'all';

export interface State {
  convs: Conversation[];
  tasks: Task[];
  view: View;
  selected: number | null;
  /** phone layout: the thread is on screen instead of the list */
  mobileThread: boolean;
  detailsOpen: boolean;
  statusFilter: StatusFilter;
  channelFilter: ChannelFilter;
  search: string;
  taskFilter: TaskFilter;
  taskSearch: string;
  taskPrio: 'all' | Task['prio'];
}

export type Action =
  | { type: 'view'; view: View }
  | { type: 'open'; id: number }
  | { type: 'back' }
  | { type: 'toggleDetails' }
  | { type: 'filter'; status?: StatusFilter; channel?: ChannelFilter; search?: string }
  | { type: 'taskFilter'; filter?: TaskFilter; search?: string; prio?: State['taskPrio'] }
  | { type: 'addMessage'; convId: number; msg: Message; markRead?: boolean }
  | { type: 'updateMessage'; convId: number; msgId: string; patch: Partial<Message> }
  | { type: 'removeMessage'; convId: number; msgId: string }
  | { type: 'prependOlder'; convId: number; page: Message[]; rest: Message[] }
  | { type: 'markRead'; convId: number }
  | { type: 'incomingUnread'; convId: number }
  | { type: 'toggleStatus'; convId: number }
  | { type: 'optOut'; convId: number }
  | { type: 'pin'; convId: number }
  | { type: 'unpin'; convId: number }
  | { type: 'movePin'; convId: number; to: number }
  | { type: 'addTask'; task: Omit<Task, 'id'> }
  | { type: 'updateTask'; id: number; patch: Pick<Task, 'title' | 'due' | 'prio'> }
  | { type: 'toggleTask'; id: number }
  | { type: 'deleteTask'; id: number };

const mapConv = (s: State, id: number, f: (c: Conversation) => Conversation): State => ({
  ...s,
  convs: s.convs.map((c) => (c.id === id ? f(c) : c)),
});

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'view':
      return { ...s, view: a.view };
    case 'open':
      return mapConv({ ...s, view: 'inbox', selected: a.id, mobileThread: true }, a.id, (c) => ({ ...c, unread: 0 }));
    case 'back':
      return { ...s, mobileThread: false };
    case 'toggleDetails':
      return { ...s, detailsOpen: !s.detailsOpen };
    case 'filter':
      return {
        ...s,
        statusFilter: a.status ?? s.statusFilter,
        channelFilter: a.channel ?? s.channelFilter,
        search: a.search ?? s.search,
      };
    case 'taskFilter':
      return {
        ...s,
        taskFilter: a.filter ?? s.taskFilter,
        taskSearch: a.search ?? s.taskSearch,
        taskPrio: a.prio ?? s.taskPrio,
      };
    case 'addMessage':
      return mapConv(s, a.convId, (c) => ({ ...c, messages: [...c.messages, a.msg], unread: a.markRead ? 0 : c.unread }));
    case 'updateMessage':
      return mapConv(s, a.convId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === a.msgId ? { ...m, ...a.patch } : m)),
      }));
    case 'removeMessage':
      return mapConv(s, a.convId, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== a.msgId) }));
    case 'prependOlder':
      return mapConv(s, a.convId, (c) => ({ ...c, messages: [...a.page, ...c.messages], older: a.rest }));
    case 'markRead':
      return mapConv(s, a.convId, (c) => ({ ...c, unread: 0 }));
    case 'incomingUnread':
      return mapConv(s, a.convId, (c) => ({ ...c, unread: c.unread + 1 }));
    case 'toggleStatus':
      return mapConv(s, a.convId, (c) => ({ ...c, status: c.status === 'open' ? 'closed' : 'open' }));
    case 'optOut':
      return mapConv(s, a.convId, (c) => ({ ...c, optedOut: true }));
    case 'pin': {
      const used = s.convs.filter((c) => c.pin).length;
      if (used >= MAX_PINS) return s;
      return mapConv(s, a.convId, (c) => ({ ...c, pin: used + 1 }));
    }
    case 'unpin': {
      const old = s.convs.find((c) => c.id === a.convId)?.pin ?? 0;
      return {
        ...s,
        convs: s.convs.map((c) => (c.id === a.convId ? { ...c, pin: 0 } : c.pin > old ? { ...c, pin: c.pin - 1 } : c)),
      };
    }
    case 'movePin': {
      // move a pinned conversation to a position; the others shift
      const order = s.convs.filter((c) => c.pin && c.id !== a.convId).sort((x, y) => x.pin - y.pin).map((c) => c.id);
      order.splice(Math.min(a.to, order.length + 1) - 1, 0, a.convId);
      return { ...s, convs: s.convs.map((c) => (order.includes(c.id) ? { ...c, pin: order.indexOf(c.id) + 1 } : c)) };
    }
    case 'addTask': {
      const id = s.tasks.length ? Math.max(...s.tasks.map((t) => t.id)) + 1 : 1;
      return { ...s, tasks: [...s.tasks, { ...a.task, id }] };
    }
    case 'updateTask':
      return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) };
    case 'toggleTask':
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, done: !t.done, doneAt: t.done ? null : new Date() } : t)),
      };
    case 'deleteTask':
      return { ...s, tasks: s.tasks.filter((t) => t.id !== a.id) };
  }
}

export interface AppCtx {
  state: State;
  dispatch: (a: Action) => void;
  toast: (text: string) => void;
  /** current time, refreshed every minute so labels and timers stay correct */
  now: Date;
  isMobile: boolean;
  /** intSmsFactor from the account: SMS segments billed as one message */
  smsFactor: number;
}

export const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside <Ctx.Provider>');
  return c;
}
