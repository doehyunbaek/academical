# Academical Calendar

A first Google-Calendar-inspired calendar prototype for academic planning.

## Run locally

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Current prototype

- Defaults to the actual current date/time, with sample events seeded in July 2026 to match the provided reference capture
- Deadline, Week, Month, 4-week, and Heatmap views; Deadline view internalizes the `/deadlines` venue list with persisted tag filters
- Week view uses a Google Calendar-style per-hour timeline grid; drag across hour boxes to create an event for that selected range
- Weeks start on Monday
- Keyboard shortcuts: `j` future, `k` past, `t` current time, `p` open Add paper modal, `a` all calendars, `q`/`w`/`e`/`r` solo calendars 1–4, `Ctrl+1`–`Ctrl+3` sidebar panels, `1` deadlines, `2` week, `3` month, `4` four weeks, `5` heatmap, `Backspace` delete focused edit event
- Google Calendar-style top bar, configurable left/bottom/right multipanel sidebar, month grid, GitHub-style worked-hours heatmap spanning the first-to-last visible selected-calendar event with compact near-cursor clicked-day details, and an expanded bottom sidebar in heatmap mode
- Create/edit/delete events; Create event defaults to the earliest currently visible calendar; Time analysis sidebar panel summarizes all visible events in the current view and includes a color-banded working-hours-per-week scatter chart plus a weekly cumulative read/code/write/meet activity chart
- Repeating events: daily, weekly, and every weekday
- Deleting a recurring event occurrence removes only that instance; `Delete recurring` removes the full series
- Search events
- Paper task queue: paste paper titles, arXiv URLs, or Semantic Scholar URLs; store source IDs/links browser-side; track done status; assign papers to events whose first four characters are `read`; assigned papers update the event title, leave the task queue, and return if the assigned event is deleted
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
