/* MAIA · Calculadora "time + ERP" — carregado só pelo beta/index.html.
   Compara o custo de montar no mercado o time e as ferramentas que o plano cobre com o custo da MAIA.
   Valores padrão são referências editáveis (exceto o salário mínimo 2026, R$ 1.621). */
(function () {
  'use strict';
  var root = document.getElementById('maiaCalc');
  if (!root) return;

  var CLT = 1.7; // mesmo multiplicador de encargos da calculadora anterior
  var PLANS = [
    { id: 'start',      nome: 'Start',      setup: 1497,  mensal: 297 },
    { id: 'pro',        nome: 'Pro',        setup: 5000,  mensal: 597 },
    { id: 'enterprise', nome: 'Enterprise', setup: 12000, mensal: 597 },
    { id: 'magnata',    nome: 'Magnata',    setup: 25000, mensal: 597 }
  ];
  // nivel = índice do primeiro plano que cobre a função. tipo: clt (salário base ×1,7) | terc (mensalidade) | soft (assinatura)
  var ROWS = [
    { id: 'lis',     nivel: 0, agente: 'Lis',    funcao: 'Atendente / SDR',                       tipo: 'clt',  valor: 1621, qtd: 1, on: true },
    { id: 'theo',    nivel: 1, agente: 'Théo',   funcao: 'Social media / copywriter',             tipo: 'clt',  valor: 2500, on: true },
    { id: 'agencia', nivel: 1, agente: '',       funcao: 'Agência de marketing',                  tipo: 'terc', valor: 5000, on: false, box: 'MKT',
      hint: 'Desligada por padrão para não contar marketing duas vezes. Ligue se hoje você paga agência.' },
    { id: 'eva',     nivel: 1, agente: 'Eva',    funcao: 'Analista de CRM / pós-venda',           tipo: 'clt',  valor: 2200, on: true },
    { id: 'leo',     nivel: 2, agente: 'Léo',    funcao: 'Desenvolvedor (dev, deploy, infra)',    tipo: 'clt',  valor: 5000, on: true },
    { id: 'nina',    nivel: 2, agente: 'Nina',   funcao: 'Coordenador de operações',              tipo: 'clt',  valor: 3500, on: true },
    { id: 'ravi',    nivel: 2, agente: 'Ravi',   funcao: 'Gestor de tráfego pago',                tipo: 'clt',  valor: 3000, on: true },
    { id: 'caio',    nivel: 2, agente: 'Caio',   funcao: 'Gerente de projetos',                   tipo: 'clt',  valor: 4000, on: true },
    { id: 'bia',     nivel: 3, agente: 'Bia',    funcao: 'Estrategista de conteúdo / roteirista', tipo: 'clt',  valor: 3000, on: true },
    { id: 'aline',   nivel: 3, agente: 'Aline',  funcao: 'Assessoria jurídica mensal',            tipo: 'terc', valor: 1500, on: true },
    { id: 'maria',   nivel: 3, agente: 'Maria',  funcao: 'Contabilidade consultiva / tributária', tipo: 'terc', valor: 1200, on: true },
    { id: 'boris',   nivel: 3, agente: 'Boris',  funcao: 'Engenheiro de software',                tipo: 'clt',  valor: 7000, on: true },
    { id: 'geane',   nivel: 3, agente: 'Geane',  funcao: 'Analista de RH / departamento pessoal', tipo: 'clt',  valor: 2800, on: true },
    { id: 'marcia',  nivel: 3, agente: 'Márcia', funcao: 'Analista financeiro',                   tipo: 'clt',  valor: 3000, on: true },
    { id: 'ruth',    nivel: 3, agente: 'Ruth',   funcao: 'Pré-vendas / prospecção B2B',           tipo: 'clt',  valor: 2200, on: true },
    { id: 'erp',     nivel: 3, agente: '',       funcao: 'Sistema ERP (assinatura)',              tipo: 'soft', valor: 300,  on: true, box: 'ERP' }
  ];
  var TAG = { clt: 'CLT ×1,7', terc: 'Terceirizado', soft: 'Software' };
  var IMG = { 'Théo': 'theo', 'Léo': 'leo', 'Márcia': 'marcia' };

  var fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  function brl(n) { return fmt.format(Math.round(isFinite(n) ? n : 0)); }
  function $(id) { return document.getElementById(id); }
  function num(el) { var v = Number(el && el.value); return isFinite(v) && v > 0 ? v : 0; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = { plan: 3 };
  try {
    var q = new URLSearchParams(location.search).get('plano');
    PLANS.forEach(function (p, i) { if (p.id === q) state.plan = i; });
  } catch (e) {}

  // ---------- render das linhas ----------
  var rowsEl = $('mcRows');
  rowsEl.innerHTML = ROWS.map(function (r) {
    var slug = IMG[r.agente] || r.agente.toLowerCase();
    var av = r.agente
      ? '<img class="mc-av" src="/assets/img/agentes/' + slug + '.webp" alt="" width="40" height="40" decoding="async">'
      : '<span class="mc-av mc-av-box" aria-hidden="true">' + r.box + '</span>';
    var qty = r.qtd
      ? '<div class="roi-input-wrap mc-qty"><input type="number" id="mcQ-' + r.id + '" min="0" max="50" step="1" value="' + r.qtd + '" inputmode="numeric" aria-label="Quantidade de atendentes"><span class="roi-prefix">pessoas ×</span></div>'
      : '';
    var lab = r.tipo === 'clt' ? 'Salário base mensal' : (r.tipo === 'soft' ? 'Assinatura mensal' : 'Mensalidade');
    return '<div class="mc-row" data-row="' + r.id + '"><div class="mc-row-clip"><div class="mc-row-in">' + av +
      '<div class="mc-info"><div class="mc-func" id="mcF-' + r.id + '">' + esc(r.funcao) + '</div>' +
      '<div class="mc-meta">' + (r.agente ? '<span class="mc-agent">' + esc(r.agente) + '</span>' : '') + '<span class="mc-tag">' + TAG[r.tipo] + '</span></div></div>' +
      '<button type="button" class="mc-switch" role="switch" aria-checked="' + r.on + '" aria-labelledby="mcF-' + r.id + '" title="Eu teria esse custo"><i></i></button>' +
      '<div class="mc-ctl">' + qty +
      '<div class="roi-input-wrap"><span class="roi-prefix">R$</span><input type="number" id="mcV-' + r.id + '" min="0" max="100000" step="50" value="' + r.valor + '" inputmode="numeric" aria-label="' + lab + ': ' + esc(r.funcao) + '"><span class="roi-prefix">/mês</span></div>' +
      (r.tipo === 'clt' ? '<span class="mc-real">salário base · com encargos ≈ <strong id="mcR-' + r.id + '"></strong>/mês</span>' : '<span class="mc-real">mensalidade · sem encargos</span>') +
      (r.hint ? '<span class="mc-hint">' + esc(r.hint) + '</span>' : '') +
      '</div></div></div></div>';
  }).join('');

  ROWS.forEach(function (r) {
    r.el = rowsEl.querySelector('[data-row="' + r.id + '"]');
    r.sw = r.el.querySelector('.mc-switch');
    r.inp = $('mcV-' + r.id);
    r.qtyEl = $('mcQ-' + r.id);
    r.real = $('mcR-' + r.id);
    r.sw.addEventListener('click', function () { r.on = !r.on; r.sw.setAttribute('aria-checked', r.on); recompute(); });
    r.inp.addEventListener('input', recompute);
    if (r.qtyEl) r.qtyEl.addEventListener('input', recompute);
  });

  var planBtns = [].slice.call(root.querySelectorAll('.mc-plan'));
  planBtns.forEach(function (b, i) {
    b.addEventListener('click', function () { state.plan = i; recompute(); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      state.plan = (i + d + PLANS.length) % PLANS.length;
      recompute(); planBtns[state.plan].focus();
    });
  });
  $('mcMidia').addEventListener('input', recompute);

  // ---------- contador animado ----------
  var cur = {};
  function tween(id, to, f) {
    var el = $(id); if (!el) return;
    f = f || brl;
    var from = cur[id];
    cur[id] = to;
    if (reduce || from === undefined || from === to) { el.textContent = f(to); return; }
    var t0 = performance.now(), token = (el._mcT = (el._mcT || 0) + 1);
    (function step(now) {
      if (el._mcT !== token) return;
      var k = Math.min(1, Math.max(0, (now - t0) / 520)), e = 1 - Math.pow(1 - k, 3);
      el.textContent = f(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------- cálculo ----------
  function recompute() {
    var plan = PLANS[state.plan], mensalMercado = 0, bd = [];
    planBtns.forEach(function (b, i) { b.setAttribute('aria-checked', i === state.plan); b.tabIndex = i === state.plan ? 0 : -1; });

    ROWS.forEach(function (r) {
      var inPlan = r.nivel <= state.plan;
      r.el.classList.toggle('is-out', !inPlan);
      r.el.classList.toggle('is-off', !r.on);
      if (inPlan) r.el.removeAttribute('inert'); else r.el.setAttribute('inert', '');
      var base = num(r.inp);
      var unit = Math.round(r.tipo === 'clt' ? base * CLT : base); // custo mensal por unidade
      if (r.real) r.real.textContent = brl(unit);
      if (!inPlan || !r.on) return;
      var n = r.qtyEl ? Math.round(num(r.qtyEl)) : 1;
      var mes = unit * n;
      if (mes <= 0) return;
      mensalMercado += mes;
      bd.push('<li><span>' + esc(r.funcao) + (r.qtyEl ? ' ×' + n : '') + '</span><span>' + brl(mes * 12) + '</span></li>');
    });

    var anualMercado = mensalMercado * 12;
    var maiaRec = plan.mensal * 12;
    var maiaAno1 = plan.setup + maiaRec;
    var eco1 = anualMercado - maiaAno1;
    var eco2 = anualMercado - maiaRec;
    var folga = mensalMercado - plan.mensal;

    $('mcBd').innerHTML = bd.length ? bd.join('') : '<li class="mc-bd-empty"><span>Nenhuma função ligada</span><span>R$ 0</span></li>';
    tween('mcMercado', anualMercado);
    tween('mcMaia', maiaAno1);
    [].forEach.call(root.querySelectorAll('[data-plan-name]'), function (el) { el.textContent = plan.nome; });
    $('mcSetup').textContent = brl(plan.setup);
    $('mcRec').textContent = brl(maiaRec);
    $('mcMensal').textContent = brl(plan.mensal);

    var neg = eco1 < 0;
    $('mcSav').classList.toggle('is-neg', neg);
    $('mcEcoLabel').textContent = neg ? 'No 1º ano a MAIA custa a mais' : 'Economia estimada no 1º ano';
    tween('mcEco1', Math.abs(eco1));
    $('mcEco2Label').textContent = eco2 < 0 ? 'A partir do 2º ano, a MAIA custa a mais:' : 'A partir do 2º ano (só a mensalidade):';
    tween('mcEco2', Math.abs(eco2), function (v) { return brl(v) + '/ano'; });
    $('mcPayback').textContent = folga <= 0 ? 'não se paga com esta estrutura'
      : (plan.setup / folga < 1 ? 'menos de 1 mês' : (plan.setup / folga).toFixed(1).replace('.', ',') + ' meses');

    tween('mcMidiaAno', num($('mcMidia')) * 12);

    var cta = $('mcCta');
    cta.textContent = 'Quero a MAIA ' + plan.nome;
    cta.href = 'https://wa.me/5586981141438?text=' + encodeURIComponent('Olá Salatiel, rodei a calculadora de ROI e quero conversar sobre a MAIA ' + plan.nome);
  }
  recompute();
})();
