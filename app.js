(function () {
  const D = window.BasketWiseData;
  if (!D) return;

  const ALL_STORES = ['asda', 'tesco', 'morrisons'];
  /* Softer store dots in There-inspired dark mode */
  const DARK_STORE_COLOURS = {
    asda: '#b08cd9',
    tesco: '#7eb8e8',
    morrisons: '#cf9f7b',
  };
  const money = (n) => '£' + (Math.round(n * 100) / 100).toFixed(2);
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function storeColour(id) {
    if (currentTheme() === 'dark' && DARK_STORE_COLOURS[id]) return DARK_STORE_COLOURS[id];
    return (D.STORES[id] && D.STORES[id].colour) || '#888';
  }
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  /* ---------- State ---------- */
  let step = 1;
  let selectedStores = new Set(ALL_STORES);
  let journeyPref = 'single'; // from step 2 radios
  let activePlan = 'single'; // step 4 toggle
  let lastMatched = [];
  let lastJourneyStops = []; // [{id, store, lines, sum, pct?}]
  let liveMode = false;
  let comparing = false;
  let nearWatchId = null;
  let nearNotified = new Set();
  let swReg = null;

  const listInput = document.getElementById('list-input');
  const matchHint = document.getElementById('match-hint');
  const storeTotals = document.getElementById('store-totals');
  const compareWrap = document.getElementById('compare-table-wrap');
  const easyHint = document.getElementById('easy-hint');
  const journeyOut = document.getElementById('journey-out');

  /* ---------- Helpers ---------- */
  function normalise(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseList(text) {
    return String(text || '')
      .split(/\n|,/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function matchProduct(line) {
    const q = normalise(line);
    if (!q) return null;
    let best = null;
    let bestScore = 0;
    D.PRODUCTS.forEach((p) => {
      const name = normalise(p.name);
      let score = 0;
      if (name === q) score = 100;
      else if (name.includes(q) || q.includes(name)) score = 80;
      else {
        p.query.forEach((alias) => {
          const a = normalise(alias);
          if (q === a) score = Math.max(score, 95);
          else if (q.includes(a) || a.includes(q)) score = Math.max(score, 70);
        });
      }
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    });
    return bestScore >= 60 ? best : null;
  }

  function buildMatches(lines) {
    return lines.map((line) => ({ line, product: matchProduct(line) }));
  }

  function shelfPrice(offer, useLoyalty) {
    if (useLoyalty && offer && offer.loyalty != null) return offer.loyalty;
    return offer ? offer.price : null;
  }

  function activeStoreIds() {
    return ALL_STORES.filter((id) => selectedStores.has(id));
  }

  /* ---------- Step navigation ---------- */
  function goStep(n) {
    step = n;
    document.querySelectorAll('.step').forEach((el) => {
      const on = Number(el.getAttribute('data-step')) === n;
      el.hidden = !on;
      el.classList.toggle('is-active', on);
    });
    document.querySelectorAll('[data-step-indicator]').forEach((el) => {
      const i = Number(el.getAttribute('data-step-indicator'));
      el.classList.toggle('is-active', i === n);
      el.classList.toggle('is-done', i < n);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('[data-go-step]').forEach((btn) => {
    btn.addEventListener('click', () => goStep(Number(btn.getAttribute('data-go-step'))));
  });

  document.getElementById('brand-home').addEventListener('click', (e) => {
    e.preventDefault();
    goStep(1);
  });

  /* ---------- Step 1: list ---------- */
  document.getElementById('btn-sample').addEventListener('click', () => {
    listInput.value = D.DEFAULT_LIST.join('\n');
    easyHint.textContent = 'Sample list loaded — tap Next when you’re ready.';
  });

  document.getElementById('btn-clear-list').addEventListener('click', () => {
    listInput.value = '';
    easyHint.textContent = 'List cleared.';
  });

  document.getElementById('btn-to-stores').addEventListener('click', () => {
    const lines = parseList(listInput.value);
    if (!lines.length) {
      easyHint.textContent = 'Add at least one item (type, speak, or photo) before continuing.';
      listInput.focus();
      return;
    }
    goStep(2);
  });

  /* Speak + photo (same as before) */
  const btnSpeak = document.getElementById('btn-speak');
  const btnPhoto = document.getElementById('btn-photo');
  const photoInput = document.getElementById('photo-input');
  let recognition = null;
  let listening = false;
  let tesseractLoading = null;

  function speechItemsFromTranscript(text) {
    return String(text || '')
      .replace(/\band\b/gi, ',')
      .replace(/[.;]/g, ',')
      .split(/,|\n/)
      .map((s) => s.replace(/^[\s\-•\d.)]+/, '').trim())
      .filter((s) => s.length > 1);
  }

  function appendListItems(items) {
    const incoming = (items || []).map((s) => String(s).trim()).filter(Boolean);
    if (!incoming.length) return 0;
    const existing = parseList(listInput.value);
    const seen = new Set(existing.map((x) => normalise(x)));
    const added = [];
    incoming.forEach((item) => {
      const key = normalise(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      added.push(item);
    });
    listInput.value = existing.concat(added).join('\n');
    return added.length;
  }

  function ocrLinesFromText(text) {
    return String(text || '')
      .split(/\n+/)
      .map((line) =>
        line
          .replace(/[|]/g, 'I')
          .replace(/^[\s\-•·*]+/, '')
          .replace(/\s{2,}/g, ' ')
          .trim()
      )
      .filter((line) => {
        if (line.length < 2) return false;
        if (/^[\d£$€.,\s/]+$/.test(line)) return false;
        if (/^(shopping list|list|tesco|asda|morrisons)$/i.test(line)) return false;
        return /[a-zA-Z]/.test(line);
      });
  }

  function stopListening() {
    listening = false;
    btnSpeak.classList.remove('is-listening');
    btnSpeak.setAttribute('aria-pressed', 'false');
    btnSpeak.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/></svg> Speak list';
    try {
      if (recognition) recognition.stop();
    } catch (_) {}
  }

  btnSpeak.addEventListener('click', () => {
    if (listening) {
      stopListening();
      easyHint.textContent = 'Listening stopped. Edit if needed, then tap Next.';
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      easyHint.textContent = 'Voice isn’t supported here — try Chrome/Safari, or use Photo of list.';
      return;
    }
    recognition = new Ctor();
    recognition.lang = 'en-GB';
    recognition.interimResults = true;
    recognition.continuous = true;
    let finalChunk = '';
    recognition.onstart = () => {
      listening = true;
      btnSpeak.classList.add('is-listening');
      btnSpeak.setAttribute('aria-pressed', 'true');
      btnSpeak.textContent = 'Listening… tap to stop';
      easyHint.textContent = 'Listening — say “milk and bread and eggs”. Tap again to stop.';
    };
    recognition.onerror = (ev) => {
      stopListening();
      easyHint.textContent =
        (ev.error === 'not-allowed' ? 'Microphone permission blocked.' : 'Voice error: ' + ev.error) +
        ' You can still type or use a photo.';
    };
    recognition.onend = () => {
      if (!listening) return;
      try {
        recognition.start();
      } catch (_) {
        stopListening();
      }
    };
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += ' ' + t;
        else interim += t;
      }
      const preview = speechItemsFromTranscript(finalChunk + ' ' + interim);
      if (preview.length) easyHint.textContent = 'Heard: ' + preview.slice(-6).join(', ');
      if (finalChunk.trim()) {
        const added = appendListItems(speechItemsFromTranscript(finalChunk));
        finalChunk = '';
        if (added) easyHint.textContent = 'Added ' + added + ' item' + (added === 1 ? '' : 's') + '. Keep talking or tap to stop.';
      }
    };
    try {
      recognition.start();
    } catch (_) {
      stopListening();
      easyHint.textContent = 'Could not start the microphone.';
    }
  });

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (tesseractLoading) return tesseractLoading;
    tesseractLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.async = true;
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => reject(new Error('Could not load photo reader'));
      document.head.appendChild(s);
    });
    return tesseractLoading;
  }

  btnPhoto.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files && photoInput.files[0];
    photoInput.value = '';
    if (!file) return;
    btnPhoto.disabled = true;
    btnPhoto.textContent = 'Reading photo…';
    easyHint.textContent = 'Reading your list photo…';
    try {
      const Tesseract = await loadTesseract();
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress != null) {
            easyHint.textContent = 'Reading photo… ' + Math.round(m.progress * 100) + '%';
          }
        },
      });
      const lines = ocrLinesFromText(result?.data?.text || '');
      const added = appendListItems(lines);
      easyHint.textContent = lines.length
        ? 'Found ' + lines.length + ' lines · added ' + added + ' new. Check the list, then Next.'
        : 'Couldn’t read items — try a clearer photo, or type/speak.';
    } catch (err) {
      easyHint.textContent = (err && err.message) || 'Photo reading failed.';
    } finally {
      btnPhoto.disabled = false;
      btnPhoto.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg> Photo of list';
    }
  });

  /* ---------- Step 2: stores ---------- */
  function renderStorePick() {
    const wrap = document.getElementById('store-pick');
    wrap.innerHTML = ALL_STORES.map((id) => {
      const s = D.STORES[id];
      const on = selectedStores.has(id);
      return (
        '<button type="button" class="store-toggle' +
        (on ? ' is-on' : '') +
        '" data-store="' +
        id +
        '" aria-pressed="' +
        on +
        '"><span class="dot" style="background:' +
        storeColour(id) +
        '"></span><span class="store-toggle-name">' +
        s.name +
        '</span><span class="store-toggle-state">' +
        (on ? 'Included' : 'Off') +
        '</span></button>'
      );
    }).join('');
  }

  document.getElementById('store-pick').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-store]');
    if (!btn) return;
    const id = btn.getAttribute('data-store');
    if (selectedStores.has(id)) {
      if (selectedStores.size === 1) return; // keep at least one
      selectedStores.delete(id);
    } else selectedStores.add(id);
    renderStorePick();
  });

  document.querySelectorAll('input[name="journey-mode"]').forEach((r) => {
    r.addEventListener('change', () => {
      if (r.checked) journeyPref = r.value;
    });
  });

  document.getElementById('btn-to-prices').addEventListener('click', async () => {
    journeyPref = (document.querySelector('input[name="journey-mode"]:checked') || {}).value || 'single';
    activePlan = journeyPref;
    document.getElementById('plan-single').classList.toggle('is-on', activePlan === 'single');
    document.getElementById('plan-split').classList.toggle('is-on', activePlan === 'split');
    goStep(3);
    await runCompare();
  });

  /* ---------- Step 3: compare ---------- */
  function storeTotal(matches, storeId) {
    let sum = 0;
    let count = 0;
    matches.forEach((m) => {
      if (!m.product || !m.product.offers) return;
      const o = m.product.offers[storeId];
      if (!o || o.price == null) return;
      sum += o.price;
      count += 1;
    });
    return { sum, count };
  }

  function renderCompare(matches) {
    lastMatched = matches;
    const stores = activeStoreIds();
    const matched = matches.filter((m) => m.product);
    const unmatched = matches.filter((m) => !m.product);

    matchHint.textContent = unmatched.length
      ? matched.length + ' matched · ' + unmatched.length + ' not found'
      : matched.length + ' items compared' + (liveMode ? ' (live)' : '');

    const totals = stores.map((id) => {
      const t = storeTotal(matches, id);
      return { id, ...t, store: D.STORES[id] };
    });
    const bestSum = Math.min(...totals.map((t) => (t.count ? t.sum : Infinity)));

    storeTotals.innerHTML = totals
      .map((t) => {
        const isBest = t.count && t.sum === bestSum;
        return (
          '<div class="store-card' +
          (isBest ? ' is-best' : '') +
          '" role="listitem">' +
          (isBest ? '<span class="badge-best">Lowest</span>' : '') +
          '<div class="store-name"><span class="dot" style="background:' +
          storeColour(t.id) +
          '"></span>' +
          t.store.name +
          '</div><div class="total">' +
          (t.count ? money(t.sum) : '—') +
          '</div><div class="meta">' +
          (t.count ? t.count + ' priced items' : 'No matches') +
          '</div></div>'
        );
      })
      .join('');

    const cards = matches
      .map((m) => {
        if (!m.product) {
          return (
            '<article class="item-card"><h3>' +
            escapeHtml(m.line) +
            '</h3><p class="unmatched">No match</p></article>'
          );
        }
        const priced = stores
          .map((id) => m.product.offers[id])
          .filter((o) => o && o.price != null);
        const low = priced.length ? Math.min(...priced.map((o) => o.price)) : null;
        const offers = stores
          .map((id) => {
            const o = m.product.offers[id];
            const store = D.STORES[id];
            if (!o || o.price == null) {
              return (
                '<div class="offer-row"><div class="offer-store"><span class="dot" style="background:' +
                storeColour(id) +
                '"></span>' +
                store.short +
                '</div><div class="offer-price">—</div><div class="offer-meta">No price</div></div>'
              );
            }
            const best = o.price === low;
            return (
              '<div class="offer-row' +
              (best ? ' is-best' : '') +
              '"><div class="offer-store"><span class="dot" style="background:' +
              storeColour(id) +
              '"></span>' +
              store.short +
              (best ? ' · lowest' : '') +
              '</div><div class="offer-price">' +
              money(o.price) +
              '</div><div class="offer-meta">' +
              escapeHtml(o.pack) +
              (o.unit ? ' · ' + escapeHtml(o.unit) : '') +
              '<br>Updated ' +
              fmtDate(o.updated) +
              '</div></div>'
            );
          })
          .join('');
        return (
          '<article class="item-card"><h3>' +
          escapeHtml(m.product.name) +
          '</h3><p class="item-cat">' +
          escapeHtml(m.product.category) +
          '</p><div class="offer-list">' +
          offers +
          '</div></article>'
        );
      })
      .join('');

    const head = stores.map((id) => '<th>' + D.STORES[id].name + '</th>').join('');
    const rows = matches
      .map((m) => {
        if (!m.product) {
          return (
            '<tr><td>' +
            escapeHtml(m.line) +
            '</td><td colspan="' +
            stores.length +
            '" class="unmatched">No match</td></tr>'
          );
        }
        const priced = stores.map((id) => m.product.offers[id]).filter((o) => o && o.price != null);
        const low = priced.length ? Math.min(...priced.map((o) => o.price)) : null;
        const cells = stores
          .map((id) => {
            const o = m.product.offers[id];
            if (!o || o.price == null) return '<td class="price-cell"><span class="pack">—</span></td>';
            return (
              '<td class="price-cell' +
              (o.price === low ? ' is-low' : '') +
              '"><span class="amount">' +
              money(o.price) +
              '</span><span class="pack">' +
              escapeHtml(o.pack) +
              '</span><span class="updated">' +
              fmtDate(o.updated) +
              '</span></td>'
            );
          })
          .join('');
        return '<tr><td><strong>' + escapeHtml(m.product.name) + '</strong></td>' + cells + '</tr>';
      })
      .join('');

    compareWrap.innerHTML =
      '<div class="mobile-cards">' +
      cards +
      '</div><div class="desktop-table"><table class="compare"><thead><tr><th>Product</th>' +
      head +
      '</tr></thead><tbody>' +
      rows +
      '</tbody></table></div>';
  }

  async function runCompare() {
    const lines = parseList(listInput.value);
    if (!lines.length) {
      renderCompare([]);
      return;
    }
    if (!liveMode) {
      renderCompare(buildMatches(lines));
      return;
    }
    if (comparing) return;
    comparing = true;
    matchHint.textContent = 'Fetching live prices…';
    try {
      const res = await fetch('/api/basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Live compare failed');
      const matches = (data.results || []).map((r) => ({
        line: r.line,
        product: r.product
          ? {
              ...r.product,
              offers: {
                asda: r.product.offers?.asda || null,
                tesco: r.product.offers?.tesco || null,
                morrisons: r.product.offers?.morrisons || null,
              },
            }
          : null,
      }));
      renderCompare(matches);
    } catch (err) {
      matchHint.textContent = 'Live failed — using sample. ' + (err.message || '');
      renderCompare(buildMatches(lines));
    } finally {
      comparing = false;
    }
  }

  document.getElementById('btn-to-journey').addEventListener('click', () => {
    if (!lastMatched.length) {
      matchHint.textContent = 'Run a comparison first.';
      return;
    }
    goStep(4);
    renderJourney();
  });

  /* ---------- Step 4: journey ---------- */
  function buildPlans(matches) {
    const stores = activeStoreIds();
    const items = matches.filter((m) => m.product);

    // Single-shop: full basket at each store, pick cheapest complete-ish total
    const singles = stores.map((id) => {
      let sum = 0;
      let count = 0;
      const lines = [];
      items.forEach((m) => {
        const o = m.product.offers[id];
        if (!o || o.price == null) return;
        sum += o.price;
        count += 1;
        lines.push({ name: m.product.name, price: o.price, pack: o.pack });
      });
      return { id, store: D.STORES[id], sum, count, lines };
    });
    const bestSingle = singles
      .filter((s) => s.count)
      .sort((a, b) => a.sum - b.sum || b.count - a.count)[0];

    // Split: each item to cheapest selected store
    const buckets = {};
    stores.forEach((id) => {
      buckets[id] = { id, store: D.STORES[id], sum: 0, lines: [] };
    });
    let splitTotal = 0;
    let assigned = 0;
    items.forEach((m) => {
      let best = null;
      stores.forEach((id) => {
        const o = m.product.offers[id];
        if (!o || o.price == null) return;
        if (!best || o.price < best.price) best = { id, price: o.price, pack: o.pack };
      });
      if (!best) return;
      buckets[best.id].sum += best.price;
      buckets[best.id].lines.push({ name: m.product.name, price: best.price, pack: best.pack });
      splitTotal += best.price;
      assigned += 1;
    });

    const splitStops = Object.values(buckets)
      .filter((b) => b.lines.length)
      .sort((a, b) => b.sum - a.sum)
      .map((b) => ({
        ...b,
        pct: splitTotal > 0 ? Math.round((b.sum / splitTotal) * 100) : 0,
        itemPct: assigned > 0 ? Math.round((b.lines.length / assigned) * 100) : 0,
      }));

    // Fix rounding so pcts sum ~100
    if (splitStops.length) {
      const drift = 100 - splitStops.reduce((a, b) => a + b.pct, 0);
      splitStops[0].pct += drift;
    }

    const worstSingle = singles.filter((s) => s.count).sort((a, b) => b.sum - a.sum)[0];

    return { bestSingle, singles, splitStops, splitTotal, worstSingle, assigned };
  }

  function rememberStops(stops) {
    lastJourneyStops = (stops || []).map((s) => ({
      id: s.id,
      name: s.store.name,
      colour: storeColour(s.id),
      sum: s.sum,
      pct: s.pct,
      items: (s.lines || []).map((l) => l.name),
      lines: s.lines || [],
      store: s.store,
    }));
    try {
      localStorage.setItem('basketwise-journey-stops', JSON.stringify(lastJourneyStops));
    } catch (_) {}
  }

  function formatNotifyBody(items) {
    const list = items || [];
    if (!list.length) return 'No items for this stop.';
    const joined = list.join(', ');
    return joined.length > 180 ? joined.slice(0, 177) + '…' : joined;
  }

  async function ensureSw() {
    if (!('serviceWorker' in navigator)) return null;
    if (swReg) return swReg;
    swReg = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    return swReg;
  }

  async function ensureNotifyPermission() {
    if (!('Notification' in window)) {
      throw new Error('Notifications aren’t supported in this browser.');
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      throw new Error('Notifications are blocked. Enable them in phone settings.');
    }
    const res = await Notification.requestPermission();
    return res === 'granted';
  }

  async function sendStoreListNotifications(stops) {
    const list = stops && stops.length ? stops : lastJourneyStops;
    if (!list.length) throw new Error('Plan a journey first.');
    await ensureNotifyPermission();
    const reg = await ensureSw();

    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const title = 'BasketWise · ' + s.name + (list.length > 1 ? ' (' + (i + 1) + '/' + list.length + ')' : '');
      const body = formatNotifyBody(s.items || (s.lines || []).map((l) => l.name));
      const tag = 'basketwise-store-' + s.id;
      const payload = {
        type: 'notify-store-list',
        title,
        body,
        tag,
        storeId: s.id,
      };
      if (reg && reg.active) {
        reg.active.postMessage(payload);
      } else if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(payload);
      } else {
        // Fallback without SW
        new Notification(title, {
          body,
          tag,
          requireInteraction: true,
          icon: './favicon.svg',
        });
      }
      // Small stagger so lock screen shows them as a stack
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  function stopNearWatch() {
    if (nearWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(nearWatchId);
    }
    nearWatchId = null;
    nearNotified = new Set();
    const btn = document.getElementById('btn-near-watch');
    if (btn) {
      btn.classList.remove('is-on');
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = 'Notify when near a shop';
    }
  }

  function haversineMetres(a, b) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  async function findNearbyStore(lat, lon, storeName) {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=' +
      encodeURIComponent(storeName + ' supermarket') +
      '&viewbox=' +
      (lon - 0.08) +
      ',' +
      (lat + 0.08) +
      ',' +
      (lon + 0.08) +
      ',' +
      (lat - 0.08) +
      '&bounded=1';
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data[0]) return null;
    return { lat: Number(data[0].lat), lon: Number(data[0].lon), label: data[0].display_name };
  }

  async function startNearWatch() {
    if (!navigator.geolocation) throw new Error('Location isn’t available on this device.');
    if (!lastJourneyStops.length) throw new Error('Plan a journey first.');
    await ensureNotifyPermission();
    await ensureSw();

    const hint = document.getElementById('notify-hint');
    hint.textContent = 'Finding nearby shops from your location…';

    // Resolve approximate shop positions once
    const here = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
      });
    });
    const origin = { lat: here.coords.latitude, lon: here.coords.longitude };
    const targets = [];
    for (const stop of lastJourneyStops) {
      try {
        const found = await findNearbyStore(origin.lat, origin.lon, stop.name);
        if (found) targets.push({ stop, loc: found });
        await new Promise((r) => setTimeout(r, 1100)); // be kind to Nominatim
      } catch (_) {}
    }
    if (!targets.length) {
      throw new Error('Couldn’t find those shops nearby. Try sending lists to the lock screen instead.');
    }

    hint.textContent =
      'Watching for ' +
      targets.map((t) => t.stop.name).join(', ') +
      '. Keep the page open (or installed) while you travel.';

    const btn = document.getElementById('btn-near-watch');
    btn.classList.add('is-on');
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = 'Stop near-shop alerts';

    nearNotified = new Set();
    nearWatchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        for (const t of targets) {
          const dist = haversineMetres(me, t.loc);
          if (dist <= 250 && !nearNotified.has(t.stop.id)) {
            nearNotified.add(t.stop.id);
            await sendStoreListNotifications([t.stop]);
            hint.textContent =
              'You’re near ' + t.stop.name + ' (~' + Math.round(dist) + 'm) — list sent to your lock screen.';
          }
        }
      },
      (err) => {
        hint.textContent = 'Location error: ' + (err.message || 'permission denied');
        stopNearWatch();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }

  function renderJourney() {
    const plans = buildPlans(lastMatched);
    const postcode = (document.getElementById('postcode').value || '').trim().toUpperCase();
    const areaNote = postcode ? ' near <strong>' + escapeHtml(postcode) + '</strong>' : '';

    if (activePlan === 'single') {
      const b = plans.bestSingle;
      if (!b) {
        lastJourneyStops = [];
        journeyOut.innerHTML = '<p class="empty-state">No priced items to plan a journey.</p>';
        return;
      }
      rememberStops([b]);
      const save =
        plans.worstSingle && plans.worstSingle.id !== b.id
          ? plans.worstSingle.sum - b.sum
          : 0;
      journeyOut.innerHTML =
        '<div class="journey-hero-card">' +
        '<p class="journey-kicker">Recommended trip</p>' +
        '<h3>Shop everything at ' +
        escapeHtml(b.store.name) +
        '</h3>' +
        '<p class="journey-lead">One stop' +
        areaNote +
        ' — simplest journey for this list.</p>' +
        '<div class="journey-stat">' +
        money(b.sum) +
        '<span> for ' +
        b.count +
        ' items</span></div>' +
        (save > 0.009
          ? '<p class="meal-save">Save ' +
            money(save) +
            ' vs shopping the whole list at ' +
            escapeHtml(plans.worstSingle.store.name) +
            '</p>'
          : '') +
        '</div>' +
        '<div class="journey-stop">' +
        '<div class="journey-stop-head"><span class="dot" style="background:' +
        b.storeColour(id) +
        '"></span><strong>Stop 1 · ' +
        escapeHtml(b.store.name) +
        '</strong><span>100% of basket</span></div>' +
        '<ul class="ing-list">' +
        b.lines
          .map(
            (l) =>
              '<li><span>' + escapeHtml(l.name) + '</span><span>' + money(l.price) + '</span></li>'
          )
          .join('') +
        '</ul></div>' +
        '<p class="hint">Prefer splitting for lower item prices? Tap <strong>Split journey</strong> above.</p>';
      return;
    }

    // Split journey
    const stops = plans.splitStops;
    if (!stops.length) {
      journeyOut.innerHTML = '<p class="empty-state">No priced items to split.</p>';
      return;
    }
    const vsSingle =
      plans.bestSingle && plans.splitTotal < plans.bestSingle.sum
        ? plans.bestSingle.sum - plans.splitTotal
        : 0;

    const bars = stops
      .map(
        (s) =>
          '<div class="pct-row"><div class="pct-label"><span class="dot" style="background:' +
          s.storeColour(id) +
          '"></span>' +
          escapeHtml(s.store.name) +
          '</div><div class="pct-track"><i style="width:' +
          s.pct +
          '%;background:' +
          s.storeColour(id) +
          '"></i></div><div class="pct-val">' +
          s.pct +
          '%</div></div>'
      )
      .join('');

    const stopCards = stops
      .map((s, i) => {
        return (
          '<div class="journey-stop">' +
          '<div class="journey-stop-head"><span class="step-num">' +
          (i + 1) +
          '</span><span class="dot" style="background:' +
          s.storeColour(id) +
          '"></span><strong>' +
          escapeHtml(s.store.name) +
          '</strong><span>' +
          s.pct +
          '% of spend · ' +
          s.lines.length +
          ' items</span></div>' +
          '<ul class="ing-list">' +
          s.lines
            .map(
              (l) =>
                '<li><span>' + escapeHtml(l.name) + '</span><span>' + money(l.price) + '</span></li>'
            )
            .join('') +
          '</ul><div class="offer-meta">Subtotal ' +
          money(s.sum) +
          '</div></div>'
        );
      })
      .join('');

    const orderText = stops.map((s) => s.store.name + ' (' + s.pct + '%)').join(' → ');
    rememberStops(stops);

    journeyOut.innerHTML =
      '<div class="journey-hero-card">' +
      '<p class="journey-kicker">Split shopping journey</p>' +
      '<h3>' +
      escapeHtml(orderText) +
      '</h3>' +
      '<p class="journey-lead">Visit order' +
      areaNote +
      ' — each item bought where it’s cheapest among your selected stores.</p>' +
      '<div class="journey-stat">' +
      money(plans.splitTotal) +
      '<span> combined · ' +
      plans.assigned +
      ' items</span></div>' +
      (vsSingle > 0.009
        ? '<p class="meal-save">About ' +
          money(vsSingle) +
          ' less than buying everything at ' +
          escapeHtml(plans.bestSingle.store.name) +
          '</p>'
        : '<p class="hint">Split total is similar to the single cheapest shop — one stop may be easier.</p>') +
      '</div>' +
      '<div class="pct-block">' +
      bars +
      '</div>' +
      stopCards +
      '<p class="hint">Want the simplest trip instead? Tap <strong>One cheapest shop</strong>.</p>';
  }

  document.getElementById('plan-single').addEventListener('click', () => {
    activePlan = 'single';
    document.getElementById('plan-single').classList.add('is-on');
    document.getElementById('plan-split').classList.remove('is-on');
    renderJourney();
  });
  document.getElementById('plan-split').addEventListener('click', () => {
    activePlan = 'split';
    document.getElementById('plan-split').classList.add('is-on');
    document.getElementById('plan-single').classList.remove('is-on');
    renderJourney();
  });

  document.getElementById('btn-lock-lists').addEventListener('click', async () => {
    const hint = document.getElementById('notify-hint');
    const btn = document.getElementById('btn-lock-lists');
    btn.disabled = true;
    try {
      if (!lastJourneyStops.length) throw new Error('Open a journey plan first.');
      await sendStoreListNotifications(lastJourneyStops);
      hint.textContent =
        'Sent ' +
        lastJourneyStops.length +
        ' store list' +
        (lastJourneyStops.length === 1 ? '' : 's') +
        ' — check your lock screen / notification shade.';
    } catch (err) {
      hint.textContent = err.message || 'Could not send notifications.';
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('btn-near-watch').addEventListener('click', async () => {
    const hint = document.getElementById('notify-hint');
    if (nearWatchId != null) {
      stopNearWatch();
      hint.textContent = 'Near-shop alerts stopped.';
      return;
    }
    try {
      await startNearWatch();
    } catch (err) {
      stopNearWatch();
      hint.textContent = err.message || 'Could not start near-shop alerts.';
    }
  });

  /* ---------- Theme (light / dark) ---------- */
  function applyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('basketwise-theme', next);
    } catch (_) {}
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      btn.title = next === 'dark' ? 'Dark mode on — tap for light' : 'Light mode on — tap for dark';
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#121110' : '#0A5C5A');
    // Refresh coloured dots if store pick / results are on screen
    if (document.getElementById('store-pick')) renderStorePick();
    if (lastMatched.length && step === 3) renderCompare(lastMatched);
    if (lastMatched.length && step === 4) renderJourney();
  }

  document.getElementById('theme-toggle').addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  /* ---------- Boot ---------- */
  function setModeBadge() {
    const el = document.getElementById('price-mode');
    if (!el) return;
    el.textContent = liveMode ? 'Live prices (Hobnight)' : 'Sample prices';
    el.classList.toggle('is-live', liveMode);
  }

  applyTheme(currentTheme());
  listInput.value = D.DEFAULT_LIST.join('\n');
  renderStorePick();
  setModeBadge();
  goStep(1);

  if ('serviceWorker' in navigator) {
    ensureSw().catch(() => {});
  }

  const params = new URLSearchParams(location.search);
  if (params.get('step') === '4') {
    // deep link from notification
    try {
      const saved = JSON.parse(localStorage.getItem('basketwise-journey-stops') || '[]');
      if (saved.length) lastJourneyStops = saved;
    } catch (_) {}
  }

  fetch('/api/status')
    .then((r) => (r.ok ? r.json() : null))
    .then((status) => {
      if (!status) return;
      liveMode = Boolean(status.live);
      setModeBadge();
    })
    .catch(() => {});
})();
