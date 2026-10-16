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

## Preview locally

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

### Netlify

1. Create a site from this Git repository.
2. Leave the build command empty.
3. Set the publish directory to `.` (the repository root).

`netlify.toml` already sets that publish directory.
