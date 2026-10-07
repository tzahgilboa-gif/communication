import { useEffect, useState } from 'react';
import type { Conversation } from '../types';
import { MAX_PINS, useApp, type ChannelFilter, type StatusFilter } from '../store';
import { fmtLeft, listTime } from '../lib/dates';
import { lastActivity, lastMsg, windowLeftMin } from '../lib/whatsapp';
import { openTasksOf, taskState } from '../lib/tasks';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

const STATUS: [StatusFilter, string][] = [['all', 'הכל'], ['unread', 'לא נקראו'], ['open', 'פתוחות'], ['closed', 'סגורות']];

export function ConversationList() {
  const { state, dispatch } = useApp();
  const [pinMenu, setPinMenu] = useState<number | null>(null);

  useEffect(() => {
    if (pinMenu === null) return;
    // composedPath(): inside a shadow root, e.target seen from document is the host element
    const close = (e: MouseEvent) => {
      const inside = e.composedPath().some((n) => n instanceof Element && n.matches('.pin-menu, .pin-num'));
      if (!inside) setPinMenu(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [pinMenu]);

  const q = state.search.trim();
  const list = state.convs.filter((c) => {
    if (state.statusFilter === 'unread' && !c.unread) return false;
    if (state.statusFilter === 'open' && c.status !== 'open') return false;
    if (state.statusFilter === 'closed' && c.status !== 'closed') return false;
    if (state.channelFilter !== 'all' && c.channel !== state.channelFilter) return false;
    if (q) {
      const hay = (c.name + ' ' + c.phone.replace(/-/g, '') + ' ' + c.messages.map((m) => m.text).join(' ')).toLowerCase();
      const needle = q.toLowerCase();
      if (!hay.includes(needle.replace(/-/g, '')) && !hay.includes(needle)) return false;
    }
    return true;
  });
  const pinned = list.filter((c) => c.pin).sort((a, b) => a.pin - b.pin);
  const rest = list.filter((c) => !c.pin).sort((a, b) => lastActivity(b) - lastActivity(a));

  return (
    <aside className="list">
      <div className="list-head">
        <label className="search">
          <Icon name="solid/magnifying-glass" />
          <input type="search" placeholder="חיפוש לפי שם, מספר או תוכן" aria-label="חיפוש שיחות" value={state.search}
            onChange={(e) => dispatch({ type: 'filter', search: e.target.value })} />
        </label>
        <div className="filters">
          {STATUS.map(([k, l]) => (
            <button key={k} type="button" className={'chip' + (state.statusFilter === k ? ' active' : '')} onClick={() => dispatch({ type: 'filter', status: k })}>{l}</button>
          ))}
        </div>
        <div className="filters" style={{ marginTop: 6 }}>
          {([['all', 'כל הערוצים', ''], ['wa', 'WhatsApp', 'brands/whatsapp'], ['sms', 'SMS', 'solid/comment-sms']] as [ChannelFilter, string, string][]).map(([k, l, icon]) => (
            <button key={k} type="button" className={'chip' + (state.channelFilter === k ? ' active' : '')} onClick={() => dispatch({ type: 'filter', channel: k })}>
              {icon && <Icon name={icon} />} {l}
            </button>
          ))}
        </div>
      </div>
      <div className="conv-list">
        {pinned.length > 0 && <div className="sec-label"><Icon name="solid/thumbtack" /> מוצמדות ({pinned.length}/{MAX_PINS})</div>}
        {pinned.map((c) => <ConvItem key={c.id} c={c} pinMenu={pinMenu} setPinMenu={setPinMenu} />)}
        {pinned.length > 0 && rest.length > 0 && <div className="sec-label">כל השיחות</div>}
        {rest.map((c) => <ConvItem key={c.id} c={c} pinMenu={pinMenu} setPinMenu={setPinMenu} />)}
        {!list.length && <div className="empty-list">לא נמצאו שיחות</div>}
      </div>
    </aside>
  );
}

function ConvItem({ c, pinMenu, setPinMenu }: { c: Conversation; pinMenu: number | null; setPinMenu: (id: number | null) => void }) {
  const { state, dispatch, toast, now } = useApp();
  const lm = lastMsg(c);
  const left = windowLeftMin(c, now);
  const ot = openTasksOf(state.tasks, c.id);
  const late = ot.some((t) => taskState(t, now) === 'late');
  const open = () => dispatch({ type: 'open', id: c.id });

  const pin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state.convs.filter((x) => x.pin).length >= MAX_PINS) return toast('אפשר להצמיד עד ' + MAX_PINS + ' שיחות. בטלו הצמדה קודם.');
    dispatch({ type: 'pin', convId: c.id });
    toast('השיחה הוצמדה למעלה');
  };

  return (
    <div className={'conv' + (c.unread ? ' unread' : '') + (c.pin ? ' pinned' : '') + (state.selected === c.id ? ' selected' : '')}
      role="button" tabIndex={0} aria-label={'שיחה עם ' + c.name + (c.unread ? ', ' + c.unread + ' הודעות שלא נקראו' : '')}
      onClick={open} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}>
      <Avatar name={c.name} channel={c.channel} />
      <div className="conv-main">
        <div className="conv-row"><span className="conv-name">{c.name}</span><span className="conv-time">{lm ? listTime(lm.time, now) : ''}</span></div>
        <div className="conv-row">
          <span className="conv-preview">
            {!lm ? <span className="muted-sm">אין הודעות</span> : (
              <>
                {lm.status === 'failed' && <Icon name="solid/circle-exclamation" className="failed-ico" />}
                {lm.dir === 'out' && lm.status !== 'failed' && <Icon name="solid/reply" style={{ fontSize: 10 }} />}{' '}
                {lm.media && <Icon name={lm.media.type === 'image' ? 'regular/image' : 'regular/file-pdf'} />}{' '}
                {lm.status === 'failed' ? 'לא נשלחה: ' : ''}{lm.text || lm.media?.name}
              </>
            )}
          </span>
          {c.unread > 0 && <span className="badge">{c.unread}</span>}
        </div>
        <div className="conv-meta">
          {c.status === 'closed' && <span className="tag closed">סגורה</span>}
          {c.optedOut && <span className="tag optout"><Icon name="solid/ban" /> הוסר מדיוור</span>}
          {left !== null && left > 0 && <span className="tag window"><Icon name="regular/clock" /> חלון פתוח {fmtLeft(left)}</span>}
          {ot.length > 0 && <span className={'tag tasks' + (late ? ' late' : '')}><Icon name="solid/list-check" /> {ot.length}{late ? ' · באיחור' : ''}</span>}
        </div>
      </div>
      {c.pin ? (
        <button type="button" className="pin-num" title="שינוי מיקום ההצמדה" aria-label="שינוי מיקום ההצמדה"
          onClick={(e) => { e.stopPropagation(); setPinMenu(pinMenu === c.id ? null : c.id); }}>
          <Icon name="solid/thumbtack" />{c.pin}
        </button>
      ) : (
        <button type="button" className="pin-btn" title="הצמדה למעלה" aria-label="הצמדה למעלה" onClick={pin}><Icon name="solid/thumbtack" /></button>
      )}
      {pinMenu === c.id && (
        <div className="pin-menu" onClick={(e) => e.stopPropagation()}>
          {Array.from({ length: MAX_PINS }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className={c.pin === n ? 'cur' : ''} onClick={() => { dispatch({ type: 'movePin', convId: c.id, to: n }); setPinMenu(null); }}>
              מיקום {n}{c.pin === n ? ' (נוכחי)' : ''}
            </button>
          ))}
          <button type="button" className="unpin" onClick={() => { dispatch({ type: 'unpin', convId: c.id }); setPinMenu(null); toast('ההצמדה בוטלה'); }}>
            <Icon name="solid/xmark" /> ביטול הצמדה
          </button>
        </div>
      )}
    </div>
  );
}
