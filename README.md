# Desk Bots

Marketing site for [Desk Bots by Liftably](https://deskbots-ai.netlify.app/): ready-made Grok Bot templates that recover missed calls, stop no-shows and draft Google review replies. Built for UK trades, salons, clinics and other local businesses.

The desks are Missed Call Desk, Confirm Desk, Review Desk, Quote Chase Desk, Social Post Desk and Payment Chase Desk. They draft the messages. The owner approves them. Nothing goes out without that OK. Each desk is a one-time Gumroad purchase.

## What’s in the repo

One self-contained page. No build step.

| File | Purpose |
| --- | --- |
| `index.html` | Sales page: markup, styles and scripts |
| `og.png` | Social share image |
| `netlify.toml` | Publishes the repository root (`publish = "."`) |

Prices and purchase links live in `index.html`. Review Desk shows a launch price of £9.95 until 31 October 2026 23:59:59 UTC, then the page shows £19.95.

## Preview locally

From this directory:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

### Netlify

1. Create a site from this Git repository.
2. Leave the build command empty.
3. Set the publish directory to `.` (the repository root).

`netlify.toml` already sets that publish directory. The canonical and Open Graph URLs point at `https://deskbots-ai.netlify.app/`.

### GitHub Pages

1. Open Settings, then Pages.
2. Deploy from the branch you want, folder `/ (root)`.

If the site is served from a domain other than `https://deskbots-ai.netlify.app/`, update the canonical URL, `og:url`, `og:image` and `twitter:image` in `index.html` to that domain.
