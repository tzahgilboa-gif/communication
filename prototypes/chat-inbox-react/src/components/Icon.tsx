import { ICONS } from '../lib/icons';

/** an icon from src/lib/icons.ts, e.g. <Icon name="solid/check" />; sized by the surrounding font-size */
export function Icon({ name, spin, className, style }: { name: string; spin?: boolean; className?: string; style?: React.CSSProperties }) {
  const i = ICONS[name];
  if (!i) return null;
  return (
    <svg className={'ico' + (spin ? ' spin' : '') + (className ? ' ' + className : '')} style={style}
      viewBox={`0 0 ${i.w} ${i.h}`} width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={i.d} />
    </svg>
  );
}
