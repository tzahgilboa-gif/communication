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

export function MessageBubble({ msg, channel, onZoom, onErrorAction }: Props) {
  const failed = msg.status === 'failed';
  return (
    <div className={'msg ' + msg.dir + (failed ? ' failed' : '')}>
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
