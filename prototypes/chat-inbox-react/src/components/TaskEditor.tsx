import { useEffect, useRef, useState } from 'react';
import type { Priority, Task } from '../types';
import { useApp } from '../store';
import { toLocalInput } from '../lib/dates';
import { Icon } from './Icon';

/** inline form to change a task's title, due date and priority */
export function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const { dispatch, toast } = useApp();
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.due ? toLocalInput(task.due) : '');
  const [prio, setPrio] = useState<Priority>(task.prio);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); titleRef.current?.select(); }, []);

  const save = () => {
    const t = title.trim();
    if (!t) { toast('כתבו מה צריך לעשות'); titleRef.current?.focus(); return; }
    dispatch({ type: 'updateTask', id: task.id, patch: { title: t, due: due ? new Date(due) : null, prio } });
    toast('המשימה עודכנה');
    onClose();
  };

  return (
    <div className="task-edit" onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <input ref={titleRef} type="text" maxLength={200} aria-label="כותרת המשימה" value={title}
        onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} />
      <div className="task-edit-row">
        <input type="datetime-local" aria-label="תאריך יעד" value={due} onChange={(e) => setDue(e.target.value)} />
        {due && <button type="button" className="link-btn" onClick={() => setDue('')}>ללא תאריך</button>}
        <select aria-label="עדיפות" value={prio} onChange={(e) => setPrio(e.target.value as Priority)}>
          <option value="high">עדיפות גבוהה</option>
          <option value="normal">עדיפות רגילה</option>
          <option value="low">עדיפות נמוכה</option>
        </select>
      </div>
      <div className="task-edit-actions">
        <button type="button" className="primary task" onClick={save}><Icon name="solid/check" /> שמירה</button>
        <button type="button" className="ghost" onClick={onClose}>ביטול</button>
      </div>
    </div>
  );
}

/** pencil button that opens the editor */
export const EditTaskButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" className="edit-task" onClick={(e) => { e.stopPropagation(); onClick(); }} title="עריכת המשימה" aria-label="עריכת המשימה">
    <Icon name="solid/pen" />
  </button>
);
