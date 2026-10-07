import type { Channel, Message } from '../types';
import { fmtSize, hhmm } from '../lib/dates';
import { RichText } from '../lib/richText';
import type { ErrorAction } from '../lib/errors';
import { ErrorPanel } from './ErrorPanel';
import { Icon } from './Icon';

interface Props {
  msg: Message;
  channel: Channel;
  onZoom: (url: string) => void;
  onErrorAction: (a: ErrorAction | 'delete') => void;
  /** the message this one replies to; null when it isn't loaded (older history) */
  quoted?: Message | null;
  /** name shown on a quote of the customer's message */
  customerName: string;
  onQuoteClick: (id: string) => void;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  /** reply is offered only where it can be sent: WhatsApp with the 24h window open */
  canReply: boolean;
  onReply: () => void;
  onCopy: () => void;
}

/** one-line summary of a message, for quotes */
export function snippet(m: Message): string {
  if (m.text) return m.text.replace(/\s+/g, ' ').slice(0, 90);
  if (m.media) return m.media.type === 'image' ? 'תמונה' : m.media.name;
  return '';
}

function Quote({ quoted, customerName, onClick }: { quoted: Message | null; customerName: string; onClick: () => void }) {
  return (
    <button type="button" className={'quote-ref' + (quoted?.dir === 'out' ? ' mine' : '')} onClick={onClick} title="מעבר להודעה המקורית">
      <span className="quote-who">{!quoted ? 'הודעה קודמת' : quoted.dir === 'out' ? 'אתם' : customerName}</span>
      <span className="quote-text">
        {quoted?.media && <Icon name={quoted.media.type === 'image' ? 'regular/image' : 'regular/file-pdf'} />} {quoted ? snippet(quoted) : 'לחצו כדי לטעון'}
      </span>
    </button>
  );
}

function Tick({ msg }: { msg: Message }) {
  const [icon, label, cls] =
    msg.status === 'sending' ? ['regular/clock', 'בשליחה', ''] :
    msg.status === 'read' ? ['solid/check-double', 'נקרא', ' read'] :
    msg.status === 'delivered' ? ['solid/check-double', 'נמסר', ''] :
    msg.status === 'failed' ? ['solid/circle-exclamation', 'נכשל', ' failed'] :
    ['solid/check', 'נשלח', ''];
  return <span className={'tick' + cls} role="img" title={label} aria-label={label}><Icon name={icon} /></span>;
}

export function MessageBubble({ msg, channel, onZoom, onErrorAction, quoted, customerName, onQuoteClick, menuOpen, onMenu, canReply, onReply, onCopy }: Props) {
  const failed = msg.status === 'failed';
  return (
    <div className={'msg ' + msg.dir + (failed ? ' failed' : '') + (menuOpen ? ' menu-open' : '')} data-msg-id={msg.id}>
      {(canReply || msg.text) && (
        <button type="button" className="msg-menu-btn" aria-label="פעולות להודעה" aria-haspopup="menu" aria-expanded={menuOpen}
          onClick={() => onMenu(!menuOpen)}>
          <Icon name="solid/chevron-down" />
        </button>
      )}
      {menuOpen && (
        <div className="msg-menu" role="menu">
          {canReply && <button type="button" role="menuitem" onClick={() => { onMenu(false); onReply(); }}><Icon name="solid/reply" /> השב</button>}
          {msg.text && <button type="button" role="menuitem" onClick={() => { onMenu(false); onCopy(); }}><Icon name="regular/copy" /> העתקה</button>}
        </div>
      )}
      {msg.replyTo && <Quote quoted={quoted ?? null} customerName={customerName} onClick={() => onQuoteClick(msg.replyTo!)} />}
      {msg.srcLabel && <div className="src"><Icon name="solid/bullhorn" />{msg.srcLabel}</div>}
      {msg.media?.type === 'image' && (
        <button type="button" className="img-btn" onClick={() => onZoom(msg.media!.url)} aria-label={'הגדלת התמונה ' + msg.media.name}>
          <img className="media-img" src={msg.media.url} alt={msg.media.name} />
        </button>
      )}
      {msg.media?.type === 'pdf' && (
        <a className="media-file" href={msg.media.url} target="_blank" rel="noopener noreferrer">
          <Icon name="regular/file-pdf" />
          <div>
            <div className="fn">{msg.media.name}</div>
            <div className="fs">PDF{msg.media.size ? ' · ' + fmtSize(msg.media.size) : ''}</div>
          </div>
        </a>
      )}
      {msg.text && <RichText text={msg.text} plain={channel === 'sms'} />}
      <div className="foot">{hhmm(msg.time)} {msg.dir === 'out' && <Tick msg={msg} />}</div>
      {failed && msg.error && <ErrorPanel error={msg.error} onAction={onErrorAction} />}
    </div>
  );
}
