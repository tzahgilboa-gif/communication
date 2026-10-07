// Entry point for embedding in an existing (jQuery) page:
//   <div id="chat-inbox" style="height: calc(100vh - 60px)"></div>
//   <script src="/js/chat-inbox.js"></script>
//   <script>$(function () { ChatInbox.mount(document.getElementById('chat-inbox'), { intSmsFactor: 3 }); });</script>
//
// The app renders inside a shadow root on that element, so its CSS and the page's CSS never mix.
// React is bundled into this file; nothing is added to window except ChatInbox.
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';
import css from './styles.css?inline';

export interface MountOptions {
  /** from the DB: how many SMS segments are billed as one message (default 1) */
  intSmsFactor?: number | string;
  /** prototype banner with the error simulator, sample incoming message */
  demo?: boolean;
  /** CSS height for the element, if the page doesn't set one */
  height?: string;
  /** load the Heebo font from Google Fonts (default true); false = use --ci-font or Arial */
  loadFont?: boolean;
}

const roots = new WeakMap<HTMLElement, Root>();

function loadHeebo() {
  // fonts are declared on the document (a shadow root can't load them); this adds @font-face only, no styles
  if (document.querySelector('link[data-chat-inbox-font]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&display=swap';
  link.setAttribute('data-chat-inbox-font', '');
  document.head.appendChild(link);
}

export function mount(el: HTMLElement, opts: MountOptions = {}) {
  if (!(el instanceof HTMLElement)) throw new Error('ChatInbox.mount: pass a DOM element, e.g. $("#chat-inbox")[0]');
  unmount(el);
  if (opts.height) el.style.height = opts.height;
  if (opts.loadFont !== false) loadHeebo();

  const shadow = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  const app = document.createElement('div');
  app.className = 'ci-app';
  app.dir = 'rtl';
  app.lang = 'he';
  shadow.replaceChildren(style, app);

  const smsFactor = Math.max(1, parseInt(String(opts.intSmsFactor ?? 1), 10) || 1);
  const root = createRoot(app);
  root.render(
    <StrictMode>
      <App smsFactor={smsFactor} demo={!!opts.demo} />
    </StrictMode>,
  );
  roots.set(el, root);
  return { unmount: () => unmount(el) };
}

export function unmount(el: HTMLElement) {
  roots.get(el)?.unmount();
  roots.delete(el);
  el.shadowRoot?.replaceChildren();
}
