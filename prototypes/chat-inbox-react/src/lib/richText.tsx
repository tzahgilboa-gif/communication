// WhatsApp formatting: *bold* _italic_ ~strike~ ```mono``` `code`, "- " lists, "> " quotes, links.
// Builds React elements, never HTML strings, so user text can't become markup.
import type { ReactNode } from 'react';

const B = '[\\s(.,!?:;"\']'; // what may come before a marker
const A = '(?=$|[\\s).,!?:;"\'])'; // what may come after it

const wrapRe = (mark: string) =>
  new RegExp('(^|' + B + ')' + mark + '([^\\s' + mark + '](?:[^' + mark + '\\n]*[^\\s' + mark + '])?)' + mark + A);

type Rule = { re: RegExp; render: (m: RegExpExecArray, key: string) => { pre: string; node: ReactNode } };

const RULES: Rule[] = [
  { re: /()`([^`\n]+)`/, render: (m, k) => ({ pre: '', node: <code key={k}>{m[2]}</code> }) },
  {
    re: /()(\bhttps?:\/\/[^\s<]+|\bwww\.[^\s<]+)/i,
    render: (m, k) => {
      let u = m[2];
      let trail = '';
      while (/[.,!?)\]]$/.test(u)) { trail = u.slice(-1) + trail; u = u.slice(0, -1); }
      const href = /^www\./i.test(u) ? 'https://' + u : u;
      return {
        pre: '',
        node: (
          <span key={k}>
            <a href={href} target="_blank" rel="noopener noreferrer" dir="ltr">{u}</a>{trail}
          </span>
        ),
      };
    },
  },
  { re: wrapRe('\\*'), render: (m, k) => ({ pre: m[1], node: <b key={k}>{inline(m[2], k)}</b> }) },
  { re: wrapRe('_'), render: (m, k) => ({ pre: m[1], node: <i key={k}>{inline(m[2], k)}</i> }) },
  { re: wrapRe('~'), render: (m, k) => ({ pre: m[1], node: <s key={k}>{inline(m[2], k)}</s> }) },
];

const LINK_ONLY = [RULES[1]];

function inline(text: string, keyBase: string, rules: Rule[] = RULES): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest) {
    let best: { m: RegExpExecArray; rule: Rule } | null = null;
    for (const rule of rules) {
      const m = rule.re.exec(rest);
      // compare where the formatted part starts, after any boundary character
      if (m && (!best || m.index + m[1].length < best.m.index + best.m[1].length)) best = { m, rule };
    }
    if (!best) { out.push(rest); break; }
    const { pre, node } = best.rule.render(best.m, keyBase + '.' + n++);
    out.push(rest.slice(0, best.m.index) + pre, node);
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

function lines(text: string, keyBase: string): ReactNode[] {
  return text.split('\n').flatMap((line, i, all) => {
    const k = keyBase + 'l' + i;
    let node: ReactNode;
    if (line.startsWith('> ')) node = <span key={k} className="quote">{inline(line.slice(2), k)}</span>;
    else if (/^[-*] /.test(line)) node = <span key={k}>{'• '}{inline(line.slice(2), k)}</span>;
    else node = <span key={k}>{inline(line, k)}</span>;
    // a quote is a block; other lines need the newline back (the bubble uses pre-wrap)
    return i < all.length - 1 && !line.startsWith('> ') ? [node, '\n'] : [node];
  });
}

export function RichText({ text, plain }: { text: string; plain?: boolean }) {
  // SMS has no formatting: show it exactly as the customer receives it (links only)
  if (plain) return <>{inline(text, 'p', LINK_ONLY)}</>;
  const parts = text.split(/```([\s\S]+?)```/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <code key={i} className="mono">{p}</code> : lines(p, 'b' + i)))}
    </>
  );
}
