# Decisions and open items

Context for whoever continues this work (person or Claude). The code says what it does; this says why.

## Product decisions

- **Embedding**: the existing system is mostly jQuery and other pages must not change. The inbox opens in
  its own window (`page/inbox.html`, opened with `window.open` from a button) with only the company logo
  and name (Global Sms) on top. It can also be embedded in an existing page (`ChatInbox.mount`); either
  way it renders in a shadow root so CSS never mixes.
- **Billing**: the business charges 2 agorot per message and treats no message as free. Meta's free tier
  (1,000 service messages a month since 1 Oct 2026) is deliberately **not** shown anywhere.
- **SMS**: `intSmsFactor` comes from the account in the DB and means *how many segments are billed as one
  message* (factor 3: 201 Hebrew characters = 3 segments = 1 billed message). Passed to `mount`.
- **WhatsApp 24h window stays**. The user first wanted it removed; it was kept because outside the window
  Meta refuses free-form messages (error 131047) whatever the price. Outside it only templates can be sent.
- **Opt-out**: a contact who opted out still gets service messages (replies, utility templates);
  marketing templates are blocked in the UI. The campaign system must filter opted-out contacts on the
  server, and 131050 (blocked marketing inside WhatsApp) should be added to the same opt-out list.
- **Not built, on purpose**:
  - Deleting a sent message for the recipient: the official WhatsApp Cloud API has no such call (unofficial
    providers that offer it risk the number being banned). SMS can't be recalled either.
  - Create-task-from-a-message button: removed at the user's request (only copied text, not linked).
  - Fetching old messages from Meta on demand: the Cloud API has no such call. "Load older messages"
    reads our own DB; Coexistence numbers get a one-time history import at onboarding only.

## Open items

- **Logo**: `page/inbox.html` loads `https://itnewsletter.itnewsletter.co.il/app/assets/img/logoGlobal.png`
  with `logo.svg` (purple G) as fallback. Nobody has seen the real logo next to the name yet; if the image
  already contains the name, drop the text.
- **Backend** (`src/lib/api.ts` is a mock): send endpoint, older-messages endpoint, and status updates from
  Meta webhooks over WebSocket/SSE. Count/bill on delivery from status webhooks.
- **Error codes** in `src/lib/errors.ts` were compiled without access to Meta's error-codes page from the
  build environment: check them there.
- **Not tested** in Safari, Firefox or on a real phone.
- **Offered, not decided**: forwarding a message to another conversation as a draft; a short "undo send"
  delay to prevent mistakes.

## Server-side security (the browser checks can be bypassed)

Filter every query by the account from the session, re-validate and scan uploaded files, re-encode images,
escape output, set a CSP.
