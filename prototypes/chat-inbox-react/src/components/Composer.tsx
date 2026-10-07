import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import type { Attachment, ComposerMode, Conversation, Priority, Template } from '../types';
import { quickReplies, templates } from '../data/sample';
import { smsParts } from '../lib/sms';
import { SMS_FACTOR } from '../lib/account';
import { checkFile } from '../lib/files';
import { fmtSize, toLocalInput } from '../lib/dates';
import { loadRecent, RECENT_MAX, saveRecent } from '../lib/emoji';
import { useApp } from '../store';
import { EmojiPicker } from './EmojiPicker';

const MAX_LEN = 4096; // WhatsApp text limit

interface Props {
  conv: Conversation;
  /** WhatsApp window is closed (or the server said so): only templates can be sent */
  templateOnly: boolean;
  mode: ComposerMode;
  setMode: (m: ComposerMode) => void;
  taskPrefill: string;
  onSend: (text: string, attachment: Attachment | null) => void;
  onNote: (text: string) => void;
  onTemplate: (t: Template, vars: string[]) => void;
  onTask: (title: string, due: Date | null, prio: Priority) => void;
  /** a file dropped on the thread */
  droppedFile: File | null;
  onDropHandled: () => void;
}

export function Composer(p: Props) {
  const tabs = (
    <>
      <button type="button" className={'ctab' + (p.mode === 'reply' ? ' active' : '')} onClick={() => p.setMode('reply')}>תשובה ללקוח</button>
      <button type="button" className={'ctab task-tab' + (p.mode === 'task' ? ' active' : '')} onClick={() => p.setMode('task')}>
        <i className="fa-solid fa-list-check" /> משימה
      </button>
      <button type="button" className={'ctab note-tab' + (p.mode === 'note' ? ' active' : '')} onClick={() => p.setMode('note')}>
        <i className="fa-regular fa-note-sticky" /> הערה פנימית
      </button>
    </>
  );

  if (p.mode === 'task') return <TaskForm tabs={tabs} prefill={p.taskPrefill} onSave={p.onTask} />;
  if (p.mode === 'reply' && p.templateOnly) return <TemplateBox tabs={tabs} conv={p.conv} onSend={p.onTemplate} />;
  return <TextBox {...p} tabs={tabs} />;
}

// ---------------------------------------------------------------- reply / note

