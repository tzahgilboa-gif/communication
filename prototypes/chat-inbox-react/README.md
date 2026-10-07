# Chat inbox prototype (React)

WhatsApp and SMS inbox prototype with a Hebrew RTL interface. Sample data only; nothing is sent.

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (formatting, SMS billing, file checks, state)
npm run build      # typecheck + one self-contained dist/index.html
```

## Connecting to the real system

- **Account settings**: the server sets `window.ACCOUNT = { intSmsFactor: N }` in a script tag before the app script (see `index.html`).
- **API**: `src/lib/api.ts` is a mock. Replace `sendMessage` and `fetchOlderMessages` with calls to your backend, and feed status updates (delivered, read, failed) from Meta's status webhooks over WebSocket/SSE.
- **Errors**: `src/lib/errors.ts` maps WhatsApp error codes to the explanation and actions the agent sees. Check new codes against Meta's error-codes page.
- **Security**: the checks in the browser (file content, escaping, length) help the agent but can be bypassed. The server must repeat them, filter every query by the account from the session, scan files and set a CSP.

The "simulate an error" menu in the top banner exists only in the prototype, to review how each error looks.
