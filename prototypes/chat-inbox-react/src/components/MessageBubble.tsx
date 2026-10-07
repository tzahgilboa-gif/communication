import type { Channel, Message } from '../types';
import { fmtSize, hhmm } from '../lib/dates';
import { RichText } from '../lib/richText';
import type { ErrorAction } from '../lib/errors';
import { ErrorPanel } from './ErrorPanel';

interface Props {
  msg: Message;
  channel: Channel;
  onToTask: () => void;
  onZoom: (url: string) => void;
  onErrorAction: (a: ErrorAction | 'delete') => void;
}

function Tick({ msg }: { msg: Message }) {
  switch (msg.status) {
    case 'sending': return <i className="fa-regular fa-clock tick" title="בשליחה..." aria-label="בשליחה" />;
    case 'read': return <i className="fa-solid fa-check-double tick read" title="נקרא" aria-label="נקרא" />;
    case 'delivered': return <i className="fa-solid fa-check-double tick" title="נמסר" aria-label="נמסר" />;
    case 'failed': return <i className="fa-solid fa-circle-exclamation tick failed" title="נכשל" aria-label="נכשל" />;
    default: return <i className="fa-solid fa-check tick" title="נשלח" aria-label="נשלח" />;
  }
}

export function MessageBubble({ msg, channel, onToTask, onZoom, onErrorAction }: Props) {
  const failed = msg.status === 'failed';
  return (
    <div className={'msg ' + msg.dir + (failed ? ' failed' : '')}>
      <button type="button" className="to-task" onClick={onToTask} title="יצירת משימה מההודעה" aria-label="יצירת משימה מההודעה">
        <i className="fa-solid fa-list-check" />
      </button>
      {msg.srcLabel && <div className="src"><i className="fa-solid fa-bullhorn" />{msg.srcLabel}</div>}
      {msg.media?.type === 'image' && (
        <button type="button" className="img-btn" onClick={() => onZoom(msg.media!.url)} aria-label={'הגדלת התמונה ' + msg.media.name}>
          <img className="media-img" src={msg.media.url} alt={msg.media.name} />
        </button>
      )}
      {msg.media?.type === 'pdf' && (
        <a className="media-file" href={msg.media.url} target="_blank" rel="noopener noreferrer">
          <i className="fa-regular fa-file-pdf" />
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
