# BasketWise

A family money-saving app for the UK weekly shop. Compare the same basket across **Asda**, **Tesco** and **Morrisons**, find cheaper dinners that respect dietary preferences, and see real totals with pack sizes, loyalty prices and delivery.

## Features

1. **Compare the whole shopping basket** — enter a list and see estimated store totals plus each product’s price, pack size and last-updated date.
2. **Find cheaper meals** — alternative dinners using lower-cost ingredients, filtered by diet and family dislikes.
3. **Show real savings** — same list with pack-size normalisation, loyalty-card prices where available, and delivery charges.

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
