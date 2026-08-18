# email/

Everything UNLIMITED sends by email lives in this folder. Nothing outside it
imports `nodemailer` or knows that Brevo exists.

## The shape

```
email/
├── index.ts            the public door — the rest of the app imports only this
├── config.ts           sender identity, brand links, currency
├── client.ts           the ONE connection to Brevo
├── send.ts             the ONE way out: validation, retry, logging, staging net
├── recipients.ts       who internal mail goes to (reads lib/admins.ts)
├── fromOrder.ts        maps a saved order into template data
├── types.ts            the shapes templates speak
├── samples.ts          sample data for preview + test
├── preview.ts          renders every email to a file you can open
├── test-send.ts        sends every email, for real, to one address
├── actions/            jobs that fetch data and then send
│   └── priceAdjustmentForOrder.ts
└── templates/
    ├── layout.ts       the shared shell + escapeHtml, money, rule, paragraph
    ├── blocks.ts       reusable pieces: items, address, totals, button
    ├── orderConfirmation.ts
    ├── adminNewOrder.ts
    └── priceAdjustment.ts
```

## The three layers

| Layer | May do | May never do |
|---|---|---|
| `templates/` | turn data into HTML | touch the database, send anything |
| `actions/` | read the database, decide, then send | know about HTTP, requests or responses |
| `send.ts` / `client.ts` | talk to Brevo | know what any email says |

**A template turns data into HTML. That is all it does.** `send.ts` is the only
file that sends and `client.ts` the only file that connects — so validation,
retries and logging are written once and cannot be forgotten by the next email.

### Why API routes still live under `app/`

A URL in Next.js is defined by where its file sits: `app/api/admin/send-price-adjustment/route.ts`
*is* what makes that address exist, so it cannot move here. It is kept to a
doorbell — check the caller is an admin, validate the body, call the action, turn
the outcome into a response — and the real work sits in `actions/`, where a
second caller (an admin button, a script, a cron job) can reuse it.

## Adding a new email

1. Add its data shape to `types.ts`.
2. Add `templates/yourEmail.ts`. Build the body from `blocks.ts`, wrap it in
   `layout(...)`, and return `{ to, subject, html, text }`. **Pass every piece of
   user-supplied text through `escapeHtml`.**
3. Export a `sendYourEmail()` one-liner from `index.ts`.
4. Add it to `preview.ts` and look at it.

No other file changes.

## Seeing the emails

```bash
npm run email:preview
open .email-preview/*.html
```

Renders sample data through every template. Sends nothing, connects to nothing.
`escaping-check.html` deliberately feeds hostile input through a template — if
markup ever renders instead of showing as text, escaping has broken.

## Sending a real test

```bash
npm run email:test -- you@example.com
```

Sends every template, filled with sample data, through the real Brevo account to
the one address you name — so it proves deliverability and how it looks in a real
client, not just the markup. Subjects are prefixed `[TEST]` and sample orders are
numbered `SAMPLE-…`. It refuses to run without an explicit recipient.

## Environment

| Variable | Purpose |
|---|---|
| `BREVO_SMTP_USER` | Brevo SMTP login. **Required** — no fallback. |
| `BREVO_SMTP_PASSWORD` | Brevo SMTP key. **Required** — no fallback. |
| `ADMIN_EMAILS` | Comma-separated internal recipients (via `lib/admins.ts`). |
| `EMAIL_REDIRECT_TO` | Sends every message here instead of to real people. **Set this on staging.** |
| `EMAIL_DISABLED` | `true` suppresses all sending. |

`EMAIL_REDIRECT_TO` is what makes it safe to run a test deployment against a copy
of production data: real customer addresses are in the data, but no mail reaches
them.

## Rules that are not negotiable

- **Never hardcode a credential**, not even as a fallback. Two files used to
  carry the SMTP username in source.
- **Never put an email endpoint on the internet without an auth check.**
  `middleware.ts` matches `/admin/:path*`, which does **not** cover
  `/api/admin/...`. API routes must call `requireAdmin()` themselves.
- **Never trust the caller for the recipient.** Read the address from the order.
- **Every email needs a plain-text part**, or spam filters mark it down.
- Templates are `<table>`-based with inline styles on purpose. Outlook renders
  with Word's engine and Gmail strips `<style>` blocks; this is the only layout
  that survives every client.

## Tests

`__tests__/email-templates.test.ts` covers escaping, money formatting, address
validation (including newline header-injection), totals, and that no template
ever emits `undefined` or `NaN`.
