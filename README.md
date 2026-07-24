# Academical Calendar

A first Google-Calendar-inspired calendar prototype for academic planning.

## Run locally

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Current prototype

- Defaults to the actual current date/time, with sample events seeded in July 2026 to match the provided reference capture
- Week, Month, 4-week, and GitHub-style Heatmap views; the Deadlines sidebar panel internalizes the `/deadlines` venue list with persisted tag filters
- Week view uses a Google Calendar-style per-hour timeline grid; drag across hour boxes to create an event for that selected range
- Weeks start on Monday
- Keyboard shortcuts: `/` focus event search, `j` future, `k` past, `t` current time, `p` open Add paper modal, `o` open DBLP publication search (Enter sends the request), `a` all calendars, `q`/`w`/`e`/`r` solo calendars 1–4, `Ctrl+1`–`Ctrl+4` sidebar panels, `1` GitHub heatmap, `2` week, `3` month, `4` four weeks, `Backspace` delete focused edit event
- Google Calendar-style top bar, configurable left/bottom/right multipanel sidebar, month grid, GitHub-style worked-hours heatmap spanning the first-to-last visible selected-calendar event or a rolling current-date-minus-one-year range with compact near-cursor clicked-day details, and an expanded bottom sidebar in heatmap mode
- Create/edit/delete events; drag all-day or timed event chips between dates in Month and 4-week views; Create event defaults to the earliest currently visible calendar; Time analysis sidebar panel summarizes all visible events in the current view and includes a color-banded working-hours-per-week scatter chart plus a weekly cumulative read/code/write/meet activity chart
- Repeating events: daily, weekly, and every weekday
- Deleting a recurring event occurrence removes only that instance; `Delete recurring` removes the full series
- Search events and query DBLP publications from the `o` shortcut; DBLP requests are only sent after pressing Enter
- Paper task queue: paste paper titles, arXiv URLs, ACM Digital Library URLs, or Semantic Scholar URLs; arXiv and ACM entries load title, authors, abstract, and dates through a Cloudflare Worker metadata proxy (with static-link fallback); track queued and read papers separately; assign papers to events whose first four characters are `read`; assigned or exact-title-matched papers move to Read papers and return to the queue if the assigned event is deleted
- Toggle calendar categories, drag-and-drop reorder calendars, edit calendar name/color with an Edit calendar modal, use the 16 CSS basic colors plus `transparent` and `rebeccapurple`, open a Create calendar modal from the always-visible `+` button, create blank calendars or import `.ics` files, archive each calendar with its hover-only row-level `×` action, expand/collapse Archived calendars, select archived calendars for viewing/analysis, restore archived calendars, or permanently delete them
- Events persist in `localStorage`
- Optional Firebase Google sign-in sync for events, imported calendars, calendar names/colors/order, paper tasks, and calendar visibility

No build step is required; this is a static HTML/CSS/JS app.

## Tests

```bash
npm install
npm test
```

The Playwright suite lives in `tests/academical.spec.js` and starts a local static server automatically.

## Firebase sync

This project mirrors Pinder's Firebase setup using `google-api-config.js` plus Firebase compat CDN scripts. Sign in with Google from the top bar to sync:

- events
- recurring-event exceptions
- paper tasks
- calendar visibility toggles and archived calendars

Firestore path:

```text
users/{uid}/academical/state
```

## Metadata and deadline proxy

`worker/index.js` provides a Cloudflare Worker that validates and proxies arXiv metadata, resolves ACM Digital Library DOIs through Crossref, and checks Researchr for newly published conference deadlines. It caches successful responses and enables CORS for the static GitHub Pages client.

Authenticate and deploy it on the Cloudflare Workers free plan:

```bash
npx wrangler login
npx wrangler deploy
```

Wrangler prints a URL similar to:

```text
https://academical-arxiv.YOUR-SUBDOMAIN.workers.dev
```

Copy that URL into `paperMetadataUrl` and `deadlineUpdatesUrl` (or the backwards-compatible `arxivMetadataUrl`) in `google-api-config.js`. Test the deployed proxy with:

```bash
curl 'https://academical-arxiv.YOUR-SUBDOMAIN.workers.dev/?id=2505.17716'
curl 'https://academical-arxiv.YOUR-SUBDOMAIN.workers.dev/?doi=10.1145%2F3728973'
curl 'https://academical-arxiv.YOUR-SUBDOMAIN.workers.dev/?conference=OOPSLA&year=2027'
```
