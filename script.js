/* =========================================================
   MEIFO - script.js
   GSAP + ScrollTrigger + Lenis (archivos locales en /vendor).
   Si GSAP no carga o el usuario prefiere menos movimiento,
   el sitio se muestra completo y estático.
   ========================================================= */
(function () {
  'use strict';

  var doc = document, html = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var animated = hasGsap && !reduce;

  var lenis = null;
  var introDone = false;
  var navOpen = false;
  var WHATSAPP_NUMBER = '5212226820713';

  /* ---------------------------------------------------------
     Utilidades de texto
     --------------------------------------------------------- */
  // Divide un elemento en palabras. mask=true: cada palabra queda dentro
  // de una máscara (para animaciones de subida). mask=false: solo <span>.
  function splitWords(el, mask) {
    if (el._words) return el._words;
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    var out = [];

    function walk(node, target) {
      Array.prototype.forEach.call(node.childNodes, function (child) {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { target.appendChild(doc.createTextNode(' ')); return; }
            var inner = doc.createElement('span');
            inner.textContent = part;
            if (mask === false) {
              inner.className = 'sw';
              inner.setAttribute('aria-hidden', 'true');
              target.appendChild(inner);
            } else {
              var wrap = doc.createElement('span');
              wrap.className = 'w';
              wrap.setAttribute('aria-hidden', 'true');
              inner.className = 'wi';
              wrap.appendChild(inner);
              target.appendChild(wrap);
            }
            out.push(inner);
          });
        } else if (child.nodeType === 1) {
          var clone = child.cloneNode(false);
          target.appendChild(clone);
          walk(child, clone);
        }
      });
    }

    var frag = doc.createDocumentFragment();
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
    el._words = out;
    return out;
  }

  function scramble(el) {
    var finalText = el.textContent;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var o = { p: 0 };
    gsap.to(o, {
      p: 1, duration: 1.1, ease: 'power2.out',
      onUpdate: function () {
        var n = Math.floor(o.p * finalText.length), s = '';
        for (var i = 0; i < finalText.length; i++) {
          s += (i < n || finalText[i] === ' ') ? finalText[i] : chars[Math.floor(Math.random() * chars.length)];
        }
        el.textContent = s;
      },
      onComplete: function () { el.textContent = finalText; }
    });
  }

  /* ---------------------------------------------------------
     Funciones comunes (no dependen de GSAP)
     --------------------------------------------------------- */
  var toggleBtn = $('#nav-toggle');

  function setNav(open) {
    navOpen = open;
    doc.body.classList.toggle('nav-open', open);
    toggleBtn.setAttribute('aria-expanded', String(open));
    toggleBtn.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    // Un transform en el header (GSAP) rompe el position:fixed del panel del menú.
    if (open && hasGsap) gsap.set('#site-header', { clearProps: 'transform' });
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    else { html.style.overflow = open ? 'hidden' : ''; }
    if (open && animated) {
      gsap.fromTo('.nav__list li', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .08, ease: 'expo.out', delay: .1 });
    }
  }

  function initNav() {
    toggleBtn.addEventListener('click', function () { setNav(!navOpen); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && navOpen) setNav(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024 && navOpen) setNav(false); });

    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = doc.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (navOpen) setNav(false);
        if (lenis) {
          lenis.scrollTo(target, { duration: 1.9, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
        } else {
          target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        }
      });
    });
  }

  function initSpotlight() {
    if (!finePointer) return;
    $$('.cell').forEach(function (cell) {
      cell.addEventListener('pointermove', function (e) {
        var r = cell.getBoundingClientRect();
        cell.style.setProperty('--x', (e.clientX - r.left) + 'px');
        cell.style.setProperty('--y', (e.clientY - r.top) + 'px');
      });
    });
  }

  function initMagnetic() {
    if (!animated || !finePointer) return;
    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .28);
        yTo((e.clientY - (r.top + r.height / 2)) * .38);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  function initForm() {
    var form = $('#contact-form');
    if (!form) return;
    var note = $('#form-note');
    var label = $('.form-submit__label', form);

    function setInvalid(input, bad) {
      input.closest('.form-field').classList.toggle('form-field--invalid', bad);
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#field-name'), phone = $('#field-phone'), service = $('#field-service'), msg = $('#field-message');
      var digits = (phone.value.match(/\d/g) || []).length;
      var bad = {
        name: !name.value.trim(),
        phone: digits < 8,
        service: !service.value
      };
      setInvalid(name, bad.name);
      setInvalid(phone, bad.phone);
      setInvalid(service, bad.service);

      if (bad.name || bad.phone || bad.service) {
        note.textContent = 'Completa los campos marcados para continuar.';
        return;
      }

      var lines = [
        'Hola MEIFO, quiero solicitar una cotización.',
        'Nombre: ' + name.value.trim(),
        'Teléfono: ' + phone.value.trim(),
        'Servicio de interés: ' + service.value
      ];
      if (msg.value.trim()) lines.push('Mensaje: ' + msg.value.trim());

      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      note.textContent = 'Listo. Abriendo WhatsApp para enviar tu solicitud.';
      form.classList.add('is-sent');
      label.textContent = 'Abriendo WhatsApp';
      window.open(url, '_blank', 'noopener');

      setTimeout(function () {
        form.reset();
        form.classList.remove('is-sent');
        label.textContent = 'Solicitar cotización';
      }, 3500);
    });

    $$('input, select', form).forEach(function (input) {
      input.addEventListener('input', function () { setInvalid(input, false); });
      input.addEventListener('change', function () { setInvalid(input, false); });
    });
  }

  /* ---------------------------------------------------------
     Hero: red de nodos interactiva (fibra / red eléctrica)
     --------------------------------------------------------- */
  function initCanvas() {
    var canvas = $('#hero-canvas'), hero = $('#inicio');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, nodes = [], pulses = [], raf = null, running = false, lastPulse = 0;
    var mouse = { x: -9999, y: -9999, on: false };

    function resize() {
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(Math.round((W * H) / 21000), W < 700 ? 34 : 84);
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
          r: .9 + Math.random() * 1.7
        });
      }
      pulses = [];
    }

    function spawnPulse(maxD) {
      var a = nodes[Math.floor(Math.random() * nodes.length)];
      if (!a) return;
      var near = [];
      for (var i = 0; i < nodes.length; i++) {
        var b = nodes[i];
        if (b === a) continue;
        var dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy < maxD * maxD) near.push(b);
      }
      if (!near.length) return;
      pulses.push({ a: a, b: near[Math.floor(Math.random() * near.length)], t: 0, s: .008 + Math.random() * .01 });
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      var maxD = Math.min(190, Math.max(110, W * .11));
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxD) {
            ctx.strokeStyle = 'rgba(45,212,218,' + (.2 * (1 - d / maxD)) + ')';
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(143,236,241,.7)';
        ctx.beginPath(); ctx.arc(nodes[i].x, nodes[i].y, nodes[i].r, 0, 6.2832); ctx.fill();
      }
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      var maxD = Math.min(190, Math.max(110, W * .11));
      var i, j, n, m, dx, dy, d;

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (mouse.on) {
          dx = n.x - mouse.x; dy = n.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140 && d > 1) { var f = (1 - d / 140) * .06; n.vx += (dx / d) * f; n.vy += (dy / d) * f; }
        }
        n.vx *= .995; n.vy *= .995;
        var sp = Math.abs(n.vx) + Math.abs(n.vy);
        if (sp < .12) { n.vx += (Math.random() - .5) * .02; n.vy += (Math.random() - .5) * .02; }
        n.x += n.vx; n.y += n.vy;
        if (n.x < -10) n.x = W + 10; else if (n.x > W + 10) n.x = -10;
        if (n.y < -10) n.y = H + 10; else if (n.y > H + 10) n.y = -10;
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          m = nodes[j];
          dx = n.x - m.x; dy = n.y - m.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxD) {
            ctx.strokeStyle = 'rgba(45,212,218,' + (.2 * (1 - d / maxD)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
        if (mouse.on) {
          dx = n.x - mouse.x; dy = n.y - mouse.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < 190) {
            ctx.strokeStyle = 'rgba(143,236,241,' + (.55 * (1 - d / 190)) + ')';
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(143,236,241,.75)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fill();
      }

      if (t - lastPulse > 480 && pulses.length < 9) { spawnPulse(maxD); lastPulse = t; }
      for (i = pulses.length - 1; i >= 0; i--) {
        var p = pulses[i];
        p.t += p.s;
        dx = p.a.x - p.b.x; dy = p.a.y - p.b.y;
        if (p.t >= 1 || dx * dx + dy * dy > maxD * maxD * 1.4) { pulses.splice(i, 1); continue; }
        var px = p.a.x + (p.b.x - p.a.x) * p.t, py = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = 'rgba(45,212,218,.22)';
        ctx.beginPath(); ctx.arc(px, py, 7, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(207,250,252,.98)';
        ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 6.2832); ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      if (!nodes.length) resize();
      if (reduce) { drawStatic(); return; }
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    resize();
    if (reduce) drawStatic();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.isIntersecting ? start() : stop(); });
      }, { threshold: .02 }).observe(hero);
    } else { start(); }

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) stop(); else if (!reduce) start();
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { resize(); if (reduce) drawStatic(); }, 200);
    });

    if (finePointer) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
      });
      hero.addEventListener('pointerleave', function () { mouse.on = false; });
    }
  }

  /* ---------------------------------------------------------
     Haces de luz (fibra) en SVG
     --------------------------------------------------------- */
  function setupStreams(svg) {
    if (!svg) return;
    $$('[data-stream]', svg).forEach(function (p, i) {
      p.setAttribute('class', 'stream--base');
      if (!animated) return;
      var pulse = p.cloneNode(false);
      pulse.removeAttribute('data-stream');
      pulse.setAttribute('class', 'stream--pulse');
      svg.appendChild(pulse);
      var len = pulse.getTotalLength();
      var seg = Math.max(90, len * .06);
      pulse.style.strokeDasharray = seg + ' ' + (len + seg);
      gsap.set(pulse, { strokeDashoffset: seg });
      var tw = gsap.to(pulse, {
        strokeDashoffset: -len, duration: 5 + i * 1.4, ease: 'none',
        repeat: -1, repeatDelay: .6 + i * .35, delay: i * .8 + .4
      });
      ScrollTrigger.create({
        trigger: svg, start: 'top bottom', end: 'bottom top',
        onToggle: function (self) { self.isActive ? tw.resume() : tw.pause(); }
      });
    });
  }

  /* ---------------------------------------------------------
     Smooth scroll (Lenis) integrado con ScrollTrigger
     --------------------------------------------------------- */
  function setupLenis() {
    if (!window.Lenis) return;
    lenis = new Lenis({
      duration: 1.3,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: .9
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ---------------------------------------------------------
     Preloader cinematográfico
     --------------------------------------------------------- */
  function runPreloader() {
    return new Promise(function (resolve) {
      var pre = $('#preloader');
      if (!pre) { resolve(); return; }
      var countEl = $('#preloader-count'), seam = $('.preloader__seam', pre), core = $('.preloader__core', pre);
      var top = $('.preloader__panel--top', pre), bottom = $('.preloader__panel--bottom', pre);
      var s = { v: 0 }, loaded = doc.readyState === 'complete', t0 = performance.now(), finished = false;
      if (!loaded) window.addEventListener('load', function () { loaded = true; });

      function render() {
        countEl.textContent = String(Math.round(s.v)).padStart(3, '0');
        gsap.set(seam, { scaleX: s.v / 100 });
      }

      var tw = gsap.to(s, { v: 88, duration: 2.4, ease: 'power2.out', onUpdate: render });

      function exit() {
        var tl = gsap.timeline({ onComplete: function () { pre.remove(); } });
        tl.to(core, { opacity: 0, scale: 1.14, duration: .55, ease: 'power2.in' })
          .to(seam, { boxShadow: '0 0 70px 10px rgba(45,212,218,.9)', duration: .3 }, '<')
          .to(top, { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, '-=.05')
          .to(bottom, { yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, '<')
          .to(seam, { opacity: 0, duration: .4 }, '<.2')
          .add(function () { resolve(); }, '-=.75');
      }

      function finish() {
        if (finished) return;
        finished = true;
        tw.kill();
        gsap.to(s, { v: 100, duration: .6, ease: 'power2.inOut', onUpdate: render, onComplete: exit });
      }

      (function wait() {
        var elapsed = performance.now() - t0;
        if ((loaded && elapsed > 1400) || elapsed > 9000) finish();
        else requestAnimationFrame(wait);
      })();
    });
  }

  /* ---------------------------------------------------------
     Hero: estados iniciales, entrada y efectos de scroll/cursor
     --------------------------------------------------------- */
  var heroWords = [];

  function prepareHero() {
    heroWords = splitWords($('#hero-title'));
    gsap.set(heroWords, { yPercent: 118 });
    gsap.set(['#hero-subtitle', '#hero-actions'], { opacity: 0, y: 34 });
    gsap.set('#hero-bg img', { scale: 1.42 });
    gsap.set('#whatsapp-float', { scale: 0 });
    gsap.set('#site-header', { yPercent: -130 });
  }

  function introHero() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('#hero-bg img', { scale: 1.08, duration: 3.2, ease: 'power3.out' }, 0)
      .to(heroWords, { yPercent: 0, duration: 1.5, stagger: .11 }, .05)
      .to('#hero-subtitle', { opacity: 1, y: 0, duration: 1.3 }, .6)
      .to('#hero-actions', { opacity: 1, y: 0, duration: 1.3 }, .75)
      .to('#site-header', { yPercent: 0, duration: 1.1, ease: 'power3.out' }, .45)
      .to('.hero__spot', { opacity: 1, duration: 1.6 }, 1)
      .to('#whatsapp-float', { scale: 1, duration: 1, ease: 'back.out(2.2)' }, 1.5)
      .add(function () {
        introDone = true;
        if (lenis && !navOpen) lenis.start();
        ScrollTrigger.refresh();
      }, 1.3);

    gsap.to('#hero-bg img', { scale: 1.16, duration: 24, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3.4 });
  }

  function heroScrollAndPointer() {
    var hero = $('#inicio');
    gsap.to('#hero-bg', {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('#hero-content', {
      y: -90, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: '72% top', scrub: true }
    });

    if (!finePointer) return;
    var bgX = gsap.quickTo('#hero-bg img', 'x', { duration: 1.6, ease: 'power3' });
    var stX = gsap.quickTo('#hero-streams', 'x', { duration: 1.4, ease: 'power3' });
    var stY = gsap.quickTo('#hero-streams', 'y', { duration: 1.4, ease: 'power3' });
    var spX = gsap.quickTo('#hero-spot', 'x', { duration: .7, ease: 'power3' });
    var spY = gsap.quickTo('#hero-spot', 'y', { duration: .7, ease: 'power3' });
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      bgX(-nx * 36); stX(nx * 64); stY(ny * 34);
      spX(e.clientX - r.left); spY(e.clientY - r.top);
    });
  }

  /* ---------------------------------------------------------
     Header: ocultar/mostrar, progreso, enlace activo
     --------------------------------------------------------- */
  function setupHeader() {
    var header = $('#site-header'), hidden = false;

    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll();
        header.classList.toggle('is-scrolled', y > 24);
        if (navOpen || !introDone) return;
        var shouldHide = self.direction === 1 && y > 520;
        if (shouldHide !== hidden) {
          hidden = shouldHide;
          gsap.to(header, { yPercent: hidden ? -130 : 0, duration: .65, ease: 'power3.out', overwrite: 'auto' });
        }
      }
    });

    gsap.to('#progress-bar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .25 } });

    var pill = $('#nav-pill'), ind = $('#nav-indicator'), links = $$('.nav__link'), active = null;

    function place(link) {
      if (!link) { gsap.to(ind, { opacity: 0, duration: .3, overwrite: 'auto' }); return; }
      var lr = link.getBoundingClientRect(), pr = pill.getBoundingClientRect();
      var bw = parseFloat(getComputedStyle(pill).borderLeftWidth) || 0;
      gsap.to(ind, { x: lr.left - pr.left - bw, width: lr.width, opacity: 1, duration: .6, ease: 'power3.out', overwrite: 'auto' });
    }
    function setActive(link) {
      active = link;
      links.forEach(function (l) { l.classList.toggle('is-active', l === link); });
      place(link);
    }

    links.forEach(function (l) { l.addEventListener('mouseenter', function () { place(l); }); });
    pill.addEventListener('mouseleave', function () { place(active); });
    window.addEventListener('resize', function () { place(active); });

    ['servicios', 'nosotros', 'proceso', 'contacto'].forEach(function (id) {
      var sec = doc.getElementById(id);
      var link = $('.nav__link[href="#' + id + '"]');
      if (!sec || !link) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: function (self) {
          if (self.isActive) setActive(link);
          else if (active === link) setActive(null);
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Animaciones por sección
     --------------------------------------------------------- */
  function setupStatement() {
    var st = $('#statement-text');
    var words = splitWords(st, false);
    gsap.set(words, { opacity: .14 });
    gsap.to(words, {
      opacity: 1, ease: 'none', stagger: .14,
      scrollTrigger: { trigger: st, start: 'top 84%', end: 'bottom 50%', scrub: .6 }
    });
  }

  function setupMarquee() {
    var track = $('#marquee-track');
    var loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 260, 9);
        var dir = self.direction;
        gsap.to(loop, { timeScale: dir * (1 + v), duration: .15, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.1, delay: .15, ease: 'power2.out', overwrite: false });
      }
    });
  }

  function setupTitles() {
    $$('[data-split]').forEach(function (h) {
      var words = splitWords(h);
      gsap.set(words, { yPercent: 118 });
      ScrollTrigger.create({
        trigger: h, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(words, { yPercent: 0, duration: 1.3, stagger: .075, ease: 'expo.out' }); }
      });
    });
    $$('[data-scramble]').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: function () { scramble(el); } });
    });
    $$('.section-lead').forEach(function (p) {
      gsap.from(p, { y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 92%', once: true } });
    });
  }

  function setupStack(mm) {
    mm.add('(min-width: 900px)', function () {
      var cards = $$('[data-card]');
      cards.forEach(function (card, i) {
        var img = $('.stack-card__media img', card);
        gsap.fromTo(img, { yPercent: -6 }, {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true }
        });
        gsap.fromTo(card, { clipPath: 'inset(14% 5% 0% 5% round 24px)', opacity: 0 }, {
          clipPath: 'inset(0% 0% 0% 0% round 24px)', opacity: 1, duration: 1.3, ease: 'expo.out',
          clearProps: 'clipPath,opacity',
          scrollTrigger: { trigger: card, start: 'top 92%', once: true }
        });
        var next = cards[i + 1];
        if (!next) return;
        var shade = $('.stack-card__shade', card);
        var st = {
          trigger: next, start: 'top bottom', scrub: true,
          end: function () { return 'top ' + parseFloat(getComputedStyle(next).top); }
        };
        gsap.to(card, { scale: .94, ease: 'none', scrollTrigger: st });
        gsap.to(shade, { opacity: .65, ease: 'none', scrollTrigger: st });
      });
    });
    mm.add('(max-width: 899.98px)', function () {
      $$('[data-card]').forEach(function (card) {
        gsap.from(card, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 90%', once: true } });
      });
    });
  }

  function setupBento() {
    gsap.from($$('.cell'), {
      y: 80, opacity: 0, scale: .95, duration: 1.3, stagger: .13, ease: 'expo.out',
      scrollTrigger: { trigger: '#bento', start: 'top 84%', once: true }
    });
  }

  function setupExpand(mm) {
    var sec = $('#infraestructura'), media = $('#expand-media'), img = $('img', media), shade = $('#expand-shade');
    var words = splitWords($('#expand-title'));
    gsap.set(words, { yPercent: 118 });

    function build(startInset) {
      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: sec, start: 'top top', end: '+=150%', pin: true, scrub: .7, anticipatePin: 1 }
      });
      tl.fromTo(media, { clipPath: startInset }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
        .fromTo(img, { scale: 1.45 }, { scale: 1, duration: 1 }, 0)
        .fromTo(shade, { opacity: 0 }, { opacity: 1, duration: .5 }, .5)
        .to(words, { yPercent: 0, stagger: .05, duration: .45, ease: 'power3.out' }, .6);
    }
    mm.add('(min-width: 700px)', function () { build('inset(24% 27% 24% 27% round 32px)'); });
    mm.add('(max-width: 699.98px)', function () { build('inset(30% 8% 30% 8% round 24px)'); });
  }

  function setupProcess() {
    var steps = $$('.pstep');
    gsap.fromTo('#process-fill', { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '#process-steps', start: 'top 62%', end: 'bottom 62%', scrub: .5 }
    });
    steps.forEach(function (s) {
      ScrollTrigger.create({
        trigger: s, start: 'top 66%',
        onEnter: function () { s.classList.add('is-active'); },
        onLeaveBack: function () { s.classList.remove('is-active'); }
      });
    });
  }

  function setupContact() {
    setupStreams($('#contact-streams'));
    gsap.from('.contact__form > *', {
      y: 46, opacity: 0, duration: 1.1, stagger: .09, ease: 'expo.out',
      scrollTrigger: { trigger: '#contact-form', start: 'top 86%', once: true }
    });
    gsap.from(['.contact__text', '.contact__whatsapp'], {
      y: 34, opacity: 0, duration: 1.2, stagger: .12, ease: 'expo.out',
      scrollTrigger: { trigger: '.contact__intro', start: 'top 82%', once: true }
    });
    gsap.fromTo('.contact__bg img', { yPercent: -8, scale: 1.18 }, {
      yPercent: 8, scale: 1.18, ease: 'none',
      scrollTrigger: { trigger: '#contacto', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  function setupFooter() {
    var fw = $('#footer-word');
    var text = fw.textContent.trim();
    fw.textContent = '';
    var letters = text.split('').map(function (ch) {
      var s = doc.createElement('span');
      s.className = 'fl'; s.textContent = ch;
      fw.appendChild(s);
      return s;
    });
    gsap.set(letters, { yPercent: 110 });
    ScrollTrigger.create({
      trigger: '.footer__wordwrap', start: 'top 96%', once: true,
      onEnter: function () { gsap.to(letters, { yPercent: 0, duration: 1.5, stagger: .1, ease: 'expo.out' }); }
    });
  }

  /* ---------------------------------------------------------
     Arranque
     --------------------------------------------------------- */
  function boot() {
    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    initNav();
    initSpotlight();
    initForm();
    initCanvas();

    if (!animated) {
      var pre = $('#preloader');
      if (pre) pre.remove();
      setupStreams($('#hero-streams'));
      setupStreams($('#contact-streams'));
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    setupLenis();
    prepareHero();
    setupStreams($('#hero-streams'));
    initMagnetic();

    var mm = gsap.matchMedia();
    setupHeader();
    heroScrollAndPointer();
    setupStatement();
    setupMarquee();
    setupTitles();
    setupStack(mm);
    setupBento();
    setupExpand(mm);
    setupProcess();
    setupContact();
    setupFooter();

    runPreloader().then(introHero);

    // Red de seguridad: si algo bloquea el preloader, se libera el sitio.
    setTimeout(function () {
      var pre = $('#preloader');
      if (pre) { pre.remove(); if (!introDone) introHero(); }
    }, 14000);

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  boot();
})();
