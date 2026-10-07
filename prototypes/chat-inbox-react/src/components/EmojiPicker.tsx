import { useRef, useState } from 'react';
import { EMOJI_CATS, type EmojiCategory } from '../lib/emoji';

interface Props {
  recent: string[];
  onPick: (emoji: string) => void;
}

/** categories with tabs; scrolling highlights the current one, like a phone keyboard */
export function EmojiPicker({ recent, onPick }: Props) {
  const cats: EmojiCategory[] = [
    ...(recent.length ? [{ id: 'recent', icon: '🕘', label: 'בשימוש לאחרונה', items: recent }] : []),
    ...EMOJI_CATS,
  ];
  const [active, setActive] = useState(cats[0].id);
  const body = useRef<HTMLDivElement>(null);
  const secs = useRef<Record<string, HTMLDivElement | null>>({});

  const jump = (id: string) => {
    const sec = secs.current[id];
    if (sec && body.current) body.current.scrollTop = sec.offsetTop - body.current.offsetTop;
    setActive(id);
  };

  const onScroll = () => {
    const b = body.current;
    if (!b) return;
    let cur = cats[0].id;
    for (const c of cats) {
      const sec = secs.current[c.id];
      if (sec && sec.offsetTop - b.offsetTop <= b.scrollTop + 4) cur = c.id;
    }
    setActive(cur);
  };

  return (
    // mousedown would move focus out of the textarea and lose the cursor position
    <div className="emoji-pop show" onMouseDown={(e) => e.preventDefault()}>
      <div className="emoji-tabs" role="tablist">
        {cats.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={active === c.id} className={active === c.id ? 'active' : ''}
            title={c.label} aria-label={c.label} onClick={() => jump(c.id)}>
            {c.icon}
          </button>
        ))}
      </div>
      <div className="emoji-body" ref={body} onScroll={onScroll}>
        {cats.map((c) => (
          <div key={c.id} className="emoji-sec" ref={(el) => { secs.current[c.id] = el; }}>
            <h5>{c.label}</h5>
            <div className="emoji-grid">
              {c.items.map((e) => (
                <button key={e} type="button" aria-label={e} onClick={() => onPick(e)}>{e}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
