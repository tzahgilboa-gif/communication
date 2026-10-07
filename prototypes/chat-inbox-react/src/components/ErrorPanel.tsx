import type { SendError } from '../types';
import { errorInfo, type ErrorAction } from '../lib/errors';
import { Icon } from './Icon';

const LABELS: Record<ErrorAction, { icon: string; text: string }> = {
  retry: { icon: 'solid/rotate-right', text: 'נסו שוב' },
  template: { icon: 'solid/file-lines', text: 'שליחת תבנית' },
  copy: { icon: 'regular/copy', text: 'העתקת הטקסט' },
};

interface Props {
  error: SendError;
  onAction: (a: ErrorAction | 'delete') => void;
}

/** explains a failed message and offers what can be done about it */
export function ErrorPanel({ error, onAction }: Props) {
  const info = errorInfo(error);
  return (
    <div className="err-panel" role="alert">
      <div className="err-title"><Icon name="solid/circle-exclamation" /> {info.title}</div>
      <div className="err-explain">{info.explain}</div>
      {info.todo && <div className="err-todo">{info.todo}</div>}
      <div className="err-actions">
        {info.actions.map((a) => (
          <button key={a} type="button" className={a === 'template' || a === 'retry' ? 'primary-sm' : ''} onClick={() => onAction(a)}>
            <Icon name={LABELS[a].icon} /> {LABELS[a].text}
          </button>
        ))}
        <button type="button" onClick={() => onAction('delete')}><Icon name="regular/trash-can" /> מחיקה</button>
        <span className="err-code" title="לפנייה לתמיכה">קוד: {error.code === 'network' ? 'רשת' : error.code}</span>
      </div>
    </div>
  );
}
