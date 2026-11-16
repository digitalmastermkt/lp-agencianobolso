/* MAIA FX — camada de animacao (beta). JS puro, sem dependencias. */
(function () {
  'use strict';
  var d = document, w = window, root = d.documentElement;
  var reduce = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var CY = '0,212,255', PU = '168,85,247', TAU = Math.PI * 2;

  function safe(fn) { try { fn(); } catch (e) { if (w.console) console.warn('[maia-fx]', e); } }

  /* Liga/desliga conforme o elemento esta na viewport e a aba esta visivel */
  function watch(el, cb) {
    var inView = !('IntersectionObserver' in w);
    function upd() { cb(inView && !d.hidden); }
    if ('IntersectionObserver' in w) {
      new IntersectionObserver(function (es) {
        inView = es[es.length - 1].isIntersecting; upd();
      }, { threshold: 0.05 }).observe(el);
    } else { upd(); }
    d.addEventListener('visibilitychange', upd);
  }

  /* ---------- 1. HERO: rede com no central (MAIA) e nos de agentes ---------- */
  function initHero() {
    var hero = d.querySelector('.hero'), inner = hero && hero.querySelector('.hero-inner');
    if (!inner) return;
    var c = d.createElement('canvas');
    var ctx = c.getContext && c.getContext('2d');
    if (!ctx) return;
    c.className = 'fx-hero-canvas'; c.setAttribute('aria-hidden', 'true');
    hero.insertBefore(c, inner);

    var W = 0, H = 0, cx = 0, cy = 0, mobile = false;
    var ag = [], dust = [], parts = [];
    var raf = 0, last = 0, spawnT = 0, T = 0, active = false;

    function build() {
      W = hero.clientWidth; H = hero.clientHeight;
      var dpr = Math.min(w.devicePixelRatio || 1, 2), i, a, f;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mobile = W < 720; cx = W / 2; cy = H * 0.42;
      var n = mobile ? 8 : 14;
      ag = [];
      for (i = 0; i < n; i++) {
        a = -Math.PI / 2 + (i + 0.5) / n * TAU;
        f = 0.86 + 0.16 * ((i * 7) % 5) / 4;
        ag.push({
          bx: cx + Math.cos(a) * W * (mobile ? 0.41 : 0.42) * f,
          by: cy + Math.sin(a) * H * (mobile ? 0.38 : 0.36) * f,
          ph: i * 1.9, col: i % 2 ? PU : CY, fl: 0, x: 0, y: 0
        });
      }
      var m = mobile ? 18 : 60;
      dust = [];
      for (i = 0; i < m; i++) {
        dust.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
          r: Math.random() * 1.2 + 0.6, col: Math.random() < 0.5 ? CY : PU
        });
      }
      parts = [];
    }

    function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

    function draw(dt) {
      T += dt;
      ctx.clearRect(0, 0, W, H);
      var i, j, k, p, q, dx, dy, d2, a, g, L = mobile ? 110 : 150, L2 = L * L;

      /* constelacao de fundo */
      ctx.lineWidth = 1;
      for (i = 0; i < dust.length; i++) {
        p = dust[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      }
      for (i = 0; i < dust.length; i++) {
        p = dust[i];
        for (j = i + 1; j < dust.length; j++) {
          q = dust[j]; dx = p.x - q.x; dy = p.y - q.y; d2 = dx * dx + dy * dy;
          if (d2 < L2) {
            a = (1 - Math.sqrt(d2) / L) * 0.24;
            ctx.strokeStyle = 'rgba(' + p.col + ',' + a.toFixed(3) + ')';
            line(p.x, p.y, q.x, q.y);
          }
        }
        ctx.fillStyle = 'rgba(' + p.col + ',0.5)';
        dot(p.x, p.y, p.r);
      }

      /* raios MAIA -> agentes */
      for (i = 0; i < ag.length; i++) {
        p = ag[i];
        p.x = p.bx + Math.sin(T * 0.5 + p.ph) * 9;
        p.y = p.by + Math.cos(T * 0.4 + p.ph) * 9;
        p.fl = Math.max(0, p.fl - dt * 1.4);
        g = ctx.createLinearGradient(cx, cy, p.x, p.y);
        g.addColorStop(0, 'rgba(' + PU + ',0.03)');
        g.addColorStop(0.4, 'rgba(' + PU + ',0.16)');
        g.addColorStop(1, 'rgba(' + p.col + ',' + (0.5 + p.fl * 0.4).toFixed(3) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = 1 + p.fl;
        line(cx, cy, p.x, p.y);
        ctx.lineWidth = 1;
        for (j = 0; j < dust.length; j++) {
          q = dust[j]; dx = p.x - q.x; dy = p.y - q.y; d2 = dx * dx + dy * dy;
          if (d2 < L2) {
            ctx.strokeStyle = 'rgba(' + p.col + ',' + ((1 - Math.sqrt(d2) / L) * 0.14).toFixed(3) + ')';
            line(p.x, p.y, q.x, q.y);
          }
        }
      }

      /* particulas viajando ate os agentes */
      for (i = parts.length - 1; i >= 0; i--) {
        q = parts[i]; p = ag[q.a];
        if (!p) { parts.splice(i, 1); continue; }
        q.p += q.sp * dt;
        if (q.p >= 1) { p.fl = 1; parts.splice(i, 1); continue; }
        for (k = 0; k < 6; k++) {
          a = q.p - k * 0.022;
          if (a <= 0) break;
          g = Math.min(1, a * 3.2) * (0.95 - k * 0.15);
          ctx.fillStyle = 'rgba(' + (k ? p.col : '255,255,255') + ',' + g.toFixed(3) + ')';
          dot(cx + (p.x - cx) * a, cy + (p.y - cy) * a, 2.6 - k * 0.32);
        }
        a = q.p;
        ctx.fillStyle = 'rgba(' + p.col + ',' + (Math.min(1, a * 3.2) * 0.16).toFixed(3) + ')';
        dot(cx + (p.x - cx) * a, cy + (p.y - cy) * a, 8);
      }

      /* nos dos agentes */
      for (i = 0; i < ag.length; i++) {
        p = ag[i];
        ctx.fillStyle = 'rgba(' + p.col + ',' + (0.10 + p.fl * 0.25).toFixed(3) + ')';
        dot(p.x, p.y, 11 + p.fl * 10);
        ctx.strokeStyle = 'rgba(' + p.col + ',' + (0.55 + p.fl * 0.45).toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6 + p.fl * 5, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(' + p.col + ',1)';
        dot(p.x, p.y, 3);
      }

      /* no central (MAIA) pulsando, discreto por ficar atras do headline */
      var R = mobile ? 90 : 150;
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      a = 0.13 + Math.sin(T * 1.7) * 0.04;
      g.addColorStop(0, 'rgba(' + PU + ',' + a.toFixed(3) + ')');
      g.addColorStop(0.5, 'rgba(' + CY + ',' + (a * 0.35).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + CY + ',0)');
      ctx.fillStyle = g; dot(cx, cy, R);
      ctx.lineWidth = 1.2;
      for (k = 0; k < 3; k++) {
        a = (T * 0.32 + k / 3) % 1;
        ctx.strokeStyle = 'rgba(' + (k % 2 ? CY : PU) + ',' + ((1 - a) * 0.26).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(cx, cy, 12 + a * R * 0.8, 0, TAU); ctx.stroke();
      }
    }

    function loop(ts) {
      raf = 0;
      if (!active) return;
      var dt = Math.min(Math.max((ts - last) / 1000, 0), 0.05);
      last = ts;
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = mobile ? 0.8 : 0.42;
        parts.push({ a: (Math.random() * ag.length) | 0, p: 0, sp: 0.38 + Math.random() * 0.3 });
      }
      draw(dt);
      raf = w.requestAnimationFrame(loop);
    }
    function start() { if (raf || !active) return; last = w.performance.now(); raf = w.requestAnimationFrame(loop); }

    build();
    if (reduce) draw(0);
    else watch(hero, function (on) {
      active = on;
      if (on) start(); else if (raf) { w.cancelAnimationFrame(raf); raf = 0; }
    });

    var rt = 0;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (hero.clientWidth === W && hero.clientHeight === H) return;
        build(); if (reduce || !active) draw(0);
      }, 150);
    }
    if ('ResizeObserver' in w) new ResizeObserver(onResize).observe(hero);
    else w.addEventListener('resize', onResize);
  }

  /* ---------- 6. Digitacao do destaque do headline (texto final identico) ---------- */
  function initTyping() {
    var el = d.querySelector('.hero h1 .gradient-text');
    if (reduce || !el || el.children.length) return;
    var txt = el.textContent, chars = [], frag = d.createDocumentFragment(), i, s;
    for (i = 0; i < txt.length; i++) {
      if (/\s/.test(txt[i])) { frag.appendChild(d.createTextNode(txt[i])); continue; }
      s = d.createElement('span'); s.className = 'fx-ch'; s.textContent = txt[i];
      frag.appendChild(s); chars.push(s);
    }
    var caret = d.createElement('span'); caret.className = 'fx-caret'; caret.setAttribute('aria-hidden', 'true');
    function restore() { el.classList.remove('fx-typing'); el.textContent = txt; }
    try {
      el.textContent = ''; el.appendChild(frag); el.classList.add('fx-typing');
      el.insertBefore(caret, el.firstChild);
    } catch (e) { restore(); return; }
    i = 0;
    function step() {
      if (i >= chars.length) { setTimeout(restore, 2200); return; }
      chars[i].classList.add('is-on');
      el.insertBefore(caret, chars[i].nextSibling);
      i++;
      setTimeout(step, 42);
    }
    setTimeout(step, 350);
    setTimeout(function () { if (el.classList.contains('fx-typing')) restore(); }, 9000); /* rede de seguranca */
  }

  /* ---------- 5. Contador (so nos precos de implantacao ja existentes) ---------- */
  function countUp(el) {
    var txt = el.textContent, m = /^(\D*)(\d[\d.]*)(.*)$/.exec(txt);
    if (!m) return;
    var target = parseInt(m[2].replace(/\./g, ''), 10), t0 = 0, dur = 1200;
    if (!target) return;
    function fr(ts) {
      if (!t0) t0 = ts;
      var k = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      if (k >= 1) { el.textContent = txt; return; }
      el.textContent = m[1] + Math.round(target * e).toLocaleString('pt-BR') + m[3];
      w.requestAnimationFrame(fr);
    }
    w.requestAnimationFrame(fr);
    setTimeout(function () { el.textContent = txt; }, dur + 600); /* garante o valor exato */
  }

  /* ---------- 3. Scroll reveal com stagger ---------- */
  function initReveal() {
    if (reduce || !('IntersectionObserver' in w)) return;
    var sel = '.section-header,.agent-card,.for-whom-card,.founder-card,.case-narrative,.maia-feature,' +
              '.orchestration-wrap,.about-hero,.process > *,.gallery-grid > *,#investimento .plano';
    var vh = w.innerHeight;
    var els = [].filter.call(d.querySelectorAll(sel), function (el) {
      if (el.closest('.hero')) return false;
      if (!el.classList.contains('plano') && el.closest('.reveal')) return false;
      return el.getBoundingClientRect().top > vh * 0.95;
    });
    if (!els.length) return;
    var io = new IntersectionObserver(function (es) {
      var n = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, delay = Math.min(n++ * 85, 510);
        io.unobserve(el);
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('fx-go');
        var price = el.classList.contains('plano') && el.querySelector('.plano-setup');
        if (price) setTimeout(function () { countUp(price); }, delay + 150);
        setTimeout(function () { el.classList.remove('fx-rv'); el.style.transitionDelay = ''; }, delay + 800);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { el.classList.add('fx-rv'); io.observe(el); });
  }

  /* ---------- 4. Tilt 3D leve (so desktop com mouse) ---------- */
  function initTilt() {
    if (reduce || !w.matchMedia || !w.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    [].forEach.call(d.querySelectorAll('.agent-card, #investimento .plano'), function (el) {
      var r = null, pend = false, ex = 0, ey = 0;
      el.classList.add('fx-tilt');
      el.addEventListener('pointerenter', function () { r = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', function (e) {
        ex = e.clientX; ey = e.clientY;
        if (pend) return;
        pend = true;
        w.requestAnimationFrame(function () {
          pend = false;
          if (!r) return;
          var px = (ex - r.left) / r.width - 0.5, py = (ey - r.top) / r.height - 0.5;
          el.style.setProperty('--fx-ry', (px * 6).toFixed(2) + 'deg');
          el.style.setProperty('--fx-rx', (-py * 6).toFixed(2) + 'deg');
        });
      });
      el.addEventListener('pointerleave', function () {
        r = null; el.style.removeProperty('--fx-rx'); el.style.removeProperty('--fx-ry');
      });
    });
  }

  /* ---------- 2a. Diagrama interativo: popup do agente + narracao ---------- */
  /* Textos conforme os cards de agentes da pagina. [nome, funcao, plano, magnata?, o que faz] */
  var MAG = 'Exclusivo Magnata';
  var AG = {
    maia:   ['MAIA', 'Orquestradora', 'Sua única interface', 0, ['Você fala só com ela', 'Aciona quem precisa e coordena a execução', 'Mantém a memória do seu negócio inteiro', 'Uma interface, até 14 especialistas']],
    lis:    ['Lis', 'SDR · Atendimento', 'A partir do Start', 0, ['Atende e qualifica DMs em 30 segundos, 24/7', 'Treinada com seu dossiê de 13 blocos', 'Escala para o humano só quando o lead está pronto para fechar']],
    theo:   ['Théo', 'Copy · Conteúdo · Persona', 'A partir do Pro', 0, ['Páginas de vendas completas', 'Roteiros de Reels, e-mails e carrosséis', 'Pesquisa de concorrência', 'Personas com 30 dimensões']],
    leo:    ['Léo', 'Dev · Deploy · Infra', 'A partir do Enterprise', 0, ['Código, deploy e automações em Python e VPS', 'Integrações Meta API, OpenAI, Anthropic, Stripe, Pagar.me', 'Sites no GitHub Pages com domínio próprio']],
    nina:   ['Nina', 'Operações · Coordenação', 'A partir do Enterprise', 0, ['Coordena entregas e gerencia prazos', 'Organiza arquivos e faz design ops', 'Monta briefings', 'Cuida do calendário operacional semanal']],
    eva:    ['Eva', 'CRM · Pós-venda', 'A partir do Pro', 0, ['Sequência de boas-vindas e reativação', 'NPS e aniversário de cliente', 'Recuperação de carrinho abandonado', 'Integra com Active Campaign, Mailchimp ou seu CRM']],
    ravi:   ['Ravi', 'Tráfego pago · Mídia', 'A partir do Enterprise', 0, ['Estrutura de campanha Meta Ads', 'Criativos (estático + Reel)', 'Segmentação por persona', 'Otimização semanal e relatório de ROI por campanha']],
    caio:   ['Caio', 'Projetos · Roadmap', 'A partir do Enterprise', 0, ['Roadmap dos próximos 90 dias', 'Priorização semanal e memória de pendência', 'Cobrança proativa de tarefa atrasada', 'Relatório executivo mensal']],
    bia:    ['Bia', 'Conteúdo · Roteiros', MAG, 1, ['Planeja a linha de conteúdo', 'Transforma ideias em roteiros prontos para gravar', 'Organiza o calendário editorial junto com o Théo']],
    aline:  ['Aline', 'Jurídico · Apoio', MAG, 1, ['Revisa e redige contratos', 'Orienta sobre LGPD e registro de marca', 'Aponta riscos pela ótica da outra parte', 'Apoio técnico, que não substitui o advogado']],
    maria:  ['Maria', 'Tributário · Fiscal', MAG, 1, ['Compara regimes (MEI, Simples, Presumido)', 'Calcula alíquota efetiva e Fator R', 'Prepara notas fiscais', 'Acompanha obrigações e prazos para você aprovar']],
    boris:  ['Boris', 'Engenharia · Sistemas', MAG, 1, ['Constrói sites, sistemas, automações e integrações', 'Trabalha com disciplina de testes', 'Cada entrega é verificada antes de ir para produção']],
    geane:  ['Geane', 'RH · Departamento pessoal', MAG, 1, ['Estrutura vagas e admissão', 'Calcula o custo real de uma contratação CLT', 'Prepara folha e férias para conferência da sua equipe ou do seu contador']],
    marcia: ['Márcia', 'Financeiro · ERP', MAG, 1, ['Organiza contas a pagar e a receber', 'Fluxo de caixa, DRE e conciliação no ERP MAIA Gestão', 'Ela prepara; quem aprova os pagamentos é você']],
    ruth:   ['Ruth', 'Prospecção B2B', MAG, 1, ['Monta listas de leads pré-qualificados', 'Faz o primeiro contato', 'Entrega à Lis e a você quem tem perfil para avançar']]
  };
  function avatar(k) { return '/assets/img/agentes/' + k + '.webp' + (k === 'boris' ? '?v=2' : ''); }

  function initOrq() {
    var dia = d.querySelector('.orq');
    if (!dia) return;
    var pop = d.createElement('dialog');
    if (typeof pop.showModal !== 'function') return;
    var KEY = 'maiaOrqMuted', muted = false, cur = null, curKey = '', openKey = '', lastNode = null, broken = {};
    try { muted = w.localStorage.getItem(KEY) === '1'; } catch (e) {}

    pop.className = 'orq-pop';
    pop.setAttribute('aria-labelledby', 'orq-pop-name');
    pop.innerHTML =
      '<div class="orq-pop-in">' +
        '<button type="button" class="orq-pop-x" aria-label="Fechar">×</button>' +
        '<span class="orq-pop-photo"><img alt="" width="296" height="296" decoding="async"></span>' +
        '<h3 class="orq-pop-name" id="orq-pop-name"></h3>' +
        '<p class="orq-pop-role"></p>' +
        '<span class="orq-pop-plan"></span>' +
        '<ul class="orq-pop-list"></ul>' +
        '<button type="button" class="orq-pop-play"></button>' +
      '</div>';
    d.body.appendChild(pop);
    var photo = pop.querySelector('.orq-pop-photo'), img = photo.querySelector('img');
    var nameEl = pop.querySelector('.orq-pop-name'), roleEl = pop.querySelector('.orq-pop-role');
    var planEl = pop.querySelector('.orq-pop-plan'), listEl = pop.querySelector('.orq-pop-list');
    var playBtn = pop.querySelector('.orq-pop-play'), muteBtn = dia.querySelector('.orq-mute');

    function nodeOf(k) { return dia.querySelector('.orq-node[data-agent="' + k + '"]'); }
    function paint() {
      var on = !!cur && curKey === openKey;
      playBtn.hidden = !!broken[openKey];
      playBtn.textContent = on ? '■ Parar' : '▶ Ouvir apresentação';
      playBtn.setAttribute('aria-label', (on ? 'Parar a apresentação de ' : 'Ouvir a apresentação de ') + (AG[openKey] ? AG[openKey][0] : ''));
      if (muteBtn) {
        muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        muteBtn.setAttribute('aria-label', muted ? 'Ativar narração' : 'Silenciar narração');
        muteBtn.title = muted ? 'Ativar narração' : 'Silenciar narração';
      }
    }
    function speaking(k) {
      [].forEach.call(dia.querySelectorAll('.is-speaking'), function (n) { n.classList.remove('is-speaking'); });
      photo.classList.remove('is-speaking');
      var n = k && nodeOf(k);
      if (n) n.classList.add('is-speaking');
      if (k && k === openKey) photo.classList.add('is-speaking');
    }
    function stop() {
      var a = cur;
      cur = null; curKey = '';
      if (a) {
        a.onerror = a.onended = a.onplaying = null;
        try { a.pause(); a.removeAttribute('src'); } catch (e) {}
      }
      speaking(''); paint();
    }
    /* Audio criado so no clique (sem preload); um por vez; falha esconde o botao */
    function play(k) {
      stop();
      if (broken[k] || !w.Audio) return;
      var a = new w.Audio();
      function fail() { if (cur !== a) return; broken[k] = 1; stop(); }
      a.preload = 'none';
      cur = a; curKey = k;
      a.onplaying = function () { if (cur === a) speaking(k); };
      a.onended = function () { if (cur === a) stop(); };
      a.onerror = fail;
      a.src = '/assets/audio/agentes/' + k + '.mp3';
      paint();
      try {
        var pr = a.play();
        if (pr && pr.catch) pr.catch(function (err) {
          if (cur !== a) return;
          if (err && (err.name === 'NotAllowedError' || err.name === 'AbortError')) stop(); else fail();
        });
      } catch (e) { fail(); }
    }
    function setMuted(v) {
      muted = v;
      try { w.localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {}
      if (v) stop(); else paint();
    }
    function open(k, gesture) {
      var it = AG[k], i, li;
      if (!it) return;
      if (pop.open) pop.close();
      openKey = k; lastNode = nodeOf(k);
      img.src = avatar(k);
      nameEl.textContent = it[0]; roleEl.textContent = it[1]; planEl.textContent = it[2];
      pop.classList.toggle('is-mag', !!it[3]);
      listEl.textContent = '';
      for (i = 0; i < it[4].length; i++) { li = d.createElement('li'); li.textContent = it[4][i]; listEl.appendChild(li); }
      paint();
      pop.showModal();
      if (gesture && !muted) play(k);
    }

    dia.addEventListener('click', function (e) {
      var n = e.target.closest && e.target.closest('.orq-node');
      if (n && dia.contains(n)) open(n.getAttribute('data-agent'), true);
    });
    /* hover/foco: so realca a linha do agente (MAIA realca todas) */
    function hot(e, on) {
      var n = e.target.closest && e.target.closest('.orq-node');
      if (!n) return;
      var k = n.getAttribute('data-agent'), ln;
      if (k === 'maia') { dia.classList.toggle('is-all-hot', on); return; }
      ln = dia.querySelector('.orq-line[data-line="' + k + '"]');
      if (ln) ln.classList.toggle('is-hot', on);
    }
    dia.addEventListener('pointerover', function (e) { if (e.pointerType === 'mouse') hot(e, true); });
    dia.addEventListener('pointerout', function (e) { hot(e, false); });
    dia.addEventListener('focusin', function (e) { hot(e, true); });
    dia.addEventListener('focusout', function (e) { hot(e, false); });

    pop.querySelector('.orq-pop-x').addEventListener('click', function () { pop.close(); });
    pop.addEventListener('click', function (e) { if (e.target === pop) pop.close(); }); /* clique fora */
    pop.addEventListener('close', function () {
      stop(); openKey = '';
      if (lastNode && lastNode.focus) { try { lastNode.focus({ preventScroll: true }); } catch (e) {} }
    });
    playBtn.addEventListener('click', function () {
      if (cur && curKey === openKey) { stop(); return; }
      if (muted) setMuted(false);
      play(openKey);
    });
    if (muteBtn) {
      muteBtn.hidden = false;
      muteBtn.addEventListener('click', function (e) { e.stopPropagation(); setMuted(!muted); });
    }
    paint();

    /* link direto / depuracao: ?agente=lis abre o cartao (sem autoplay, nao ha gesto) */
    var m = /[?&]agente=([a-z]+)/.exec(w.location.search);
    if (m && AG[m[1]]) open(m[1], false);
  }

  /* ---------- 2b. Orquestracao: pedido -> MAIA -> agente certo (14 agentes) ---------- */
  function initRoute() {
    var dia = d.querySelector('.orq'), box = d.querySelector('.fx-router');
    if (reduce || !dia || !box) return;
    var center = dia.querySelector('.orq-center'), dotEl = dia.querySelector('.orq-dot');
    var reqEl = box.querySelector('.fx-router-req'), agEl = box.querySelector('.fx-router-agent'), av = box.querySelector('.fx-router-av');
    if (!center || !dotEl || !reqEl || !agEl || !av) return;
    /* [chave, papel curto, pedido] — papeis conforme os cards de agentes */
    var Q = [
      ['aline', 'Jurídico', 'Revisa este contrato'],
      ['lis', 'SDR · Atendimento', 'Responde este lead no Instagram'],
      ['marcia', 'Financeiro', 'Monta a DRE'],
      ['theo', 'Copy · Conteúdo', 'Escreve a página de vendas'],
      ['geane', 'RH', 'Custo de contratar CLT'],
      ['ravi', 'Tráfego pago', 'Estrutura a campanha de Meta Ads'],
      ['maria', 'Tributário', 'Compara Simples e Presumido'],
      ['leo', 'Dev · Deploy', 'Publica o site no ar'],
      ['bia', 'Conteúdo · Roteiros', 'Monta o calendário editorial'],
      ['ruth', 'Prospecção B2B', 'Monta a lista de leads B2B'],
      ['eva', 'CRM · Pós-venda', 'Reativa os clientes parados'],
      ['boris', 'Engenharia · Sistemas', 'Constrói a integração do sistema'],
      ['caio', 'Projetos', 'Prioriza as tarefas da semana'],
      ['nina', 'Operações', 'Monta o briefing da campanha']
    ];
    var idx = 0, timer = 0, raf = 0, active = false, running = false;
    function later(fn, ms) { timer = setTimeout(fn, ms); }
    function reset() {
      [].forEach.call(dia.querySelectorAll('.fx-lit,.fx-active'), function (n) { n.classList.remove('fx-lit'); n.classList.remove('fx-active'); });
      center.classList.remove('fx-think'); dotEl.style.display = 'none';
    }
    function cycle() {
      if (!active) { running = false; return; }
      running = true;
      var it = Q[idx++ % Q.length], name = AG[it[0]][0];
      var node = dia.querySelector('.orq-node[data-agent="' + it[0] + '"]');
      var ln = dia.querySelector('.orq-line[data-line="' + it[0] + '"]');
      var i = 0;
      reset();
      box.className = 'fx-router is-routing';
      agEl.textContent = 'roteando…';
      reqEl.textContent = ''; reqEl.classList.add('is-typing');

      function lit() {
        center.classList.remove('fx-think'); dotEl.style.display = 'none';
        if (node) node.classList.add('fx-lit');
        box.className = 'fx-router is-routed';
        agEl.textContent = name + ' · ' + it[1];
        later(cycle, 2100);
      }
      function route() {
        if (!node || !ln) { later(lit, 450); return; }
        ln.classList.add('fx-active');
        var x2 = parseFloat(node.style.getPropertyValue('--x')), y2 = parseFloat(node.style.getPropertyValue('--y')), t0 = 0;
        dotEl.style.left = '50%'; dotEl.style.top = '50%';
        dotEl.style.display = 'block';
        raf = w.requestAnimationFrame(function fr(ts) {
          if (!t0) t0 = ts;
          var k = Math.min((ts - t0) / 750, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          dotEl.style.left = (50 + (x2 - 50) * e) + '%'; dotEl.style.top = (50 + (y2 - 50) * e) + '%';
          if (k < 1) raf = w.requestAnimationFrame(fr); else { raf = 0; lit(); }
        });
      }
      function type() {
        if (i < it[2].length) { reqEl.textContent = it[2].slice(0, ++i); later(type, 26); return; }
        reqEl.classList.remove('is-typing');
        center.classList.add('fx-think');
        av.src = avatar(it[0]);
        later(route, 650);
      }
      type();
    }
    watch(dia, function (on) {
      active = on;
      if (on && !running) cycle();
      else if (!on) {
        clearTimeout(timer); if (raf) { w.cancelAnimationFrame(raf); raf = 0; }
        running = false; reset(); reqEl.classList.remove('is-typing');
      }
    });
  }

  root.classList.add('fx');
  safe(initHero); safe(initTyping); safe(initReveal); safe(initTilt); safe(initOrq); safe(initRoute);
})();
