import { useEffect, useState, type ReactNode } from 'react';

/** two-step button instead of window.confirm(): the first click asks, the second one does it */
export function ConfirmButton({ className, confirmText, onConfirm, children, label }: {
  className?: string; confirmText: string; onConfirm: () => void; children: ReactNode; label?: string;
}) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 4000);
    return () => clearTimeout(t);
  }, [asking]);
  return (
    <button type="button" className={(className ?? '') + (asking ? ' asking' : '')} aria-label={asking ? confirmText : label}
      onClick={() => (asking ? (setAsking(false), onConfirm()) : setAsking(true))}>
      {asking ? confirmText : children}
    </button>
  );
}