function TextBox(p: Props & { tabs: React.ReactNode }) {
  const { toast, isMobile } = useApp();
  const note = p.mode === 'note';
  const canAttach = !note && p.conv.channel === 'wa';
  const [text, setText] = useState('');
  const [att, setAtt] = useState<Attachment | null>(null);
  const [quickIdx, setQuickIdx] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recent, setRecent] = useState(loadRecent);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const emojiWrap = useRef<HTMLDivElement>(null);

  const quickOpen = !note && text.startsWith('/');
  const filter = text.slice(1);
  const quick = quickOpen ? quickReplies.filter((q) => !filter || q.key.startsWith(filter) || q.text.includes(filter)) : [];

  // grow the textarea with its content
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [text]);

  useEffect(() => {
    if (!isMobile) input.current?.focus(); // on a phone this would pop the keyboard over the conversation
  }, [isMobile, note]);

  // free the preview URL when the attachment is removed or replaced, or the composer goes away,
  // but not after sending: the sent message still shows it
  const sentUrl = useRef<string | null>(null);
  useEffect(() => () => { if (att && att.url !== sentUrl.current) URL.revokeObjectURL(att.url); }, [att]);

  useEffect(() => {
    if (!emojiOpen) return;
    const close = (e: MouseEvent) => { if (!emojiWrap.current?.contains(e.target as Node)) setEmojiOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [emojiOpen]);

  const takeFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (p.conv.channel !== 'wa') return toast('שליחת קבצים זמינה רק ב-WhatsApp');
    const r = await checkFile(file);
    // if the user opened another conversation meanwhile, this component is gone and nothing happens
    if (!r.ok) return toast(r.error);
    setAtt({ type: r.type, name: r.name, size: file.size, url: URL.createObjectURL(file), file });
    input.current?.focus();
  };

  useEffect(() => {
    if (p.droppedFile) { void takeFile(p.droppedFile); p.onDropHandled(); }
  }, [p.droppedFile]);

  // insert at the cursor (or wrap the selection) and keep typing
  const insertAt = (before: string, after = '') => {
    const el = input.current;
    const a = el ? el.selectionStart : text.length, b = el ? el.selectionEnd : text.length;
    const next = text.slice(0, a) + before + text.slice(a, b) + after + text.slice(b);
    if (next.length > MAX_LEN) return toast('ההודעה ארוכה מדי');
    setText(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = a + before.length;
      el.selectionEnd = b + before.length;
    });
  };

  const pickEmoji = (e: string) => {
    insertAt(e);
    const next = [e, ...recent.filter((x) => x !== e)].slice(0, RECENT_MAX);
    setRecent(next);
    saveRecent(next);
  };

  const send = () => {
    const t = text.trim();
    if (note) {
      if (!t) return;
      p.onNote(t);
    } else {
      if (!t && !att) return;
      if (att) sentUrl.current = att.url;
      p.onSend(t, att);
      setAtt(null);
    }
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (quick.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setQuickIdx((i) => (i + (e.key === 'ArrowDown' ? 1 : quick.length - 1)) % quick.length);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (quick.length) { setText(quick[Math.min(quickIdx, quick.length - 1)].text); return; }
      send();
    }
    if (e.key === 'Escape') { setEmojiOpen(false); if (quickOpen) setText(''); }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (note) return;
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === 'file') { e.preventDefault(); void takeFile(item.getAsFile()); return; }
    }
  };

  const fmtBar = (note || p.conv.channel === 'wa') && (
    <div className="fmt-bar" onMouseDown={(e) => e.preventDefault()}>
      <button type="button" title="מודגש" aria-label="מודגש" onClick={() => insertAt('*', '*')}><b>B</b></button>
      <button type="button" title="נטוי" aria-label="נטוי" onClick={() => insertAt('_', '_')}><i>I</i></button>
      <button type="button" title="קו חוצה" aria-label="קו חוצה" onClick={() => insertAt('~', '~')}><s>S</s></button>
      <button type="button" title="כתב מכונה" aria-label="כתב מכונה" onClick={() => insertAt('```', '```')}><i className="fa-solid fa-code" /></button>
    </div>
  );

  return (
    <div className={'composer' + (note ? ' note-mode' : '')}>
      <div className="composer-tabs">{p.tabs}{fmtBar}</div>
      {att && !note && (
        <div className="att-preview">
          {att.type === 'image' ? <img src={att.url} alt="" /> : <div className="pdf"><i className="fa-regular fa-file-pdf" /></div>}
          <div className="info"><b>{att.name}</b><span>{fmtSize(att.size)} · נשלח ישירות ל-WhatsApp ולא נשמר אצלנו</span></div>
          <button type="button" className="x" title="הסרת הקובץ" aria-label="הסרת הקובץ" onClick={() => setAtt(null)}><i className="fa-solid fa-xmark" /></button>
        </div>
      )}
      {quick.length > 0 && (
        <div className="quick show">
          <div className="quick-head">תשובות מהירות · חצים לבחירה, Enter להוספה</div>
          {quick.map((q, i) => (
            <div key={q.key} className={'quick-item' + (i === Math.min(quickIdx, quick.length - 1) ? ' hl' : '')}
              onMouseDown={(e) => { e.preventDefault(); setText(q.text); }}>
              <b>/{q.key}</b><span>{q.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="compose-row">
        <div ref={emojiWrap} className="emoji-wrap">
          {emojiOpen && <EmojiPicker recent={recent} onPick={pickEmoji} />}
          <button type="button" className="round-btn attach-btn" title="אימוג'י" aria-label="אימוג'י" aria-expanded={emojiOpen}
            onMouseDown={(e) => e.preventDefault()} onClick={() => setEmojiOpen((o) => !o)}>
            <i className="fa-regular fa-face-smile" />
          </button>
        </div>
        {!note && (
          <button type="button" className="round-btn attach-btn" disabled={!canAttach} aria-label="צירוף קובץ"
            title={canAttach ? 'צירוף תמונה (JPG/PNG עד 5MB) או PDF (עד 100MB)' : 'שליחת קבצים זמינה רק ב-WhatsApp'}
            onClick={() => { if (fileInput.current) { fileInput.current.value = ''; fileInput.current.click(); } }}>
            <i className="fa-solid fa-paperclip" />
          </button>
        )}
        <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,application/pdf" onChange={(e) => void takeFile(e.target.files?.[0])} />
        <textarea ref={input} rows={1} maxLength={MAX_LEN} value={text} aria-label={note ? 'הערה פנימית' : 'הודעה'}
          placeholder={note ? 'כתבו הערה לעצמכם...' : att ? 'כיתוב לקובץ (לא חובה)...' : 'כתבו הודעה...'}
          onChange={(e) => { setText(e.target.value); setQuickIdx(0); }} onKeyDown={onKey} onPaste={onPaste} />
        <button type="button" className="round-btn send-btn" onClick={send} title={note ? 'שמירת הערה' : 'שליחה'} aria-label={note ? 'שמירת הערה' : 'שליחה'}>
          <i className={'fa-solid ' + (note ? 'fa-check' : 'fa-paper-plane')} />
        </button>
      </div>
      <div className="compose-hint">
        {note ? <span>הערה פנימית לא נשלחת ללקוח</span> : (
          <span>Enter לשליחה · Shift+Enter לשורה חדשה · <b>/</b> לתשובות מהירות{canAttach ? ' · אפשר גם לגרור או להדביק תמונה' : ''}</span>
        )}
        <span id="counter">{!note && p.conv.channel === 'sms' ? smsParts(text, SMS_FACTOR) : ''}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- task

function TaskForm({ tabs, prefill, onSave }: { tabs: React.ReactNode; prefill: string; onSave: Props['onTask'] }) {
  const { toast, isMobile } = useApp();
  const [title, setTitle] = useState(prefill);
  const [due, setDue] = useState('');
  const [chip, setChip] = useState('none');
  const [prio, setPrio] = useState<Priority>('normal');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitle(prefill); }, [prefill]);
  useEffect(() => {
    if (isMobile && !prefill) return;
    titleRef.current?.focus();
    if (prefill) titleRef.current?.select();
  }, [prefill, isMobile]);

  const pick = (k: string) => {
    setChip(k);
    if (k === 'none') return setDue('');
    const d = new Date();
    if (k === 'today') { const h = Math.max(d.getHours() + 2, 17); if (h > 23) d.setHours(23, 59, 0, 0); else d.setHours(h, 0, 0, 0); }
    if (k === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); }
    if (k === '3d') { d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); }
    if (k === 'week') { d.setDate(d.getDate() + 7); d.setHours(10, 0, 0, 0); }
    setDue(toLocalInput(d));
  };

  const save = () => {
    const t = title.trim();
    if (!t) { toast('כתבו מה צריך לעשות'); titleRef.current?.focus(); return; }
    onSave(t, due ? new Date(due) : null, prio);
  };

  const chips: [string, string][] = [['today', 'היום'], ['tomorrow', 'מחר'], ['3d', 'בעוד 3 ימים'], ['week', 'בעוד שבוע'], ['none', 'ללא']];
  return (
    <div className="composer">
      <div className="composer-tabs">{tabs}</div>
      <div className="task-form">
        <input ref={titleRef} type="text" maxLength={200} aria-label="כותרת המשימה" placeholder="מה צריך לעשות? למשל: לחזור ללקוח עם הצעת מחיר"
          value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} />
        <div className="task-row">
          <span className="muted-sm">תאריך יעד:</span>
          {chips.map(([k, l]) => (
            <button key={k} type="button" className={'chip' + (chip === k ? ' active' : '')} onClick={() => pick(k)}>{l}</button>
          ))}
        </div>
        <div className="task-row">
          <input type="datetime-local" aria-label="תאריך יעד" value={due} onChange={(e) => { setDue(e.target.value); setChip(''); }} />
          <select aria-label="עדיפות" value={prio} onChange={(e) => setPrio(e.target.value as Priority)}>
            <option value="normal">עדיפות רגילה</option>
            <option value="high">עדיפות גבוהה</option>
            <option value="low">עדיפות נמוכה</option>
          </select>
        </div>
        <div className="task-actions">
          <span>המשימה נשמרת אצלכם בלבד ולא נשלחת ללקוח</span>
          <button type="button" className="primary task" onClick={save}>יצירת משימה</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- template (24h window closed)

function TemplateBox({ tabs, conv, onSend }: { tabs: React.ReactNode; conv: Conversation; onSend: Props['onTemplate'] }) {
  const { toast } = useApp();
  const [idx, setIdx] = useState(0);
  const t = templates[idx];
  const count = (t.body.match(/\{\{\d+\}\}/g) || []).length;
  const [vars, setVars] = useState<string[]>(() => [conv.name.split(' ')[0]]);

  const preview = t.body.replace(/\{\{(\d+)\}\}/g, (m, n: string) => vars[+n - 1] || m);

  const send = () => {
    const vs = Array.from({ length: count }, (_, i) => (vars[i] || '').trim());
    if (vs.some((v) => !v)) return toast('יש למלא את כל המשתנים בתבנית');
    onSend(t, vs);
  };

  return (
    <div className="composer">
      <div className="composer-tabs">{tabs}</div>
      <div className="template-box">
        <p><i className="fa-solid fa-circle-info" /> מחוץ לחלון 24 השעות WhatsApp מאפשרת לשלוח רק תבנית מאושרת. אחרי שהלקוח יענה, אפשר יהיה לשלוח הודעות רגילות וקבצים.</p>
        <select aria-label="תבנית" value={idx} onChange={(e) => setIdx(+e.target.value)}>
          {templates.map((x, i) => <option key={x.name} value={i}>{x.label}</option>)}
        </select>
        <div className="tpl-preview">{preview}</div>
        <div className="tpl-vars">
          {Array.from({ length: count }, (_, i) => (
            <input key={i} aria-label={'משתנה ' + (i + 1)} placeholder={'משתנה ' + (i + 1)} value={vars[i] ?? ''}
              onChange={(e) => setVars((v) => { const n = [...v]; n[i] = e.target.value; return n; })} />
          ))}
        </div>
        <div className="tpl-actions"><button type="button" className="primary" onClick={send}>שליחת תבנית</button></div>
      </div>
    </div>
  );
}
