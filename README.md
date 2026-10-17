# BasketWise

A family money-saving app for the UK weekly shop. Enter a list, pick stores, compare **Asda**, **Tesco** and **Morrisons**, then get a shopping journey — one cheapest shop or a split across stores.

## Flow

1. **List** — type, **speak**, or **photo** a written list  
2. **Stores** — choose which shops to include and whether you want one stop or a split trip  
3. **Prices** — compare the basket item by item  
4. **Journey** — e.g. shop everything at the cheapest total, or a split like 60% Morrisons → 30% Asda → 10% Tesco

Prices in the sample catalogue are illustrative for planning. Always check live prices with the retailer before buying.

## What’s in the repo

Plain HTML, CSS and JavaScript. No build step.

| File | Purpose |
| --- | --- |
| `index.html` | App shell and UI |
| `styles.css` | Layout and theme |
| `data.js` | Sample product, meal and store data |
| `app.js` | Basket matching, meals and savings logic |
| `favicon.svg` | Browser tab icon |
| `netlify.toml` | Publishes the repository root |

## Preview locally (sample prices)

```bash
python3 -m http.server 8080
```

Or with the Node server (needed for live Hobnight prices):

```bash
node server.mjs
```

Open `http://localhost:8080`.

## Live prices (Hobnight)

BasketWise can pull live UK catalogue prices for Asda, Tesco and Morrisons via [Hobnight](https://hobnight.com/).

1. Request an API key from Hobnight.
2. Copy `.env.example` to `.env` and set `HOBNIGHT_API_KEY`, **or** export it in your shell.
3. Start the proxy server (do not use `python3 -m http.server` for live mode):

```bash
export HOBNIGHT_API_KEY='1|your-key-here'
node server.mjs
```

4. Open the app — the badge should say **Live prices (Hobnight)**.
5. Enter a list and tap **Compare prices**.

The key stays on the server (`/api/basket` proxy). Never put it in frontend JavaScript.

Without a key, the app keeps using the sample catalogue.

## Deploy

### Netlify

1. Create a site from this Git repository.
2. Leave the build command empty.
3. Set the publish directory to `.` (the repository root).

`netlify.toml` already sets that publish directory.
