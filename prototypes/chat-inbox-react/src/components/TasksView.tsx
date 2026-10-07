import { useApp, type TaskFilter } from '../store';
import { addDays } from '../lib/dates';
import { DueLabel, PrioTag, taskState, type TaskState } from '../lib/tasks';
import type { Task } from '../types';
import { ConfirmButton } from './ConfirmButton';
import { TaskEditor } from './TaskEditor';
import { useState } from 'react';
import { Icon } from './Icon';

const FILTERS: [TaskFilter, string][] = [['open', 'פתוחות'], ['late', 'באיחור'], ['today', 'להיום'], ['week', 'השבוע'], ['done', 'בוצעו'], ['all', 'הכל']];
const GROUPS: { key: TaskState; label: string; late?: boolean }[] = [
  { key: 'late', label: 'באיחור', late: true }, { key: 'today', label: 'היום' }, { key: 'tomorrow', label: 'מחר' },
  { key: 'later', label: 'בהמשך' }, { key: 'nodate', label: 'ללא תאריך יעד' }, { key: 'done', label: 'בוצעו' },
];
const PRIO_RANK = { high: 0, normal: 1, low: 2 };

export function TasksView() {
  const { state, dispatch, toast, now } = useApp();
  const [editing, setEditing] = useState<number | null>(null);
  const open = state.tasks.filter((t) => !t.done);
  const stats: [TaskFilter, number, string, string][] = [
    ['open', open.length, 'משימות פתוחות', ''],
    ['late', open.filter((t) => taskState(t, now) === 'late').length, 'באיחור', 'late'],
    ['today', open.filter((t) => taskState(t, now) === 'today').length, 'להיום', 'today'],
    ['done', state.tasks.length - open.length, 'בוצעו', ''],
  ];

  const q = state.taskSearch.trim();
  const weekEnd = addDays(now, 7);
  const conv = (t: Task) => state.convs.find((c) => c.id === t.convId)!;
  const list = state.tasks.filter((t) => {
    const s = taskState(t, now);
    const f = state.taskFilter;
    if (f === 'open' && t.done) return false;
    if (f === 'late' && s !== 'late') return false;
    if (f === 'today' && s !== 'today') return false;
    if (f === 'week' && (t.done || !t.due || t.due > weekEnd)) return false;
    if (f === 'done' && !t.done) return false;
    if (state.taskPrio !== 'all' && t.prio !== state.taskPrio) return false;
    if (q) { const c = conv(t); if (!(t.title + ' ' + c.name + ' ' + c.phone).includes(q)) return false; }
    return true;
  }).sort((a, b) => Number(a.done) - Number(b.done) || (a.due?.getTime() ?? 8e15) - (b.due?.getTime() ?? 8e15) || PRIO_RANK[a.prio] - PRIO_RANK[b.prio]);

  return (
    <div className="tasks-view">
      <div className="tasks-wrap">
        <div className="tasks-stats">
          {stats.map(([f, n, l, cls]) => (
            <button key={f} type="button" className={'stat ' + cls} onClick={() => dispatch({ type: 'taskFilter', filter: f })}>
              <div className="n">{n}</div><div className="l">{l}</div>
            </button>
          ))}
        </div>
        <div className="tasks-toolbar">
          <label className="search">
            <Icon name="solid/magnifying-glass" />
            <input type="search" placeholder="חיפוש משימה או לקוח" aria-label="חיפוש משימות" value={state.taskSearch}
              onChange={(e) => dispatch({ type: 'taskFilter', search: e.target.value })} />
          </label>
          <div className="filters" style={{ marginTop: 0 }}>
            {FILTERS.map(([k, l]) => (
              <button key={k} type="button" className={'chip' + (state.taskFilter === k ? ' active' : '')} onClick={() => dispatch({ type: 'taskFilter', filter: k })}>{l}</button>
            ))}
          </div>
          <select aria-label="עדיפות" value={state.taskPrio} onChange={(e) => dispatch({ type: 'taskFilter', prio: e.target.value as typeof state.taskPrio })}>
            <option value="all">כל העדיפויות</option>
            <option value="high">עדיפות גבוהה</option>
            <option value="normal">עדיפות רגילה</option>
            <option value="low">עדיפות נמוכה</option>
          </select>
        </div>
        {GROUPS.map((g) => {
          const items = list.filter((t) => taskState(t, now) === g.key);
          if (!items.length) return null;
          return (
            <div key={g.key} className="t-group">
              <h4 className={g.late ? 'late' : ''}>{g.label} ({items.length})</h4>
              {items.map((t) => {
                const c = conv(t);
                return (
                  <div key={t.id} className={'t-row' + (t.done ? ' done' : '')}>
                    <button type="button" className={'chk' + (t.done ? ' on' : '')} onClick={() => dispatch({ type: 'toggleTask', id: t.id })}
                      aria-label={t.done ? 'סימון כפתוחה' : 'סימון כבוצעה'}><Icon name="solid/check" /></button>
                    {editing === t.id ? <TaskEditor task={t} onClose={() => setEditing(null)} /> : <>
                    <div className="t-main">
                      <div className="t-title">{t.title}</div>
                      <div className="t-sub">
                        <button type="button" className="contact-link" onClick={() => dispatch({ type: 'open', id: c.id })}>
                          <Icon name={c.channel === 'wa' ? 'brands/whatsapp' : 'solid/comment-sms'} /> {c.name}
                        </button>
                        <DueLabel task={t} now={now} /><PrioTag prio={t.prio} />
                        {t.done && t.doneAt && <span>בוצע {t.doneAt.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span>}
                      </div>
                    </div>
                    <div className="acts">
                      <button type="button" className="icon-btn" onClick={() => setEditing(t.id)} title="עריכת המשימה" aria-label="עריכת המשימה">
                        <Icon name="solid/pen" />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => dispatch({ type: 'open', id: c.id })} title="מעבר לשיחה" aria-label="מעבר לשיחה">
                        <Icon name="regular/comments" />
                      </button>
                      <ConfirmButton className="icon-btn" label="מחיקת משימה" confirmText="למחוק?" onConfirm={() => { dispatch({ type: 'deleteTask', id: t.id }); toast('המשימה נמחקה'); }}>
                        <Icon name="regular/trash-can" />
                      </ConfirmButton>
                    </div>
                    </>}
                  </div>
                );
              })}
            </div>
          );
        })}
        {!list.length && <div className="empty-list">אין משימות שמתאימות לסינון</div>}
      </div>
    </div>
  );
}
