import type { Conversation } from '../types';
import { useApp } from '../store';
import { DueLabel } from '../lib/tasks';
import { Avatar } from './Avatar';
import { ConfirmButton } from './ConfirmButton';

export function DetailsPanel({ conv: c, onNewTask }: { conv: Conversation; onNewTask: () => void }) {
  const { state, dispatch, toast, now } = useApp();
  const out = c.messages.filter((m) => m.dir === 'out').length;
  const inc = c.messages.filter((m) => m.dir === 'in').length;
  const tasks = state.tasks.filter((t) => t.convId === c.id)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due?.getTime() ?? 8e15) - (b.due?.getTime() ?? 8e15));

  return (
    <aside className="details">
      <div className="d-head">
        <Avatar name={c.name} big />
        <div className="name">{c.name}</div>
        <div className="phone"><span className="ltr">{c.phone}</span></div>
      </div>
      <div className="d-sec">
        <h3>משימות <button type="button" onClick={onNewTask}><i className="fa-solid fa-plus" /> משימה חדשה</button></h3>
        {tasks.length ? tasks.map((t) => (
          <div key={t.id} className="mini-task">
            <button type="button" className={'chk' + (t.done ? ' on' : '')} onClick={() => dispatch({ type: 'toggleTask', id: t.id })}
              aria-label={t.done ? 'סימון כפתוחה' : 'סימון כבוצעה'}><i className="fa-solid fa-check" /></button>
            <div>
              <div className={t.done ? 'done-text' : ''}>{t.title}</div>
              <div className="t-sub"><DueLabel task={t} now={now} /></div>
            </div>
          </div>
        )) : <span className="muted-sm">אין משימות לאיש הקשר</span>}
      </div>
      <div className="d-sec">
        <h3>קבוצות</h3>
        <div className="groups">
          {c.groups.length ? c.groups.map((g) => <span key={g} className="group">{g}</span>) : <span className="muted-sm">לא משויך לקבוצה</span>}
        </div>
      </div>
      <div className="d-sec">
        <h3>פעילות</h3>
        <div className="kv"><span>ערוץ</span><span>{c.channel === 'wa' ? 'WhatsApp' : 'SMS'}</span></div>
        <div className="kv"><span>קמפיין אחרון</span><span>{c.lastCampaign}</span></div>
        <div className="kv"><span>הודעות שנשלחו</span><span>{out}</span></div>
        <div className="kv"><span>תגובות מהלקוח</span><span>{inc}</span></div>
      </div>
      <div className="d-sec">
        <h3>הסרה מדיוור</h3>
        {c.optedOut
          ? <div className="optout-done"><i className="fa-solid fa-ban" /> הוסר מרשימת התפוצה</div>
          : (
            <ConfirmButton className="danger-btn" confirmText="לחצו שוב כדי לאשר את ההסרה"
              onConfirm={() => { dispatch({ type: 'optOut', convId: c.id }); toast('איש הקשר הוסר מרשימת התפוצה'); }}>
              <i className="fa-solid fa-ban" /> הסרה מרשימת התפוצה
            </ConfirmButton>
          )}
      </div>
    </aside>
  );
}
