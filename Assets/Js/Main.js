 (function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var topbar = document.querySelector('.topbar');
      var toTop = document.getElementById('to-top');
      var links = Array.prototype.slice.call(document.querySelectorAll('#menu a'));
      var sections = links.map(function (a) {return document.getElementById(a.getAttribute('href').slice(1));});

      // Desplazamiento lento y suave hasta una posición.
      var raf = null;
      function scrollToY(target) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        target = Math.max(0, Math.min(target, max));
        if (reduce) {window.scrollTo(0, target); return;}
        var start = window.scrollY, dist = target - start, t0 = null;
        var duration = Math.min(1800, Math.max(900, Math.abs(dist) * 0.6));
        cancelAnimationFrame(raf);
        function step(t) {
          if (t0 === null) t0 = t;
          var k = Math.min(1, (t - t0) / duration);
          var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          window.scrollTo(0, start + dist * e);
          if (k < 1) raf = requestAnimationFrame(step);
        }
        raf = requestAnimationFrame(step);
      }
      ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
        window.addEventListener(ev, function () {cancelAnimationFrame(raf);}, {passive: true});
      });

      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (ev) {
          var el = document.getElementById(a.getAttribute('href').slice(1));
          if (!el) return;
          ev.preventDefault();
          var y = el.id === 'inicio' ? 0 : el.getBoundingClientRect().top + window.scrollY - topbar.offsetHeight + 1;
          scrollToY(y);
        });
      });
      toTop.addEventListener('click', function () {scrollToY(0);});

      // Marca en el menú la sección visible y muestra el botón para volver arriba.
      function update() {
        var y = window.scrollY + topbar.offsetHeight + 80, current = -1;
        sections.forEach(function (s, i) {if (s && s.offsetTop <= y) current = i;});
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = links.length - 1;
        links.forEach(function (a, i) {a.classList.toggle('active', i === current);});
        toTop.classList.toggle('show', window.scrollY > 500);
      }
      window.addEventListener('scroll', update, {passive: true});
      update();

      // Fondo ilustrado: pistas de circuito con pulsos que las recorren.
      function rng(seed) {return function () {seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;};}
      var DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
      var boards = Array.prototype.slice.call(document.querySelectorAll('canvas.circuit')).map(function (cv, idx) {
        return {cv: cv, ctx: cv.getContext('2d'), seed: 11 + idx * 7, traces: [], base: document.createElement('canvas'), w: 0, h: 0};
      });
      function build(b) {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = b.cv.clientWidth, h = b.cv.clientHeight;
        if (!w || !h) return;
        b.w = w; b.h = h;
        b.cv.width = b.base.width = Math.round(w * dpr); b.cv.height = b.base.height = Math.round(h * dpr);
        b.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = b.base.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
        var rootCs = getComputedStyle(document.documentElement);
        var light = b.cv.dataset.tone === 'light';
        var color = rootCs.getPropertyValue(light ? '--accent' : '--hero-accent').trim() || '#5cc8f0';
        var padBg = getComputedStyle(b.cv.parentElement).backgroundColor;
        if (!padBg || padBg === 'transparent' || padBg === 'rgba(0, 0, 0, 0)') padBg = rootCs.getPropertyValue('--bg').trim();
        b.color = color; b.light = light;
        var r = rng(b.seed), cell = 26, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
        var n = Math.round(w * h / (light ? 30000 : 16000));
        b.traces = [];
        g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 1.3; g.lineJoin = 'round';
        for (var i = 0; i < n; i++) {
          var x = Math.floor(r() * cols), y = Math.floor(r() * rows), d = Math.floor(r() * 4) * 2;
          var pts = [[x * cell, y * cell]], segs = 2 + Math.floor(r() * 4);
          for (var k = 0; k < segs; k++) {
            var len = 2 + Math.floor(r() * 7);
            x += DIRS[d][0] * len; y += DIRS[d][1] * len;
            pts.push([x * cell, y * cell]);
            d = (d + (r() < .5 ? 1 : 7)) % 8;
          }
          var total = 0, lens = [];
          for (k = 1; k < pts.length; k++) {var l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); lens.push(l); total += l;}
          b.traces.push({pts: pts, lens: lens, total: total, t: r(), speed: 40 + r() * 50, on: r() < .55});
          g.globalAlpha = light ? .11 : .26;
          g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
          for (k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
          g.stroke();
          [pts[0], pts[pts.length - 1]].forEach(function (pt, j) {
            g.globalAlpha = light ? .28 : .5; g.beginPath(); g.arc(pt[0], pt[1], 4, 0, 6.2832);
            if (j) {g.fill();} else {g.globalAlpha = 1; g.fillStyle = padBg; g.fill(); g.fillStyle = color; g.globalAlpha = light ? .28 : .5; g.stroke();}
          });
        }
        g.globalAlpha = 1;
        paint(b, 0);
      }
      function paint(b, dt) {
        var c = b.ctx; if (!b.w) return;
        c.clearRect(0, 0, b.w, b.h);
        c.drawImage(b.base, 0, 0, b.w, b.h);
        if (reduce) return;
        c.fillStyle = b.color; c.shadowColor = b.color; c.shadowBlur = b.light ? 6 : 10;
        b.traces.forEach(function (tr) {
          if (!tr.on) return;
          tr.t += dt * tr.speed / tr.total; if (tr.t > 1.4) tr.t = -0.4 * Math.random();
          if (tr.t < 0 || tr.t > 1) return;
          var dist = tr.t * tr.total, k = 0;
          while (k < tr.lens.length - 1 && dist > tr.lens[k]) {dist -= tr.lens[k]; k++;}
          var f = Math.min(1, dist / tr.lens[k]), a = tr.pts[k], z = tr.pts[k + 1];
          c.globalAlpha = b.light ? .6 : .9; c.beginPath(); c.arc(a[0] + (z[0] - a[0]) * f, a[1] + (z[1] - a[1]) * f, 2.4, 0, 6.2832); c.fill();
        });
        c.globalAlpha = 1; c.shadowBlur = 0;
      }
      function buildAll() {boards.forEach(build);}
      buildAll();
      var rt; window.addEventListener('resize', function () {clearTimeout(rt); rt = setTimeout(buildAll, 150);});
      if (!reduce) {
        var last = 0;
        (function loop(t) {
          var dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
          boards.forEach(function (b) {
            var rc = b.cv.getBoundingClientRect();
            if (rc.bottom > 0 && rc.top < window.innerHeight) paint(b, dt);
          });
          requestAnimationFrame(loop);
        })(0);
      }

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', buildAll);

      // Menú hamburguesa en pantallas chicas.
      var menu = document.getElementById('menu'), menuBtn = document.getElementById('menu-btn');
      function setMenu(open) {
        menu.classList.toggle('open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      }
      menuBtn.addEventListener('click', function () {setMenu(!menu.classList.contains('open'));});
      links.forEach(function (a) {a.addEventListener('click', function () {setMenu(false);});});
      document.addEventListener('click', function (ev) {if (!topbar.contains(ev.target)) setMenu(false);});
      document.addEventListener('keydown', function (ev) {if (ev.key === 'Escape') setMenu(false);});

      // Fotos de la portada: rotan solas y cambian con un click.
      var photoBtn = document.getElementById('photo'), dotsBox = document.getElementById('dots');
      var photos = Array.prototype.slice.call(photoBtn.querySelectorAll('img')), cur = 0, timer = null;
      var dots = photos.map(function () {var d = document.createElement('i'); dotsBox.appendChild(d); return d;});
      function showPhoto(n) {
        cur = (n + photos.length) % photos.length;
        photos.forEach(function (im, i) {im.classList.toggle('on', i === cur);});
        dots.forEach(function (d, i) {d.classList.toggle('on', i === cur);});
      }
      function startPhotos() {if (!reduce) {clearInterval(timer); timer = setInterval(function () {showPhoto(cur + 1);}, 4000);} }
      photoBtn.addEventListener('click', function () {showPhoto(cur + 1); startPhotos();});
      photoBtn.addEventListener('mouseenter', function () {clearInterval(timer);});
      photoBtn.addEventListener('mouseleave', startPhotos);
      showPhoto(0); startPhotos();

      // Las tarjetas aparecen con una animación corta al entrar en pantalla.
      if (!reduce && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {en.target.classList.add('reveal'); io.unobserve(en.target);}
          });
        }, {threshold: 0.15});
        document.querySelectorAll('.card, .edu, .skill, .project, .contact-item, .span-bar, .path').forEach(function (el) {
          if (el.getBoundingClientRect().top > window.innerHeight) io.observe(el);
        });
      }
    })();