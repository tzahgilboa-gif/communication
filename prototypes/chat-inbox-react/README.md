# Chat inbox (React)

WhatsApp and SMS inbox with a Hebrew RTL interface, built to drop into one page of an existing
jQuery system without changing anything else on that page or on other pages.

```bash
npm install
npm run dev        # demo on a local dev server
npm test           # unit tests (formatting, SMS billing, file checks, errors, state)
npm run build      # typecheck + dist/chat-inbox.js
```

## Opening it in its own window

`npm run build` also copies the script to `page/`. Put the three files of `page/` on the server:

| File | What |
|---|---|
| `inbox.html` | The page: company logo and name at the top, the inbox below |
| `chat-inbox.js` | The app |
| `logo.svg` | **Placeholder**: replace with the real logo (and the name in `inbox.html`) |

In `inbox.html` the server prints the account's `intSmsFactor` from the DB into the `mount` call.

The existing system opens it from a button (`examples/open-from-jquery.html`):

```js
$('#openInbox').on('click', function () {
  var w = window.open('/inbox/inbox.html', 'chat-inbox', 'width=1300,height=850');
  if (!w) { alert('הדפדפן חסם את החלון. אשרו חלונות קופצים לאתר הזה ונסו שוב.'); return; }
  w.focus();
});
```

The window name `chat-inbox` means a second click brings the open window to the front instead of
opening another one. `window.open` must run inside the click handler, or the browser blocks it.

## Adding it to an existing page instead

Copy `dist/chat-inbox.js` to the server and add three things to the one page that needs it:

```html
<div id="chat-inbox" style="height: calc(100vh - 56px)"></div>
<script src="/js/chat-inbox.js"></script>
<script>
  $(function () {
    ChatInbox.mount($('#chat-inbox')[0], { intSmsFactor: 3 }); // intSmsFactor from the DB
  });
</script>
```

`examples/jquery-page.html` is a working example (run `npm run build` first).

| Option | Default | Meaning |
|---|---|---|
| `intSmsFactor` | `1` | SMS segments billed as one message (from the account in the DB) |
| `height` | — | CSS height for the element, if the page doesn't size it |
| `loadFont` | `true` | Load the Heebo font from Google Fonts; `false` uses `--ci-font` or Arial |
| `demo` | `false` | Prototype banner with the error simulator and a sample incoming message |

`ChatInbox.unmount(element)` removes it again.

### What it does and doesn't touch

- Renders inside a **shadow root** on the element: its CSS doesn't reach the page, and the page's CSS
  (Bootstrap `.badge`, `.toast`, global `button` rules...) doesn't reach it.
- React is bundled inside the file. The only global it adds is `window.ChatInbox`; `$`/jQuery are untouched.
- Icons are inline SVG, so no icon font or stylesheet is loaded and the page's own icons are unaffected.
- The one thing added to `<head>` is the Heebo font link (`@font-face` only, no style rules), unless `loadFont: false`.
- The element needs a height: the inbox fills it.

## Connecting to the real system

- **API**: `src/lib/api.ts` is a mock. Replace `sendMessage` and `fetchOlderMessages` with calls to your backend, and feed status updates (delivered, read, failed) from Meta's status webhooks over WebSocket/SSE.
- **Errors**: `src/lib/errors.ts` maps WhatsApp error codes to the explanation and actions the agent sees. Check new codes against Meta's error-codes page.
- **Security**: the checks in the browser (file content, escaping, length) help the agent but can be bypassed. The server must repeat them, filter every query by the account from the session, scan files and set a CSP.
