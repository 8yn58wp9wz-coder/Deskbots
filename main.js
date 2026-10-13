(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- in-page scrolling (no hash navigation, iframe-safe) ---- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-links');
  function closeMenu(){
    if (!menu || !toggle) return;
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function(){
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
  }

  document.querySelectorAll('[data-go]').forEach(function(a){
    a.addEventListener('click', function(e){
      var t = document.querySelector(a.getAttribute('data-go')); if(!t) return;
      e.preventDefault();
      closeMenu();
      var y = a.getAttribute('data-go') === '#top' ? 0 : t.getBoundingClientRect().top + window.pageYOffset - 78;
      window.scrollTo({top: y, behavior: reduce ? 'auto' : 'smooth'});
    });
  });

  /* ---- scroll reveal ---- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }); }, {threshold: .12, rootMargin: '0px 0px -40px 0px'});
    rv.forEach(function(el){ io.observe(el); });
  } else rv.forEach(function(el){ el.classList.add('in'); });

  /* ---- pause offscreen animations ---- */
  if ('IntersectionObserver' in window) {
    var po = new IntersectionObserver(function(es){ es.forEach(function(e){ e.target.classList.toggle('paused', !e.isIntersecting); }); });
    document.querySelectorAll('.scene, .stage').forEach(function(el){ po.observe(el); });
  }

  /* ---- typed line ---- */
  var words = ['Missed calls.', 'Quiet quotes.', 'No-shows.', 'Unpaid invoices.', 'Reviews.', 'Social posts.'], el = document.getElementById('typed');
  if (el && !reduce) {
    var wi = 0, ci = words[0].length, del = false;
    (function tick(){
      var w = words[wi];
      if (!del) { ci++; el.textContent = w.slice(0, ci); if (ci >= w.length) { del = true; return setTimeout(tick, 1700); } return setTimeout(tick, 75); }
      ci--; el.textContent = w.slice(0, ci);
      if (ci <= 0) { del = false; wi = (wi + 1) % words.length; return setTimeout(tick, 250); }
      setTimeout(tick, 38);
    })();
  }

  /* ---- neural network canvas ---- */
  var cv = document.getElementById('net');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, nodes = [], pulses = [], mouse = {x: -999, y: -999}, run = true, raf = 0, last = 0;
    var LINK = 140;
    function size(){
      var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      LINK = W < 700 ? 110 : 140;
      var n = Math.round(Math.max(26, Math.min(90, W * H / 15000)));
      nodes = [];
      for (var i = 0; i < n; i++) nodes.push({x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.6 + .7, h: Math.random()});
    }
    function frame(t){
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, dx, dy, d, al;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i]; a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = W + 20; if (a.x > W + 20) a.x = -20; if (a.y < -20) a.y = H + 20; if (a.y > H + 20) a.y = -20;
      }
      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d = dx * dx + dy * dy;
          if (d < LINK * LINK) { d = Math.sqrt(d); al = (1 - d / LINK) * .32;
            ctx.strokeStyle = 'rgba(' + (a.h > .5 ? '96,165,250' : '167,139,250') + ',' + al.toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            if (!reduce && pulses.length < 14 && Math.random() < .0009) pulses.push({a: a, b: b, t: 0});
          }
        }
        dx = a.x - mouse.x; dy = a.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 180) { ctx.strokeStyle = 'rgba(34,211,238,' + ((1 - d / 180) * .55).toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
      for (i = 0; i < nodes.length; i++) { a = nodes[i]; ctx.fillStyle = a.h > .5 ? 'rgba(125,211,252,.9)' : 'rgba(196,181,253,.85)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill(); }
      for (i = pulses.length - 1; i >= 0; i--) {
        var p = pulses[i]; p.t += .018; if (p.t >= 1) { pulses.splice(i, 1); continue; }
        var x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        var g = ctx.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, 'rgba(165,243,252,1)'); g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.fill();
      }
      if (run && !reduce) raf = requestAnimationFrame(frame);
    }
    function start(){ cancelAnimationFrame(raf); if (reduce) frame(0); else raf = requestAnimationFrame(frame); }
    size(); start();
    var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ size(); start(); }, 150); });
    var hero = document.getElementById('hero');
    hero.addEventListener('pointermove', function(e){ var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function(){ mouse.x = mouse.y = -999; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ run = es[0].isIntersecting && !document.hidden; if (run) start(); }).observe(hero);
    document.addEventListener('visibilitychange', function(){ run = !document.hidden; if (run) start(); });
  }

  /* ---- card tilt + glow (pointer devices only) ---- */
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.card').forEach(function(c){
      var fr = 0;
      c.addEventListener('pointermove', function(e){
        cancelAnimationFrame(fr);
        fr = requestAnimationFrame(function(){
          var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          c.classList.add('t');
          c.style.setProperty('--ry', ((px - .5) * 10).toFixed(2) + 'deg');
          c.style.setProperty('--rx', ((.5 - py) * 8).toFixed(2) + 'deg');
          c.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
      });
      c.addEventListener('pointerleave', function(){ cancelAnimationFrame(fr); c.classList.remove('t'); c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---- Review Desk countdown: ends 31 Oct 2026 23:59:59 GMT (UTC+0) ---- */
  var END = Date.UTC(2026, 9, 31, 23, 59, 59);
  var timer = document.getElementById('rd-timer');
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function expire(){
    ['rd-badge', 'rd-count', 'rd-was'].forEach(function(id){ var e = document.getElementById(id); if (e) e.style.display = 'none'; });
    document.getElementById('rd-price').textContent = '£19.95';
    document.getElementById('rd-once').textContent = 'one-time';
  }
  function upd(){
    var s = Math.floor((END - Date.now()) / 1000);
    if (s <= 0) { expire(); return false; }
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    timer.textContent = d + 'd ' + pad(h) + 'h ' + pad(m) + 'm ' + pad(x) + 's';
    return true;
  }
  if (upd()) { var iv = setInterval(function(){ if (!upd()) clearInterval(iv); }, 1000); }
})();
