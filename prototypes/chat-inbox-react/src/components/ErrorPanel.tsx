import type { SendError } from '../types';
import { errorInfo, type ErrorAction } from '../lib/errors';

const LABELS: Record<ErrorAction, { icon: string; text: string }> = {
  retry: { icon: 'fa-solid fa-rotate-right', text: 'נסו שוב' },
  template: { icon: 'fa-solid fa-file-lines', text: 'שליחת תבנית' },
  copy: { icon: 'fa-regular fa-copy', text: 'העתקת הטקסט' },
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
      <div className="err-title"><i className="fa-solid fa-circle-exclamation" /> {info.title}</div>
      <div className="err-explain">{info.explain}</div>
      {info.todo && <div className="err-todo">{info.todo}</div>}
      <div className="err-actions">
        {info.actions.map((a) => (
          <button key={a} type="button" className={a === 'template' || a === 'retry' ? 'primary-sm' : ''} onClick={() => onAction(a)}>
            <i className={LABELS[a].icon} /> {LABELS[a].text}
          </button>
        ))}
        <button type="button" onClick={() => onAction('delete')}><i className="fa-regular fa-trash-can" /> מחיקה</button>
        <span className="err-code" title="לפנייה לתמיכה">קוד: {error.code === 'network' ? 'רשת' : error.code}</span>
      </div>
    </div>
  );
}
