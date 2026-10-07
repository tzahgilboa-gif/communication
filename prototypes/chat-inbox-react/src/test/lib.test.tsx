import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichText } from '../lib/richText';
import { smsParts, smsSegments } from '../lib/sms';
import { cleanName, sniff } from '../lib/files';
import { errorInfo } from '../lib/errors';
import { reducer, type State } from '../store';
import { initialConversations, initialTasks } from '../data/sample';

const html = (text: string, plain = false) => renderToStaticMarkup(<RichText text={text} plain={plain} />);

describe('RichText', () => {
  it('formats WhatsApp markers', () => {
    const h = html('*מודגש* _נטוי_ ~מחוק~ `קוד`');
    expect(h).toContain('<b>מודגש</b>');
    expect(h).toContain('<i>נטוי</i>');
    expect(h).toContain('<s>מחוק</s>');
    expect(h).toContain('<code>קוד</code>');
  });
  it('leaves underscores inside links alone', () => {
    expect(html('https://ex.co.il/a_b_c')).toContain('href="https://ex.co.il/a_b_c"');
    expect(html('https://ex.co.il/a_b_c')).not.toContain('<i>');
  });
  it('does not treat math as bold', () => {
    expect(html('2*3*4')).not.toContain('<b>');
  });
  it('never turns user text into markup', () => {
    for (const x of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '*<b onmouseover=x>*', '```<svg onload=x>```']) {
      const h = html(x);
      expect(h).not.toMatch(/<(img|script|svg)\b/);
      expect(h).not.toMatch(/<[^>]*\son\w+=/); // an event attribute inside a real tag
    }
  });
  it('only links http(s) and www', () => {
    expect(html('javascript:alert(1)')).not.toContain('<a');
    expect(html('[x](javascript:alert(1))')).not.toContain('href="javascript');
  });
  it('keeps attribute injection inside the href value', () => {
    const h = html('https://ex.com/"onmouseover="x');
    expect(h).not.toMatch(/<a [^>]*" *onmouseover=/);
  });
  it('lists and quotes', () => {
    const h = html('- פריט\n> ציטוט');
    expect(h).toContain('• ');
    expect(h).toContain('class="quote"');
  });
  it('SMS shows the markers as typed', () => {
    expect(html('*לא מודגש*', true)).not.toContain('<b>');
  });
});

describe('SMS', () => {
  it('Hebrew uses 70/67', () => {
    expect(smsSegments('א'.repeat(70)).segments).toBe(1);
    expect(smsSegments('א'.repeat(71)).segments).toBe(2);
    expect(smsSegments('א'.repeat(201)).segments).toBe(3);
  });
  it('GSM-7 uses 160/153, extension characters count twice', () => {
    expect(smsSegments('a'.repeat(160)).segments).toBe(1);
    expect(smsSegments('a'.repeat(161)).segments).toBe(2);
    expect(smsSegments('€'.repeat(80)).chars).toBe(160);
  });
  it('bills by intSmsFactor', () => {
    expect(smsParts('א'.repeat(201), 3)).toContain('הודעה אחת לחיוב');
    expect(smsParts('א'.repeat(202), 3)).toContain('2 הודעות לחיוב');
    expect(smsParts('א'.repeat(201), 1)).toContain('3 הודעות לחיוב');
  });
});

describe('files', () => {
  it('recognises real content', () => {
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(sniff(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('pdf');
    expect(sniff(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull(); // EXE
  });
  it('strips bidi overrides from names', () => {
    expect(cleanName('invoice‮fdp.exe')).toBe('invoicefdp.exe');
  });
});

describe('errors', () => {
  it('131047 offers a template', () => {
    expect(errorInfo({ code: 131047 }).actions).toContain('template');
  });
  it('payment problems are account-wide', () => {
    expect(errorInfo({ code: 131042 }).scope).toBe('account');
  });
  it('unknown codes still explain and allow retry', () => {
    const i = errorInfo({ code: 999999 });
    expect(i.title).toBeTruthy();
    expect(i.actions).toContain('retry');
  });
});

describe('reducer', () => {
  const s0: State = {
    convs: initialConversations, tasks: initialTasks, view: 'inbox', selected: null, mobileThread: false, detailsOpen: true,
    statusFilter: 'all', channelFilter: 'all', search: '', taskFilter: 'open', taskSearch: '', taskPrio: 'all',
  };
  it('loaded history goes to its own conversation only', () => {
    const c1 = s0.convs.find((c) => c.id === 1)!;
    const s = reducer(s0, { type: 'prependOlder', convId: 1, page: c1.older.slice(-2), rest: c1.older.slice(0, -2) });
    expect(s.convs.find((c) => c.id === 1)!.messages.length).toBe(c1.messages.length + 2);
    expect(s.convs.find((c) => c.id === 2)!.messages).toBe(s0.convs.find((c) => c.id === 2)!.messages);
  });
  it('pins at most 3', () => {
    let s = reducer(s0, { type: 'pin', convId: 3 });
    s = reducer(s, { type: 'pin', convId: 4 });
    expect(s.convs.filter((c) => c.pin).length).toBe(3);
  });
  it('updates a task title, due date and priority', () => {
    const due = new Date('2026-12-01T09:00');
    const s = reducer(s0, { type: 'updateTask', id: 2, patch: { title: 'כותרת חדשה', due, prio: 'high' } });
    const t = s.tasks.find((x) => x.id === 2)!;
    expect([t.title, t.due, t.prio, t.convId, t.done]).toEqual(['כותרת חדשה', due, 'high', 2, false]);
    expect(s.tasks.find((x) => x.id === 1)).toBe(s0.tasks.find((x) => x.id === 1));
  });
  it('unpin closes the gap', () => {
    const s = reducer(s0, { type: 'unpin', convId: 1 });
    expect(s.convs.find((c) => c.id === 5)!.pin).toBe(1);
  });
});
