(function () {
  const D = window.BasketWiseData;
  if (!D) return;

  const STORE_IDS = ['asda', 'tesco', 'morrisons'];
  const money = (n) => '£' + (Math.round(n * 100) / 100).toFixed(2);
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* ---------- State ---------- */
  let diet = 'none';
  let dislikes = new Set();
  let lastMatched = [];
  let liveMode = false;
  let comparing = false;

  /* ---------- Nav / panels ---------- */
  const panels = {
    compare: document.getElementById('panel-compare'),
    meals: document.getElementById('panel-meals'),
    savings: document.getElementById('panel-savings'),
  };
  const navLinks = document.querySelectorAll('[data-panel]');

  function showPanel(id) {
    Object.keys(panels).forEach((key) => {
      const el = panels[key];
      const on = key === id;
      el.hidden = !on;
      el.classList.toggle('is-active', on);
    });
    document.querySelectorAll('.nav-link, .tab').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-panel') === id);
    });
    if (id !== 'top') {
      document.getElementById('app').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  navLinks.forEach((el) => {
    el.addEventListener('click', () => showPanel(el.getAttribute('data-panel')));
  });

  document.querySelectorAll('[data-go]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const sel = a.getAttribute('data-go');
      const t = document.querySelector(sel);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Matching ---------- */
  function normalise(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

  function parseList(text) {
    return String(text || '')
      .split(/\n|,/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function buildMatches(lines) {
    return lines.map((line) => {
      const product = matchProduct(line);
      return { line, product };
    });
  }

  /* ---------- Feature 1: Compare ---------- */
  const listInput = document.getElementById('list-input');
  const storeTotals = document.getElementById('store-totals');
  const compareWrap = document.getElementById('compare-table-wrap');
  const matchHint = document.getElementById('match-hint');

  function shelfPrice(offer, useLoyalty) {
    if (useLoyalty && offer.loyalty != null) return offer.loyalty;
    return offer.price;
  }

  function storeTotal(matches, storeId, useLoyalty) {
    let sum = 0;
    let count = 0;
    matches.forEach((m) => {
      if (!m.product || !m.product.offers) return;
      const o = m.product.offers[storeId];
      if (!o || o.price == null) return;
      sum += shelfPrice(o, useLoyalty);
      count += 1;
    });
    return { sum, count };
  }

  function setModeBadge() {
    const el = document.getElementById('price-mode');
    if (!el) return;
    el.textContent = liveMode ? 'Live prices (Hobnight)' : 'Sample prices';
    el.classList.toggle('is-live', liveMode);
    el.title = liveMode
      ? 'Using Hobnight UK catalogue via the local proxy'
      : 'Illustrative sample catalogue — set HOBNIGHT_API_KEY to go live';
  }

  function renderCompare(matches) {
    lastMatched = matches;
    const matched = matches.filter((m) => m.product);
    const unmatched = matches.filter((m) => !m.product);

    matchHint.textContent = unmatched.length
      ? matched.length +
        ' matched · ' +
        unmatched.length +
        (liveMode ? ' not found in live catalogue' : ' not found in sample catalogue')
      : matched.length +
        ' items matched across Asda, Tesco and Morrisons' +
        (liveMode ? ' (live)' : '');

    if (!matches.length) {
      storeTotals.innerHTML = '';
      compareWrap.innerHTML =
        '<p class="empty-state">Add items and tap <strong>Compare prices</strong> to see store-by-store totals.</p>';
      return;
    }

    const totals = STORE_IDS.map((id) => {
      const t = storeTotal(matches, id, false);
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
          t.store.colour +
          '"></span>' +
          t.store.name +
          '</div>' +
          '<div class="total">' +
          (t.count ? money(t.sum) : '—') +
          '</div>' +
          '<div class="meta">' +
          (t.count ? t.count + ' priced items · shelf prices' : 'No matches') +
          '</div></div>'
        );
      })
      .join('');

    let rows = matches
      .map((m) => {
        if (!m.product) {
          return (
            '<tr><td>' +
            escapeHtml(m.line) +
            '</td><td colspan="3" class="unmatched">No match — try a simpler name</td></tr>'
          );
        }
        const priced = STORE_IDS.map((id) => m.product.offers[id]).filter((o) => o && o.price != null);
        const low = priced.length ? Math.min(...priced.map((o) => o.price)) : null;
        const cells = STORE_IDS.map((id) => {
          const o = m.product.offers[id];
          if (!o || o.price == null) {
            return '<td class="price-cell"><span class="pack">No price</span></td>';
          }
          const lowClass = o.price === low ? ' is-low' : '';
          return (
            '<td class="price-cell' +
            lowClass +
            '"><span class="amount">' +
            money(o.price) +
            '</span>' +
            '<span class="pack">' +
            escapeHtml(o.pack) +
            (o.unit ? ' · ' + escapeHtml(o.unit) : '') +
            '</span>' +
            '<span class="updated">Updated ' +
            fmtDate(o.updated) +
            '</span></td>'
          );
        }).join('');
        return (
          '<tr><td><strong>' +
          escapeHtml(m.product.name) +
          '</strong><div class="pack" style="color:var(--muted)">' +
          escapeHtml(m.line !== m.product.name ? 'from “' + m.line + '”' : m.product.category) +
          '</div></td>' +
          cells +
          '</tr>'
        );
      })
      .join('');

    const cards = matches
      .map((m) => {
        if (!m.product) {
          return (
            '<article class="item-card"><h3>' +
            escapeHtml(m.line) +
            '</h3><p class="unmatched">No match' +
            (liveMode ? ' in live catalogue' : ' in sample catalogue') +
            '</p></article>'
          );
        }
        const priced = STORE_IDS.map((id) => m.product.offers[id]).filter((o) => o && o.price != null);
        const low = priced.length ? Math.min(...priced.map((o) => o.price)) : null;
        const offers = STORE_IDS.map((id) => {
          const o = m.product.offers[id];
          const store = D.STORES[id];
          if (!o || o.price == null) {
            return (
              '<div class="offer-row"><div class="offer-store"><span class="dot" style="background:' +
              store.colour +
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
            store.colour +
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
        }).join('');
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

    compareWrap.innerHTML =
      '<div class="mobile-cards">' +
      cards +
      '</div><div class="desktop-table"><table class="compare"><thead><tr><th>Product</th><th>Asda</th><th>Tesco</th><th>Morrisons</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  document.getElementById('btn-sample').addEventListener('click', () => {
    listInput.value = D.DEFAULT_LIST.join('\n');
    if (liveMode) runCompare();
    else renderCompare(buildMatches(D.DEFAULT_LIST));
  });

  document.getElementById('btn-clear-list').addEventListener('click', () => {
    listInput.value = '';
    matchHint.textContent = '';
    renderCompare([]);
  });

  /* ---------- Easy input: speak + photo OCR ---------- */
  const easyHint = document.getElementById('easy-hint');
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
    const merged = existing.concat(added);
    listInput.value = merged.join('\n');
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

  function getSpeechRecognition() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    return Ctor ? new Ctor() : null;
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
      easyHint.textContent = 'Listening stopped. Edit the list if needed, then compare.';
      return;
    }
    recognition = getSpeechRecognition();
    if (!recognition) {
      easyHint.textContent =
        'Voice isn’t supported in this browser. Try Chrome or Safari on your phone, or use Photo of list.';
      return;
    }
    recognition.lang = 'en-GB';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalChunk = '';
    recognition.onstart = () => {
      listening = true;
      btnSpeak.classList.add('is-listening');
      btnSpeak.setAttribute('aria-pressed', 'true');
      btnSpeak.textContent = 'Listening… tap to stop';
      easyHint.textContent = 'Listening — say items like “milk and bread and eggs”. Tap again to stop.';
    };
    recognition.onerror = (ev) => {
      stopListening();
      const why = ev.error === 'not-allowed' ? 'Microphone permission blocked.' : 'Voice error: ' + ev.error;
      easyHint.textContent = why + ' You can still type or use a photo.';
    };
    recognition.onend = () => {
      if (!listening) return;
      // Some browsers end after a pause — restart while user still wants listening
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
      const items = speechItemsFromTranscript(finalChunk + ' ' + interim);
      if (items.length) {
        easyHint.textContent = 'Heard: ' + items.slice(-6).join(', ');
      }
      if (finalChunk.trim()) {
        const added = appendListItems(speechItemsFromTranscript(finalChunk));
        finalChunk = '';
        if (added) easyHint.textContent = 'Added ' + added + ' item' + (added === 1 ? '' : 's') + ' from speech. Keep talking or tap to stop.';
      }
    };
    try {
      recognition.start();
    } catch (err) {
      stopListening();
      easyHint.textContent = 'Could not start the microphone. Check phone permissions.';
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
    easyHint.textContent = 'Reading your list photo — this can take a few seconds…';
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
      if (!lines.length) {
        easyHint.textContent =
          'Couldn’t read any items. Try a clearer photo in good light, or type/speak instead.';
      } else {
        easyHint.textContent =
          'Found ' +
          lines.length +
          ' line' +
          (lines.length === 1 ? '' : 's') +
          ' · added ' +
          added +
          ' new item' +
          (added === 1 ? '' : 's') +
          '. Check the list, then Compare prices.';
        listInput.focus();
      }
    } catch (err) {
      easyHint.textContent = (err && err.message) || 'Photo reading failed. Try again or type the list.';
    } finally {
      btnPhoto.disabled = false;
      btnPhoto.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg> Photo of list';
    }
  });

  async function runCompare() {
    const lines = parseList(listInput.value);
    const btn = document.getElementById('btn-compare');
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
    btn.disabled = true;
    btn.textContent = 'Fetching live prices…';
    matchHint.textContent = 'Talking to Hobnight…';
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
      matchHint.textContent = 'Live compare failed: ' + (err.message || 'error') + ' — falling back to sample.';
      renderCompare(buildMatches(lines));
    } finally {
      comparing = false;
      btn.disabled = false;
      btn.textContent = 'Compare prices';
    }
  }

  document.getElementById('btn-compare').addEventListener('click', () => {
    runCompare();
  });

  /* ---------- Feature 2: Meals ---------- */
  const dietChips = document.getElementById('diet-chips');
  const dislikeChips = document.getElementById('dislike-chips');
  const mealBaseline = document.getElementById('meal-baseline');
  const mealResults = document.getElementById('meal-results');

  function mealCost(meal, useLoyalty) {
    let sum = 0;
    const lines = meal.ingredients.map((pid) => {
      const product = D.PRODUCTS.find((p) => p.id === pid);
      let best = Infinity;
      let bestStore = null;
      STORE_IDS.forEach((sid) => {
        const o = product.offers[sid];
        const p = shelfPrice(o, useLoyalty);
        if (p < best) {
          best = p;
          bestStore = sid;
        }
      });
      sum += best;
      return { product, best, bestStore };
    });
    return { sum, lines };
  }

  function mealAllowed(meal) {
    if (!meal.diets.includes(diet)) return false;
    for (const d of dislikes) {
      if (meal.tags.includes(d) || meal.avoid.includes(d)) return false;
    }
    return true;
  }

  function renderMealControls() {
    dietChips.innerHTML = D.DIETS.map((d) => {
      return (
        '<button type="button" class="chip' +
        (diet === d.id ? ' is-on' : '') +
        '" data-diet="' +
        d.id +
        '">' +
        d.label +
        '</button>'
      );
    }).join('');

    dislikeChips.innerHTML = D.DISLIKES.map((d) => {
      return (
        '<button type="button" class="chip' +
        (dislikes.has(d.id) ? ' is-on' : '') +
        '" data-dislike="' +
        d.id +
        '" aria-pressed="' +
        (dislikes.has(d.id) ? 'true' : 'false') +
        '">' +
        d.label +
        '</button>'
      );
    }).join('');

    mealBaseline.innerHTML = D.MEALS.map((m) => {
      return '<option value="' + m.id + '">' + escapeHtml(m.name) + '</option>';
    }).join('');
  }

  dietChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-diet]');
    if (!btn) return;
    diet = btn.getAttribute('data-diet');
    renderMealControls();
  });

  dislikeChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dislike]');
    if (!btn) return;
    const id = btn.getAttribute('data-dislike');
    if (dislikes.has(id)) dislikes.delete(id);
    else dislikes.add(id);
    renderMealControls();
  });

  function suggestMeals() {
    const baseId = mealBaseline.value;
    const base = D.MEALS.find((m) => m.id === baseId);
    const baseCost = mealCost(base, true);

    const candidates = D.MEALS.filter((m) => mealAllowed(m) && m.id !== baseId)
      .map((m) => {
        const c = mealCost(m, true);
        return { meal: m, cost: c, save: baseCost.sum - c.sum };
      })
      .filter((x) => x.save > 0.05)
      .sort((a, b) => b.save - a.save);

    const cheaperAlts = candidates.filter(
      (x) => x.meal.swapFrom === baseId || x.save > 0
    );

    const show = (cheaperAlts.length ? cheaperAlts : candidates).slice(0, 4);

    const baseCard =
      '<article class="meal-card">' +
      '<h3>' +
      escapeHtml(base.name) +
      ' <span style="font-weight:500;color:var(--muted);font-size:.85rem">(tonight)</span></h3>' +
      '<div class="meal-meta"><span>' +
      base.serves +
      ' servings</span><span>' +
      base.time +
      ' mins</span></div>' +
      '<div class="meal-cost">' +
      money(baseCost.sum) +
      '</div>' +
      '<p class="meal-tip" style="margin-top:.5rem">Best-store ingredient total (loyalty where available).</p>' +
      '<ul class="ing-list">' +
      baseCost.lines
        .map(
          (l) =>
            '<li><span>' +
            escapeHtml(l.product.name) +
            '</span><span>' +
            money(l.best) +
            '</span></li>'
        )
        .join('') +
      '</ul></article>';

    if (!mealAllowed(base) && show.length === 0) {
      mealResults.innerHTML =
        '<p class="empty-state">Tonight’s plan doesn’t match your preferences. Pick another baseline or loosen a dislike.</p>';
      return;
    }

    if (!show.length) {
      mealResults.innerHTML =
        baseCard +
        '<p class="empty-state">No cheaper alternatives match these preferences right now. Try clearing a dislike or switching diet.</p>';
      return;
    }

    const altCards = show
      .map((x, i) => {
        const m = x.meal;
        return (
          '<article class="meal-card alt" style="animation-delay:' +
          i * 0.06 +
          's">' +
          '<h3>' +
          escapeHtml(m.name) +
          '</h3>' +
          '<div class="meal-meta"><span>' +
          m.serves +
          ' servings</span><span>' +
          m.time +
          ' mins</span></div>' +
          '<div class="meal-cost">' +
          money(x.cost.sum) +
          '</div>' +
          '<span class="meal-save">Save ' +
          money(x.save) +
          ' vs tonight</span>' +
          '<p class="meal-tip">' +
          escapeHtml(m.tip) +
          '</p>' +
          '<ul class="ing-list">' +
          x.cost.lines
            .map(
              (l) =>
                '<li><span>' +
                escapeHtml(l.product.name) +
                '</span><span>' +
                money(l.best) +
                '</span></li>'
            )
            .join('') +
          '</ul></article>'
        );
      })
      .join('');

    mealResults.innerHTML = baseCard + altCards;
  }

  document.getElementById('btn-meals').addEventListener('click', suggestMeals);

  /* ---------- Feature 3: Real savings ---------- */
  function packGrams(pack) {
    const s = String(pack).toLowerCase();
    let m = s.match(/([\d.]+)\s*kg/);
    if (m) return parseFloat(m[1]) * 1000;
    m = s.match(/([\d.]+)\s*g\b/);
    if (m) return parseFloat(m[1]);
    m = s.match(/([\d.]+)\s*l\b/);
    if (m) return parseFloat(m[1]) * 1000; // treat L ~ ml for milk-ish
    m = s.match(/([\d.]+)\s*ml/);
    if (m) return parseFloat(m[1]);
    m = s.match(/(\d+)\s*pack/);
    if (m) return parseFloat(m[1]);
    return null;
  }

  /** Relative cost index vs median pack among stores — higher pack = lower unit index */
  function normalisedLineCost(product, storeId, useLoyalty) {
    const offer = product.offers[storeId];
    if (!offer || offer.price == null) return { price: 0, adjusted: 0, note: '—' };
    const price = shelfPrice(offer, useLoyalty);
    const grams = packGrams(offer.pack);
    if (!grams) return { price, adjusted: price, note: offer.pack };

    const packs = STORE_IDS.map((id) => {
      const o = product.offers[id];
      return o ? packGrams(o.pack) : null;
    }).filter(Boolean);
    const ref = packs.reduce((a, b) => a + b, 0) / packs.length;
    const adjusted = price * (ref / grams);
    return {
      price,
      adjusted,
      note: offer.pack + (Math.abs(grams - ref) > 1 ? ' → scaled to ~' + Math.round(ref) + 'g eq.' : ''),
    };
  }

  function deliveryFee(storeId, goodsTotal) {
    const d = D.STORES[storeId].delivery;
    if (goodsTotal >= d.freeOver) return 0;
    return d.fee;
  }

  function renderSavings() {
    const lines = parseList(listInput.value);
    const matches = lines.length ? buildMatches(lines) : lastMatched.length ? lastMatched : buildMatches(D.DEFAULT_LIST);
    if (!listInput.value.trim() && !lastMatched.length) {
      listInput.value = D.DEFAULT_LIST.join('\n');
    }

    const useLoyalty = document.getElementById('use-loyalty').checked;
    const includeDelivery = document.getElementById('include-delivery').checked;
    const normalise = document.getElementById('normalise-packs').checked;

    const results = STORE_IDS.map((sid) => {
      let goods = 0;
      let goodsShelf = 0;
      let loyaltySaving = 0;
      const detail = [];

      matches.forEach((m) => {
        if (!m.product || !m.product.offers) return;
        const o = m.product.offers[sid];
        if (!o || o.price == null) return;
        const shelf = o.price;
        const paid = shelfPrice(o, useLoyalty);
        goodsShelf += shelf;
        if (useLoyalty && o.loyalty != null) loyaltySaving += shelf - o.loyalty;

        if (normalise) {
          const n = normalisedLineCost(m.product, sid, useLoyalty);
          goods += n.adjusted;
          detail.push({ name: m.product.name, display: n.adjusted, raw: paid, note: n.note, loyalty: o.loyalty });
        } else {
          goods += paid;
          detail.push({
            name: m.product.name,
            display: paid,
            raw: paid,
            note: o.pack,
            loyalty: o.loyalty,
          });
        }
      });

      const del = includeDelivery ? deliveryFee(sid, goods) : 0;
      return {
        id: sid,
        store: D.STORES[sid],
        goods,
        goodsShelf,
        loyaltySaving,
        delivery: del,
        total: goods + del,
        detail,
      };
    });

    const best = results.reduce((a, b) => (a.total <= b.total ? a : b));
    const worst = results.reduce((a, b) => (a.total >= b.total ? a : b));
    const saved = worst.total - best.total;

    const summary = document.getElementById('savings-summary');
    summary.innerHTML =
      results
        .map((r) => {
          const win = r.id === best.id;
          return (
            '<div class="save-card' +
            (win ? ' winner' : '') +
            '"><div class="label">' +
            r.store.name +
            (win ? ' · best' : '') +
            '</div><div class="value">' +
            money(r.total) +
            '</div><div class="detail">Goods ' +
            money(r.goods) +
            (includeDelivery
              ? ' · Delivery ' + (r.delivery === 0 ? 'free' : money(r.delivery))
              : '') +
            (r.loyaltySaving > 0.009
              ? '<div class="loyalty-note">Loyalty saves ' + money(r.loyaltySaving) + ' vs shelf</div>'
              : '') +
            '</div></div>'
          );
        })
        .join('') +
      '<div class="save-card"><div class="label">You could save</div><div class="value">' +
      money(saved) +
      '</div><div class="detail">Choosing ' +
      best.store.name +
      ' over ' +
      worst.store.name +
      ' on this list' +
      (normalise ? ' (pack-adjusted)' : '') +
      '</div></div>';

    const wrap = document.getElementById('savings-table-wrap');
    const matched = matches.filter((m) => m.product);
    if (!matched.length) {
      wrap.innerHTML = '<p class="empty-state">Add a shopping list on the Compare tab first.</p>';
      return;
    }

    let body = matched
      .map((m) => {
        const cells = STORE_IDS.map((sid) => {
          const r = results.find((x) => x.id === sid);
          const line = r.detail.find((d) => d.name === m.product.name);
          const loyaltyBit =
            useLoyalty && line.loyalty != null
              ? '<span class="loyalty-note">Loyalty ' + money(line.loyalty) + '</span>'
              : '';
          return (
            '<td class="price-cell"><span class="amount">' +
            money(line.display) +
            '</span><span class="pack">' +
            escapeHtml(line.note) +
            '</span>' +
            loyaltyBit +
            '</td>'
          );
        }).join('');
        return '<tr class="breakdown-row"><td>' + escapeHtml(m.product.name) + '</td>' + cells + '</tr>';
      })
      .join('');

    body +=
      '<tr><td><strong>Goods subtotal</strong></td>' +
      results.map((r) => '<td><strong>' + money(r.goods) + '</strong></td>').join('') +
      '</tr>';

    if (includeDelivery) {
      body +=
        '<tr><td>Delivery</td>' +
        results
          .map((r) => {
            const free = r.delivery === 0;
            return (
              '<td>' +
              (free ? '<span class="delta-pos">Free</span>' : money(r.delivery)) +
              '<span class="pack">Free over ' +
              money(r.store.delivery.freeOver) +
              '</span></td>'
            );
          })
          .join('') +
        '</tr>';
    }

    body +=
      '<tr><td><strong>Real total</strong></td>' +
      results
        .map((r) => {
          const win = r.id === best.id;
          return (
            '<td class="price-cell' +
            (win ? ' is-low' : '') +
            '"><span class="amount">' +
            money(r.total) +
            '</span></td>'
          );
        })
        .join('') +
      '</tr>';

    const cards = matched
      .map((m) => {
        const offers = STORE_IDS.map((sid) => {
          const r = results.find((x) => x.id === sid);
          const line = r.detail.find((d) => d.name === m.product.name);
          const store = D.STORES[sid];
          const win = r.id === best.id;
          const loyaltyBit =
            useLoyalty && line.loyalty != null
              ? '<br><span class="loyalty-note">Loyalty ' + money(line.loyalty) + '</span>'
              : '';
          return (
            '<div class="offer-row' +
            (win ? ' is-best' : '') +
            '"><div class="offer-store"><span class="dot" style="background:' +
            store.colour +
            '"></span>' +
            store.short +
            '</div><div class="offer-price">' +
            money(line.display) +
            '</div><div class="offer-meta">' +
            escapeHtml(line.note) +
            loyaltyBit +
            '</div></div>'
          );
        }).join('');
        return (
          '<article class="item-card"><h3>' +
          escapeHtml(m.product.name) +
          '</h3><div class="offer-list">' +
          offers +
          '</div></article>'
        );
      })
      .join('');

    const totalsCard =
      '<article class="item-card totals-card"><h3>Real totals</h3><div class="offer-list">' +
      results
        .map((r) => {
          const win = r.id === best.id;
          return (
            '<div class="offer-row' +
            (win ? ' is-best' : '') +
            '"><div class="offer-store"><span class="dot" style="background:' +
            r.store.colour +
            '"></span>' +
            r.store.short +
            (win ? ' · best' : '') +
            '</div><div class="offer-price">' +
            money(r.total) +
            '</div><div class="offer-meta">Goods ' +
            money(r.goods) +
            (includeDelivery
              ? ' · Delivery ' + (r.delivery === 0 ? 'free' : money(r.delivery))
              : '') +
            '</div></div>'
          );
        })
        .join('') +
      '</div></article>';

    wrap.innerHTML =
      '<div class="mobile-cards">' +
      totalsCard +
      cards +
      '</div><div class="desktop-table"><table class="compare"><thead><tr><th>Item</th><th>Asda</th><th>Tesco</th><th>Morrisons</th></tr></thead><tbody>' +
      body +
      '</tbody></table></div>';
  }

  document.getElementById('btn-savings').addEventListener('click', renderSavings);

  /* ---------- Boot ---------- */
  listInput.value = D.DEFAULT_LIST.join('\n');
  renderMealControls();
  renderCompare(buildMatches(D.DEFAULT_LIST));
  setModeBadge();

  fetch('/api/status')
    .then((r) => (r.ok ? r.json() : null))
    .then((status) => {
      if (!status) return;
      liveMode = Boolean(status.live);
      setModeBadge();
      if (liveMode) {
        matchHint.textContent = 'Live mode ready — tap Compare prices to fetch Hobnight catalogue prices.';
      }
    })
    .catch(() => {
      liveMode = false;
      setModeBadge();
    });
})();
