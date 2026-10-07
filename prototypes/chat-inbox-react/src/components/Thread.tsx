import { Fragment, useLayoutEffect, useRef, useState, type DragEvent } from 'react';
import type { Attachment, ComposerMode, Conversation, Message, Priority, SendError, Template } from '../types';
import { useApp } from '../store';
import { dayLabel, fmtLeft, hhmm, sameDay } from '../lib/dates';
import { asksOptOut, windowLeftMin } from '../lib/whatsapp';
import { errorInfo, type ErrorAction } from '../lib/errors';
import { fetchOlderMessages, sendMessage } from '../lib/api';
import { newMessageId } from '../data/sample';
import { RichText } from '../lib/richText';
import { DueLabel, PrioTag } from '../lib/tasks';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';
import { Avatar } from './Avatar';
import { ConfirmButton } from './ConfirmButton';
import { EditTaskButton, TaskEditor } from './TaskEditor';
import { Icon } from './Icon';

interface Props {
  conv: Conversation;
  /** an account-wide sending problem (payment, rate limit) */
  accountError: SendError | null;
  setAccountError: (e: SendError | null) => void;
  /** bumped by "new task" in the details panel */
  taskRequest: number;
}

// keyed by conversation id in the parent: drafts, attachments and scroll never carry over to another customer
export function Thread({ conv: c, accountError, setAccountError, taskRequest }: Props) {
  const { state, dispatch, toast, now } = useApp();
  const [mode, setMode] = useState<ComposerMode>('reply');
  // the server refused a free-form message (131047) even though our clock said the window was open
  const [forceTemplate, setForceTemplate] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [drag, setDrag] = useState(0);
  const [dropped, setDropped] = useState<File | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const stickBottom = useRef(true);
  const keepFromBottom = useRef<number | null>(null);

  useLayoutEffect(() => { if (taskRequest) setMode('task'); }, [taskRequest]);

  // a new message from the customer reopens the window: drop the server-forced template mode
  const lastIn = c.messages.filter((m) => m.dir === 'in').at(-1)?.id;
  useLayoutEffect(() => { setForceTemplate(false); }, [lastIn]);

  const left = windowLeftMin(c, now);
  const windowOpen = left === null || left > 0;
  const templateOnly = c.channel === 'wa' && (!windowOpen || forceTemplate);

  // scroll: stay where the user is reading; follow new messages only when at the bottom or after sending
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    if (keepFromBottom.current !== null) {
      el.scrollTop = el.scrollHeight - keepFromBottom.current;
      keepFromBottom.current = null;
    } else if (atBottom.current || stickBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
    stickBottom.current = false;
  }, [c.messages]);

  const onScroll = () => {
    const el = box.current!;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  // ------------------------------------------------------------ sending

  const update = (msgId: string, patch: Partial<Message>) => dispatch({ type: 'updateMessage', convId: c.id, msgId, patch });

  const deliver = (msg: Message, freeForm: boolean) => {
    sendMessage(
      { channel: c.channel, phone: c.phone, freeForm, windowOpen },
      (status, error) => {
        update(msg.id, { status, error });
        if (error) toast('הודעה ל' + c.name + ' נכשלה: ' + errorInfo(error).title);
      },
    )
      .then(() => {
        update(msg.id, { status: 'sent' });
        setAccountError(null); // sending works again
      })
      .catch((error: SendError) => {
        update(msg.id, { status: 'failed', error });
        const info = errorInfo(error);
        if (info.scope === 'account') setAccountError(error);
        if (error.code === 131047) setForceTemplate(true);
      });
  };

  const post = (msg: Message, freeForm: boolean) => {
    stickBottom.current = true;
    dispatch({ type: 'addMessage', convId: c.id, msg, markRead: true });
    deliver(msg, freeForm);
  };

  const onSend = (text: string, att: Attachment | null) =>
    post({ id: newMessageId(), dir: 'out', text, time: new Date(), status: 'sending', media: att ? { type: att.type, url: att.url, name: att.name, size: att.size } : undefined }, true);

  const onTemplate = (t: Template, vars: string[]) => {
    if (c.optedOut && t.category === 'marketing') return toast('אי אפשר לשלוח תבנית שיווקית ללקוח שהוסר מרשימת התפוצה');
    const text = t.body.replace(/\{\{(\d+)\}\}/g, (m, n: string) => vars[+n - 1] ?? m);
    post({ id: newMessageId(), dir: 'out', text, time: new Date(), status: 'sending', srcLabel: 'תבנית: ' + t.label, template: { name: t.name, vars } }, false);
    setForceTemplate(false);
  };

  const onErrorAction = (msg: Message, a: ErrorAction | 'delete') => {
    if (a === 'retry') {
      update(msg.id, { status: 'sending', error: undefined, time: new Date() });
      deliver(msg, !msg.template);
    } else if (a === 'template') {
      setForceTemplate(true);
      setMode('reply');
    } else if (a === 'copy') {
      navigator.clipboard.writeText(msg.text).then(() => toast('הטקסט הועתק'), () => toast('לא הצלחנו להעתיק. סמנו את הטקסט והעתיקו ידנית'));
    } else {
      dispatch({ type: 'removeMessage', convId: c.id, msgId: msg.id });
      toast('ההודעה נמחקה');
    }
  };

  // ------------------------------------------------------------ other actions

  const onNote = (text: string) => {
    stickBottom.current = true;
    dispatch({ type: 'addMessage', convId: c.id, msg: { id: newMessageId(), note: true, text, time: new Date() }, markRead: true });
    toast('ההערה נשמרה');
  };

  const onTask = (title: string, due: Date | null, prio: Priority) => {
    dispatch({ type: 'addTask', task: { convId: c.id, title, due, prio, done: false, created: new Date() } });
    setMode('reply');
    toast('המשימה נוצרה');
  };

  const loadOlder = async () => {
    if (loadingOlder) return;
    setLoadingOlder(true);
    const { page, rest } = await fetchOlderMessages(c.older);
    setLoadingOlder(false);
    // the reducer adds them to this conversation by id, even if the user moved on meanwhile
    if (box.current) keepFromBottom.current = box.current.scrollHeight - box.current.scrollTop;
    dispatch({ type: 'prependOlder', convId: c.id, page, rest });
    toast(page.length ? 'נטענו ' + page.length + ' הודעות קודמות' : 'אין הודעות קודמות');
  };

  const optOut = () => { dispatch({ type: 'optOut', convId: c.id }); toast('איש הקשר הוסר מרשימת התפוצה'); };

  const togglePin = () => {
    if (c.pin) { dispatch({ type: 'unpin', convId: c.id }); toast('ההצמדה בוטלה'); return; }
    if (state.convs.filter((x) => x.pin).length >= 3) return toast('אפשר להצמיד עד 3 שיחות. בטלו הצמדה קודם.');
    dispatch({ type: 'pin', convId: c.id });
    toast('השיחה הוצמדה למעלה');
  };

  // drag & drop a file onto the thread
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');
  const canDrop = c.channel === 'wa' && !templateOnly;

  // ------------------------------------------------------------ timeline

  type Item = { kind: 'msg' | 'note'; time: Date; m: Message } | { kind: 'task'; time: Date; t: (typeof state.tasks)[number] };
  const items: Item[] = [
    ...c.messages.map((m): Item => ({ kind: m.note ? 'note' : 'msg', time: m.time, m })),
    ...state.tasks.filter((t) => t.convId === c.id).map((t): Item => ({ kind: 'task', time: t.created, t })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  let lastDay: Date | null = null;

  return (
    <main className="thread"
      onDragEnter={(e) => { if (hasFiles(e)) { e.preventDefault(); setDrag((d) => d + 1); } }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDrag((d) => Math.max(0, d - 1))}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(0);
        const f = e.dataTransfer.files[0];
        if (!f) return;
        if (!canDrop) return toast(c.channel !== 'wa' ? 'שליחת קבצים זמינה רק ב-WhatsApp' : 'מחוץ לחלון 24 השעות אפשר לשלוח רק תבנית');
        setMode('reply');
        setDropped(f);
      }}>
      <div className="thread-head">
        <button type="button" className="icon-btn back" onClick={() => dispatch({ type: 'back' })} title="חזרה לרשימה" aria-label="חזרה לרשימה">
          <Icon name="solid/arrow-right" />
        </button>
        <Avatar name={c.name} />
        <div className="who">
          <div className="name">{c.name}</div>
          <div className="sub"><span className="ltr">{c.phone}</span> · {c.channel === 'wa' ? 'WhatsApp' : 'SMS'}</div>
        </div>
        <button type="button" className={'icon-btn' + (c.pin ? ' on' : '')} onClick={togglePin} title={c.pin ? 'ביטול הצמדה' : 'הצמדה למעלה'} aria-label={c.pin ? 'ביטול הצמדה' : 'הצמדה למעלה'}>
          <Icon name="solid/thumbtack" /><span className="lbl">{c.pin ? 'מוצמדת ' + c.pin : 'הצמדה'}</span>
        </button>
        <button type="button" className="icon-btn" onClick={() => { dispatch({ type: 'toggleStatus', convId: c.id }); toast(c.status === 'open' ? 'השיחה סומנה כסגורה' : 'השיחה נפתחה מחדש'); }}>
          {c.status === 'open'
            ? <><Icon name="solid/check" /><span className="lbl">סימון כסגורה</span></>
            : <><Icon name="solid/rotate-left" /><span className="lbl">פתיחה מחדש</span></>}
        </button>
        <button type="button" className="icon-btn" onClick={() => dispatch({ type: 'toggleDetails' })} title="פרטי איש קשר" aria-label="פרטי איש קשר">
          <Icon name="regular/id-card" />
        </button>
      </div>

      {accountError && (
        <div className="window-bar account-err" role="alert">
          <Icon name="solid/triangle-exclamation" />
          <span><b>{errorInfo(accountError).title}.</b> {errorInfo(accountError).todo}</span>
          <button type="button" onClick={() => setAccountError(null)}>הבנתי</button>
        </div>
      )}
      {c.channel === 'sms' ? (
        <div className="window-bar sms"><Icon name="solid/comment-sms" /><span>שיחת SMS · אין שליחת קבצים</span></div>
      ) : templateOnly ? (
        <div className="window-bar closed"><Icon name="solid/lock" /><span>עברו 24 שעות מההודעה האחרונה של הלקוח · אפשר לשלוח רק תבנית מאושרת</span></div>
      ) : (
        <div className="window-bar open"><Icon name="regular/clock" /><span>חלון המענה פתוח · אפשר לשלוח הודעות רגילות וקבצים, לא רק תבניות, עוד {fmtLeft(left ?? 0)} שעות</span></div>
      )}
      {c.optedOut ? (
        <div className="window-bar optout"><Icon name="solid/ban" /><span>הלקוח הוסר מרשימת התפוצה · מותר לשלוח לו רק הודעות שירות, לא פרסום</span></div>
      ) : asksOptOut(c) && (
        <div className="window-bar suggest"><Icon name="solid/circle-exclamation" /><span>הלקוח ביקש הסרה מדיוור</span>
          <button type="button" onClick={optOut}>הסרה מרשימת התפוצה</button>
        </div>
      )}

      <div className="messages" ref={box} onScroll={onScroll}>
        {c.older.length ? (
          <div className="load-older">
            <button type="button" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? <><Icon name="solid/spinner" spin /> טוען הודעות...</> : <><Icon name="solid/clock-rotate-left" /> טעינת הודעות קודמות</>}
            </button>
          </div>
        ) : <div className="history-start">תחילת השיחה</div>}

        {items.map((it) => {
          const day = !lastDay || !sameDay(lastDay, it.time) ? <div className="day">{dayLabel(it.time, now)}</div> : null;
          lastDay = it.time;
          const key = it.kind === 'task' ? 't' + it.t.id : it.m.id;
          if (it.kind === 'note') {
            return (
              <Fragment key={key}>{day}
                <div className="note">
                  <div className="src"><Icon name="regular/note-sticky" /> הערה פנימית · {hhmm(it.time)}</div>
                  <RichText text={it.m.text} />
                  <ConfirmButton className="note-del" label="מחיקת ההערה" confirmText="למחוק?"
                    onConfirm={() => { dispatch({ type: 'removeMessage', convId: c.id, msgId: it.m.id }); toast('ההערה נמחקה'); }}>
                    <Icon name="regular/trash-can" />
                  </ConfirmButton>
                </div>
              </Fragment>
            );
          }
          if (it.kind === 'task') {
            const t = it.t;
            return (
              <Fragment key={key}>{day}
                <div className={'task-card' + (t.done ? ' done' : '') + (editingTask === t.id ? ' editing' : '')}>
                  <button type="button" className={'chk' + (t.done ? ' on' : '')} onClick={() => dispatch({ type: 'toggleTask', id: t.id })}
                    title={t.done ? 'סימון כפתוחה' : 'סימון כבוצעה'} aria-label={t.done ? 'סימון כפתוחה' : 'סימון כבוצעה'}>
                    <Icon name="solid/check" />
                  </button>
                  {editingTask === t.id ? <TaskEditor task={t} onClose={() => setEditingTask(null)} /> : (
                    <>
                      <div>
                        <div className="t-title">{t.title}</div>
                        <div className="t-sub"><span><Icon name="solid/list-check" /> משימה</span><DueLabel task={t} now={now} /><PrioTag prio={t.prio} /></div>
                      </div>
                      <EditTaskButton onClick={() => setEditingTask(t.id)} />
                    </>
                  )}
                </div>
              </Fragment>
            );
          }
          const m = it.m;
          return (
            <Fragment key={key}>{day}
              <MessageBubble msg={m} channel={c.channel} onZoom={setZoom} onErrorAction={(a) => onErrorAction(m, a)} />
            </Fragment>
          );
        })}
      </div>

      <Composer conv={c} templateOnly={templateOnly} mode={mode} setMode={setMode}
        onSend={onSend} onNote={onNote} onTemplate={onTemplate} onTask={onTask}
        droppedFile={dropped} onDropHandled={() => setDropped(null)} />

      {drag > 0 && canDrop && <div className="drop-hint"><div><Icon name="solid/cloud-arrow-up" /> שחררו כאן כדי לצרף</div></div>}
      {zoom && <Lightbox url={zoom} onClose={() => setZoom(null)} />}
    </main>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useLayoutEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return <div className="lightbox" onClick={onClose} role="dialog" aria-label="תמונה מוגדלת"><img src={url} alt="" /></div>;
}
