import type { Priority, Task } from '../types';
import { addDays, hhmm, sameDay } from './dates';

export type TaskState = 'done' | 'nodate' | 'late' | 'today' | 'tomorrow' | 'later';

export function taskState(t: Task, now = new Date()): TaskState {
  if (t.done) return 'done';
  if (!t.due) return 'nodate';
  if (t.due < now) return 'late';
  if (sameDay(t.due, now)) return 'today';
  if (sameDay(t.due, addDays(now, 1))) return 'tomorrow';
  return 'later';
}

export function DueLabel({ task, now }: { task: Task; now: Date }) {
  if (!task.due) return <span className="due">ללא תאריך יעד</span>;
  const s = taskState(task, now), d = task.due;
  let txt: string;
  if (sameDay(d, now)) txt = 'היום ' + hhmm(d);
  else if (sameDay(d, addDays(now, 1))) txt = 'מחר ' + hhmm(d);
  else if (sameDay(d, addDays(now, -1))) txt = 'אתמול ' + hhmm(d);
  else txt = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ' ' + hhmm(d);
  return (
    <span className={'due' + (s === 'late' ? ' late' : s === 'today' ? ' today' : '')}>
      <i className="fa-regular fa-calendar" /> {s === 'late' ? 'באיחור · ' : ''}{txt}
    </span>
  );
}

const prioText: Record<Priority, string> = { high: 'גבוהה', normal: 'רגילה', low: 'נמוכה' };
export const PrioTag = ({ prio }: { prio: Priority }) => <span className={'prio ' + prio}>{prioText[prio]}</span>;

export const openTasksOf = (tasks: Task[], convId: number) => tasks.filter((t) => t.convId === convId && !t.done);
