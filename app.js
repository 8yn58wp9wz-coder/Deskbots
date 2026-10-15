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

  /* ---------- Nav / panels ---------- */
  const panels = {
    compare: document.getElementById('panel-compare'),
    meals: document.getElementById('panel-meals'),
    savings: document.getElementById('panel-savings'),
  };
  const navLinks = document.querySelectorAll('[data-panel]');
  const mobileNav = document.getElementById('mobile-nav');
  const navMenu = document.getElementById('nav-menu');

  function showPanel(id) {
    Object.keys(panels).forEach((key) => {
      const el = panels[key];
      const on = key === id;
      el.hidden = !on;
      el.classList.toggle('is-active', on);
    });
    document.querySelectorAll('.nav-link').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-panel') === id);
    });
    if (mobileNav) mobileNav.hidden = true;
    if (navMenu) navMenu.setAttribute('aria-expanded', 'false');
    if (id !== 'top') {
      document.getElementById('app').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  navLinks.forEach((el) => {
    el.addEventListener('click', () => showPanel(el.getAttribute('data-panel')));
  });

  if (navMenu && mobileNav) {
    navMenu.addEventListener('click', () => {
      const open = mobileNav.hidden;
      mobileNav.hidden = !open;
      navMenu.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

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
      if (!m.product) return;
      const o = m.product.offers[storeId];
      if (!o) return;
      sum += shelfPrice(o, useLoyalty);
      count += 1;
    });
    return { sum, count };
  }

  function renderCompare(matches) {
    lastMatched = matches;
    const matched = matches.filter((m) => m.product);
    const unmatched = matches.filter((m) => !m.product);

    matchHint.textContent = unmatched.length
      ? matched.length + ' matched · ' + unmatched.length + ' not found in sample catalogue'
      : matched.length + ' items matched across Asda, Tesco and Morrisons';

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
            '</td><td colspan="3" class="unmatched">No match in sample catalogue — try a simpler name</td></tr>'
          );
        }
        const prices = STORE_IDS.map((id) => m.product.offers[id].price);
        const low = Math.min(...prices);
        const cells = STORE_IDS.map((id) => {
          const o = m.product.offers[id];
          const lowClass = o.price === low ? ' is-low' : '';
          return (
            '<td class="price-cell' +
            lowClass +
            '"><span class="amount">' +
            money(o.price) +
            '</span>' +
            '<span class="pack">' +
            escapeHtml(o.pack) +
            ' · ' +
            escapeHtml(o.unit) +
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

    compareWrap.innerHTML =
      '<table class="compare"><thead><tr><th>Product</th><th>Asda</th><th>Tesco</th><th>Morrisons</th></tr></thead><tbody>' +
      rows +
      '</tbody></table>';
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
    renderCompare(buildMatches(D.DEFAULT_LIST));
  });

  document.getElementById('btn-compare').addEventListener('click', () => {
    const lines = parseList(listInput.value);
    renderCompare(buildMatches(lines));
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
    const price = shelfPrice(offer, useLoyalty);
    const grams = packGrams(offer.pack);
    if (!grams) return { price, adjusted: price, note: offer.pack };

    const packs = STORE_IDS.map((id) => packGrams(product.offers[id].pack)).filter(Boolean);
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
        if (!m.product) return;
        const o = m.product.offers[sid];
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

    wrap.innerHTML =
      '<table class="compare"><thead><tr><th>Item</th><th>Asda</th><th>Tesco</th><th>Morrisons</th></tr></thead><tbody>' +
      body +
      '</tbody></table>';
  }

  document.getElementById('btn-savings').addEventListener('click', renderSavings);

  /* ---------- Boot ---------- */
  listInput.value = D.DEFAULT_LIST.join('\n');
  renderMealControls();
  renderCompare(buildMatches(D.DEFAULT_LIST));
})();
