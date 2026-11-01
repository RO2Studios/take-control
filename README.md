# Take Control of your finances

A free budgeting app that lives on your phone. Budget first, then manage every day.

Open the app: https://ro2studios.github.io/take-control/

On iPhone: Share, then Add to Home Screen. On Android: menu, then Install app.

Your numbers stay on your phone. Nothing is sent to a server.

## Daily money experience

Today shows the remaining daily budget, projected cash coverage, and the next
scheduled outgoing payment. Use **Log a purchase** for spending or income, or
**Thinking about a purchase?** for a what-if estimate that does not save a transaction.
The checker evaluates the lowest balance across the next 30 days, the account
cushion, and category commitments (including planned purchases).

Goals, forecasts, bank reconciliation, reviews, lessons, and backup controls
remain available. Existing `moneyAhead.v2` browser data is preserved. Bank-match
recency is shown only after a balance has actually been confirmed in this version.

## Checks

With Node.js 22 or later, run:

```sh
node --test tests/*.test.cjs
```

For a local preview, serve this directory with a static HTTP server. No build
step or dependencies are required. The service worker caches `ui.css` with the
app shell for offline use. Bump its cache version when changing cached assets.
