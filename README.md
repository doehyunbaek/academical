# Academical Calendar

A first Google-Calendar-inspired calendar prototype for academic planning.

## Run locally

```bash
python3 -m http.server 5173
```

Open <http://localhost:5173>.

## Current prototype

- Month view seeded to July 2026 to match the provided reference capture
- Google Calendar-style top bar, sidebar, mini calendar, month grid, and right rail
- Create/edit/delete events
- Search events
- Toggle calendar categories
- Events persist in `localStorage`

No build step is required; this is a static HTML/CSS/JS app.
