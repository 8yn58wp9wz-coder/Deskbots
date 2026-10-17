#!/usr/bin/env node
/**
 * BasketWise local server + Hobnight proxy.
 *
 * Usage:
 *   HOBNIGHT_API_KEY=1|your-key node server.mjs
 *
 * Without a key, static sample mode still works at http://localhost:8080
 * Live compare: POST /api/basket  { "items": ["dog food", "milk"] }
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const HOBNIGHT = 'https://api.hobnight.com/api';
const KEY = (process.env.HOBNIGHT_API_KEY || '').trim();
const TARGET_SHOPS = new Set(['asda', 'tesco', 'morrisons']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'object' && !Buffer.isBuffer(body) ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function hobnight(pathname, query = {}) {
  if (!KEY) {
    const err = new Error('HOBNIGHT_API_KEY is not set');
    err.status = 503;
    throw err;
  }
  const url = new URL(HOBNIGHT + pathname);
  Object.entries(query).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  });
  const r = await fetch(url, {
    headers: {
      Authorization: 'Bearer ' + KEY,
      Accept: 'application/json',
    },
  });
  const text = await r.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!r.ok) {
    const err = new Error((json && (json.message || json.error)) || 'Hobnight error ' + r.status);
    err.status = r.status;
    err.payload = json;
    throw err;
  }
  return json;
}

function unwrapList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.products)) return payload.products;
  return [];
}

function shopSlug(product) {
  const raw =
    product.supermarket?.slug ||
    product.supermarket?.name ||
    product.shop?.slug ||
    product.shop ||
    product.retailer ||
    product.store ||
    '';
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^asda$/, 'asda')
    .replace(/^tesco.*$/, 'tesco')
    .replace(/^morrison.*$/, 'morrisons');
}

function pickPrice(product) {
  const candidates = [
    product.price,
    product.current_price,
    product.latest_price,
    product.price_amount,
    product.amount,
    product.latest?.price,
    product.prices?.current,
  ];
  for (const c of candidates) {
    if (c == null || c === '') continue;
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function pickPack(product) {
  return (
    product.pack ||
    product.size ||
    product.pack_size ||
    product.quantity ||
    product.weight ||
    product.unit_size ||
    '—'
  );
}

function pickUnit(product) {
  return product.unit || product.unit_price || product.price_per_unit || product.unit_pricing || '';
}

function pickUpdated(product) {
  const raw =
    product.updated ||
    product.updated_at ||
    product.scraped_at ||
    product.price_updated_at ||
    product.observed_at ||
    product.latest?.observed_at ||
    null;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function pickLoyalty(product) {
  const candidates = [
    product.loyalty,
    product.loyalty_price,
    product.clubcard_price,
    product.promo_price,
    product.offer_price,
  ];
  for (const c of candidates) {
    if (c == null || c === '') continue;
    const n = Number(c);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function toOffer(product) {
  const price = pickPrice(product);
  if (price == null) return null;
  return {
    price,
    pack: String(pickPack(product)),
    unit: String(pickUnit(product) || ''),
    loyalty: pickLoyalty(product),
    updated: pickUpdated(product) || new Date().toISOString().slice(0, 10),
    sourceId: product.id ?? null,
    sourceName: product.name || product.title || '',
  };
}

async function resolveLine(line) {
  const q = String(line || '').trim();
  if (!q) return { line, product: null, error: 'empty' };

  let search;
  try {
    search = await hobnight('/products/search', { region: 'uk', q });
  } catch (e) {
    // Some deployments use /products?q= instead of /products/search
    if (e.status === 404) {
      search = await hobnight('/products', { region: 'uk', q });
    } else {
      throw e;
    }
  }

  const hits = unwrapList(search);
  if (!hits.length) {
    return { line, product: null, error: 'no_search_hit' };
  }

  const primary = hits[0];
  const primaryShop = shopSlug(primary);
  const offers = { asda: null, tesco: null, morrisons: null };

  if (TARGET_SHOPS.has(primaryShop)) {
    offers[primaryShop] = toOffer(primary);
  }

  let matches = [];
  if (primary.id != null) {
    try {
      const matchPayload = await hobnight('/products/' + primary.id + '/matches');
      matches = unwrapList(matchPayload);
      if (!matches.length && matchPayload?.data && !Array.isArray(matchPayload.data)) {
        matches = unwrapList(matchPayload.data.products || matchPayload.data.matches);
      }
    } catch {
      matches = [];
    }
  }

  const pool = [primary, ...matches];
  pool.forEach((p) => {
    const slug = shopSlug(p);
    if (!TARGET_SHOPS.has(slug)) return;
    const offer = toOffer(p);
    if (!offer) return;
    // Keep cheapest offer per store if several match
    if (!offers[slug] || offer.price < offers[slug].price) offers[slug] = offer;
  });

  const filled = Object.values(offers).filter(Boolean);
  if (!filled.length) {
    return { line, product: null, error: 'no_target_store_prices', hint: primary.name || primary.title };
  }

  return {
    line,
    product: {
      id: 'live-' + (primary.id ?? q),
      name: primary.name || primary.title || q,
      category: primary.brand || primary.category || 'Live',
      live: true,
      offers: {
        asda: offers.asda,
        tesco: offers.tesco,
        morrisons: offers.morrisons,
      },
    },
  };
}

async function handleBasket(items) {
  const lines = (items || []).map((x) => String(x).trim()).filter(Boolean);
  const results = [];
  // Sequential to be gentle on rate limits
  for (const line of lines) {
    results.push(await resolveLine(line));
  }
  return {
    mode: 'live',
    provider: 'hobnight',
    region: 'uk',
    stores: ['asda', 'tesco', 'morrisons'],
    results,
  };
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath.includes('..')) return send(res, 400, 'Bad path');
  const file = path.join(__dirname, urlPath);
  if (!file.startsWith(__dirname)) return send(res, 400, 'Bad path');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, 'Not found');
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return send(res, 204, '');

  try {
    if (url.pathname === '/api/status') {
      return send(res, 200, {
        live: Boolean(KEY),
        provider: KEY ? 'hobnight' : 'sample',
        message: KEY
          ? 'Hobnight key configured — compare will use live UK catalogue prices.'
          : 'No HOBNIGHT_API_KEY — using sample catalogue. Set the key and restart to go live.',
      });
    }

    if (url.pathname === '/api/basket' && req.method === 'POST') {
      if (!KEY) {
        return send(res, 503, {
          error: 'not_configured',
          message: 'Set HOBNIGHT_API_KEY and restart the server to use live prices.',
        });
      }
      const raw = await readBody(req);
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return send(res, 400, { error: 'invalid_json' });
      }
      const items = body.items || body.list || [];
      if (!Array.isArray(items) || !items.length) {
        return send(res, 400, { error: 'items_required' });
      }
      const out = await handleBasket(items.slice(0, 25));
      return send(res, 200, out);
    }

    if (url.pathname === '/api/search' && req.method === 'GET') {
      if (!KEY) {
        return send(res, 503, { error: 'not_configured' });
      }
      const q = url.searchParams.get('q') || '';
      const out = await resolveLine(q);
      return send(res, 200, out);
    }

    return serveStatic(req, res);
  } catch (err) {
    console.error(err);
    return send(res, err.status || 500, {
      error: 'proxy_error',
      message: err.message || 'Server error',
      detail: err.payload || null,
    });
  }
});

server.listen(PORT, () => {
  console.log('BasketWise on http://localhost:' + PORT);
  console.log(KEY ? 'Live mode: Hobnight key loaded' : 'Sample mode: set HOBNIGHT_API_KEY to go live');
});
