import { useEffect, useReducer, useRef, useState } from 'react';
import { Ctx, reducer, type State } from './store';
import { initialConversations, initialTasks, newMessageId } from './data/sample';
import { simulateNextError } from './lib/api';
import { SIMULATED_CODES, errorInfo } from './lib/errors';
import { taskState } from './lib/tasks';
import type { SendError } from './types';
import { ConversationList } from './components/ConversationList';
import { Thread } from './components/Thread';
import { DetailsPanel } from './components/DetailsPanel';
import { TasksView } from './components/TasksView';

const initial: State = {
  convs: initialConversations, tasks: initialTasks, view: 'inbox', selected: null, mobileThread: false, detailsOpen: true,
  statusFilter: 'all', channelFilter: 'all', search: '', taskFilter: 'open', taskSearch: '', taskPrio: 'all',
};

function useIsMobile() {
  const q = '(max-width: 760px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [now, setNow] = useState(() => new Date());
  const [toastText, setToastText] = useState<{ text: string; n: number } | null>(null);
  const [accountError, setAccountError] = useState<SendError | null>(null);
  const [taskRequest, setTaskRequest] = useState(0);
  const [simCode, setSimCode] = useState('');
  const isMobile = useIsMobile();

  const toast = (text: string) => setToastText((t) => ({ text, n: (t?.n ?? 0) + 1 }));
  useEffect(() => {
    if (!toastText) return;
    const t = setTimeout(() => setToastText(null), 2600);
    return () => clearTimeout(t);
  }, [toastText]);

  // every minute: reply-window timers, "today"/"late" labels
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // is this conversation on screen right now?
  const stateRef = useRef(state);
  stateRef.current = state;
  const visible = (id: number) => {
    const s = stateRef.current;
    return s.view === 'inbox' && s.selected === id && (!isMobile || s.mobileThread);
  };

  // coming back to a conversation that got messages while hidden marks them read
  useEffect(() => {
    if (state.selected !== null && visible(state.selected) && state.convs.find((c) => c.id === state.selected)?.unread) {
      dispatch({ type: 'markRead', convId: state.selected });
    }
  });

  // demo: a new inbound message arrives after 20 seconds (in production: pushed over WebSocket/SSE)
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch({ type: 'addMessage', convId: 2, msg: { id: newMessageId(), dir: 'in', text: 'עוד שאלה קטנה, אפשר לקבל את החשבונית גם בתור קישור? למשל www.example.co.il/invoice', time: new Date() } });
      if (!visible(2)) dispatch({ type: 'incomingUnread', convId: 2 });
      toast('הודעה חדשה מיוסי כהן');
    }, 20000);
    return () => clearTimeout(t);
  }, []);

  const conv = state.convs.find((c) => c.id === state.selected) ?? null;
  const unreadConvs = state.convs.filter((c) => c.unread).length;
  const openTasks = state.tasks.filter((t) => !t.done);
  const late = openTasks.filter((t) => taskState(t, now) === 'late').length;

  const layout = 'inbox' + (!conv ? ' nothing' : !state.detailsOpen ? ' no-details' : '') + (state.mobileThread && conv ? ' show-thread' : '');

  return (
    <Ctx.Provider value={{ state, dispatch, toast, now, isMobile }}>
      <div className="proto-banner">
        <span>אב-טיפוס לאישור עיצוב · נתוני דוגמה בלבד · שום דבר לא נשלח באמת</span>
        <label className="sim">
          סימולציית שגיאה בשליחה הבאה:
          <select value={simCode} aria-label="סימולציית שגיאה"
            onChange={(e) => { setSimCode(e.target.value); simulateNextError(e.target.value ? (e.target.value === 'network' ? 'network' : +e.target.value) : null); }}>
            <option value="">ללא</option>
            {SIMULATED_CODES.map((c) => (
              <option key={c} value={c}>{c === 'network' ? 'אין חיבור' : c} · {errorInfo({ code: c }).title}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="topbar">
        <h1>תיבת שיחות</h1>
        <button type="button" className={'ttab' + (state.view === 'inbox' ? ' active' : '')} onClick={() => dispatch({ type: 'view', view: 'inbox' })}>
          <i className="fa-regular fa-comments" /> שיחות {unreadConvs > 0 && <span className="count">{unreadConvs}</span>}
        </button>
        <button type="button" className={'ttab' + (state.view === 'tasks' ? ' active' : '')} onClick={() => dispatch({ type: 'view', view: 'tasks' })}>
          <i className="fa-solid fa-list-check" /> משימות <span className="count" title="משימות פתוחות">{openTasks.length}</span>
          {late > 0 && <span className="count alert" title="משימות באיחור">{late} באיחור</span>}
        </button>
        <span className="live" title="הנתונים מתעדכנים אוטומטית">מתעדכן אוטומטית</span>
      </div>

      <div className="view">
        {state.view === 'inbox' ? (
          <div className={layout}>
            <ConversationList />
            {conv ? (
              <Thread key={conv.id} conv={conv} accountError={accountError} setAccountError={setAccountError} taskRequest={taskRequest} />
            ) : (
              <main className="thread"><div className="thread-empty"><i className="fa-regular fa-comments" /><div>בחרו שיחה מהרשימה כדי להתחיל</div></div></main>
            )}
            {conv && state.detailsOpen && <DetailsPanel conv={conv} onNewTask={() => setTaskRequest((n) => n + 1)} />}
          </div>
        ) : <TasksView />}
      </div>

      <div className={'toast' + (toastText ? ' show' : '')} role="status" aria-live="polite">{toastText?.text}</div>
    </Ctx.Provider>
  );
}
