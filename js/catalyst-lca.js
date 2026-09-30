/* Catalyst LCA Calculator — Jiang Lab */

(function () {
  'use strict';

  const CP_WATER = 4.186;      // kJ/kg*K, universal constant
  const LATENT_WATER = 2257;   // kJ/kg, universal constant (heat of vaporization)
  const DEFAULT_HEAT_EFF = 70; // %, documented assumption (indirect industrial heating) — study's own value is in a reference file not provided

  const tabsEl   = document.getElementById('route-tabs');
  const panesEl  = document.getElementById('route-panes');
  const totalEl  = document.getElementById('cat-total');
  const benchmarkBadgeEl = document.getElementById('cat-benchmark-badge');
  const kpiEnergyEl  = document.getElementById('kpi-energy');
  const kpiReagentEl = document.getElementById('kpi-reagent');
  const kpiBenchmarkEl = document.getElementById('kpi-benchmark');

  const state = {}; // routeId -> { itemId -> quantity }
  let activeRoute = CATALYST_LCA_DATA.routes[0].id;

  function sourceClass(source) {
    if (source === 'GREET') return 'greet';
    if (source === 'GREET+IPCC') return 'mixed';
    return 'manuscript';
  }

  function allItems(route) {
    const out = [];
    route.sections.forEach(function (section) {
      section.items.forEach(function (item) { out.push({ item: item, section: section.name }); });
    });
    return out;
  }

  function buildUI() {
    CATALYST_LCA_DATA.routes.forEach(function (route, idx) {
      state[route.id] = {};
      route.sections.forEach(function (section) {
        section.items.forEach(function (item) {
          state[route.id][item.id] = item.defaultQty || 0;
        });
      });

      const tab = document.createElement('button');
      tab.className = 'workspace-tab' + (idx === 0 ? ' active' : '');
      tab.textContent = route.label;
      tab.setAttribute('data-route', route.id);
      tab.addEventListener('click', function () { setActiveRoute(route.id); });
      tabsEl.appendChild(tab);

      const pane = document.createElement('div');
      pane.className = 'workspace-pane' + (idx === 0 ? ' active' : '');
      pane.id = 'pane-' + route.id;

      const note = document.createElement('div');
      note.className = 'scenario-note';
      note.innerHTML = '<b>' + route.label + '.</b> ' + route.description +
        ' Manuscript-reported cradle-to-gate result for this route: <b>' + route.manuscriptBenchmark + ' kg CO₂e/kg</b>.';
      pane.appendChild(note);

      route.sections.forEach(function (section) {
        const label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = section.name;
        pane.appendChild(label);

        const card = document.createElement('div');
        card.className = 'card';
        const table = document.createElement('table');
        table.className = 'ss-table';
        table.innerHTML = '<thead><tr><th>Input</th><th class="r">Quantity</th><th class="r">Factor</th><th class="r">Contribution</th></tr></thead>';
        const tbody = document.createElement('tbody');

        section.items.forEach(function (item) {
          const tr = document.createElement('tr');

          const nameTd = document.createElement('td');
          nameTd.innerHTML = item.label +
            '<span class="source-ref ' + sourceClass(item.source) + '">' + item.source + '</span>' +
            '<div style="font-size:9.5px;color:var(--ink3);margin-top:2px;">' + item.note + '</div>';
          tr.appendChild(nameTd);

          const qtyTd = document.createElement('td');
          qtyTd.className = 'r';
          const wrap = document.createElement('div');
          wrap.className = 'input-cell';
          const inp = document.createElement('input');
          inp.type = 'number';
          inp.min = '0';
          inp.step = 'any';
          inp.value = item.defaultQty || '';
          inp.placeholder = '0';
          inp.id = 'qty-' + item.id;
          inp.addEventListener('input', function () {
            state[route.id][item.id] = parseFloat(inp.value) || 0;
            recalc(route.id);
          });
          wrap.appendChild(inp);
          const unitSpan = document.createElement('span');
          unitSpan.style.marginLeft = '5px';
          unitSpan.style.fontSize = '9.5px';
          unitSpan.textContent = item.unit;
          wrap.appendChild(unitSpan);
          qtyTd.appendChild(wrap);
          tr.appendChild(qtyTd);

          const factorTd = document.createElement('td');
          factorTd.className = 'r';
          factorTd.textContent = item.factor + ' /' + item.unit;
          tr.appendChild(factorTd);

          const contribTd = document.createElement('td');
          contribTd.className = 'r';
          const outSpan = document.createElement('span');
          outSpan.className = 'output-cell';
          outSpan.id = 'out-' + item.id;
          outSpan.textContent = '0.000';
          contribTd.appendChild(outSpan);
          tr.appendChild(contribTd);

          tbody.appendChild(tr);

          if (item.heatHelper) {
            const helperTr = document.createElement('tr');
            const helperTd = document.createElement('td');
            helperTd.colSpan = 4;
            helperTd.style.padding = '0';
            helperTd.appendChild(buildHeatHelper(route.id, item.id));
            helperTr.appendChild(helperTd);
            tbody.appendChild(helperTr);
          }
        });

        table.appendChild(tbody);
        card.appendChild(table);
        pane.appendChild(card);
      });

      const totalCard = document.createElement('div');
      totalCard.className = 'card';
      const totalTable = document.createElement('table');
      totalTable.className = 'ss-table';
      totalTable.innerHTML = '<tbody><tr class="row-total"><td>Route Total</td><td class="r"></td><td class="r"></td>' +
        '<td class="r"><span class="output-cell" id="route-total-' + route.id + '">0.000</span></td></tr></tbody>';
      totalCard.appendChild(totalTable);
      pane.appendChild(totalCard);

      const sensCard = document.createElement('div');
      sensCard.className = 'sens-card';
      sensCard.innerHTML =
        '<div class="sens-title">Sensitivity Analysis</div>' +
        '<div class="sens-sub">One-at-a-time: each input varied ±10% of its current value, others held fixed. Only inputs with a non-zero quantity are shown.</div>' +
        '<div id="tornado-' + route.id + '"></div>';
      pane.appendChild(sensCard);

      panesEl.appendChild(pane);
    });
  }

  function buildHeatHelper(routeId, ngItemId) {
    const wrap = document.createElement('div');
    wrap.className = 'heat-helper';

    const toggle = document.createElement('div');
    toggle.className = 'heat-helper-toggle';
    toggle.textContent = '⚙ Compute from water content & temperature ▾';
    wrap.appendChild(toggle);

    const body = document.createElement('div');
    body.className = 'heat-helper-body';
    body.innerHTML =
      '<label>Water heated (kg)<input type="number" min="0" step="any" class="hh-water" placeholder="0"></label>' +
      '<label>Start temp (°C)<input type="number" step="any" class="hh-t0" placeholder="20"></label>' +
      '<label>End temp (°C)<input type="number" step="any" class="hh-t1" placeholder="100"></label>' +
      '<label>Water evaporated (kg)<input type="number" min="0" step="any" class="hh-evap" placeholder="0"></label>' +
      '<label>Heating efficiency (%)<input type="number" min="1" max="100" step="any" class="hh-eff" value="' + DEFAULT_HEAT_EFF + '"></label>' +
      '<div class="heat-helper-result">Computed: <span class="hh-mj">0.000</span> MJ — <span style="color:var(--ink3);font-weight:400;">Q = (m·Cp·ΔT + m_evap·L_v) / efficiency; Cp = ' + CP_WATER + ' kJ/kg·K, L_v = ' + LATENT_WATER + ' kJ/kg (universal constants). Efficiency is a documented default, not the source study\'s own calibrated value.</span></div>';
    wrap.appendChild(body);

    toggle.addEventListener('click', function () {
      body.classList.toggle('open');
      toggle.textContent = '⚙ Compute from water content & temperature ' + (body.classList.contains('open') ? '▴' : '▾');
    });

    function compute() {
      const m = parseFloat(body.querySelector('.hh-water').value) || 0;
      const t0 = parseFloat(body.querySelector('.hh-t0').value) || 0;
      const t1 = parseFloat(body.querySelector('.hh-t1').value) || 0;
      const evap = parseFloat(body.querySelector('.hh-evap').value) || 0;
      const eff = (parseFloat(body.querySelector('.hh-eff').value) || DEFAULT_HEAT_EFF) / 100;
      const qKJ = (m * CP_WATER * (t1 - t0) + evap * LATENT_WATER) / Math.max(eff, 0.01);
      const qMJ = Math.max(qKJ, 0) / 1000;
      body.querySelector('.hh-mj').textContent = qMJ.toFixed(3);
      const qtyInput = document.getElementById('qty-' + ngItemId);
      qtyInput.value = qMJ.toFixed(3);
      state[routeId][ngItemId] = qMJ;
      recalc(routeId);
    }

    body.querySelectorAll('input').forEach(function (inp) { inp.addEventListener('input', compute); });

    return wrap;
  }

  function setActiveRoute(routeId) {
    activeRoute = routeId;
    document.querySelectorAll('.workspace-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-route') === routeId);
    });
    document.querySelectorAll('.workspace-pane').forEach(function (p) {
      p.classList.toggle('active', p.id === 'pane-' + routeId);
    });
    recalc(routeId);
  }

  function findRoute(routeId) {
    return CATALYST_LCA_DATA.routes.filter(function (r) { return r.id === routeId; })[0];
  }

  function recalc(routeId) {
    const route = findRoute(routeId);
    let total = 0;
    let energyTotal = 0;
    let reagentTotal = 0;

    route.sections.forEach(function (section) {
      section.items.forEach(function (item) {
        const qty = state[routeId][item.id] || 0;
        const contrib = qty * item.factor;
        total += contrib;
        if (section.name === 'Energy') { energyTotal += contrib; } else { reagentTotal += contrib; }
        const el = document.getElementById('out-' + item.id);
        if (el) el.textContent = contrib.toFixed(3);
      });
    });

    const totalEl2 = document.getElementById('route-total-' + routeId);
    if (totalEl2) totalEl2.textContent = total.toFixed(3);

    renderTornado(routeId, total);

    if (routeId === activeRoute) {
      totalEl.textContent = total.toFixed(3);
      kpiEnergyEl.textContent = energyTotal.toFixed(3);
      kpiReagentEl.textContent = reagentTotal.toFixed(3);
      kpiBenchmarkEl.textContent = route.manuscriptBenchmark.toFixed(1);
      benchmarkBadgeEl.textContent = route.label;
    }
  }

  function renderTornado(routeId, baseline) {
    const container = document.getElementById('tornado-' + routeId);
    if (!container) return;
    const route = findRoute(routeId);

    const rows = [];
    allItems(route).forEach(function (entry) {
      const item = entry.item;
      const qty = state[routeId][item.id] || 0;
      if (!qty) return;
      const delta = 0.1 * qty * item.factor;
      const low = baseline - delta;
      const high = baseline + delta;
      rows.push({ label: item.label, low: Math.min(low, high), high: Math.max(low, high), range: Math.abs(high - low) });
    });

    if (rows.length === 0) {
      container.innerHTML = '<div class="sens-empty">Enter at least one non-zero quantity to see its sensitivity.</div>';
      return;
    }

    rows.sort(function (a, b) { return b.range - a.range; });

    const globalMin = Math.min.apply(null, rows.map(function (r) { return r.low; }).concat([baseline]));
    const globalMax = Math.max.apply(null, rows.map(function (r) { return r.high; }).concat([baseline]));
    const span = Math.max(globalMax - globalMin, 1e-9);
    const pad = span * 0.05;
    const scaleMin = globalMin - pad;
    const scaleMax = globalMax + pad;
    const scaleSpan = scaleMax - scaleMin;

    function pct(v) { return ((v - scaleMin) / scaleSpan) * 100; }

    let html = '';
    rows.forEach(function (r) {
      const basePct = pct(baseline);
      const lowPct = pct(r.low);
      const highPct = pct(r.high);
      html += '<div class="tornado-row">' +
        '<div class="tornado-label">' + r.label + '</div>' +
        '<div class="tornado-track">' +
          '<div class="tornado-bar low" style="left:' + lowPct + '%; width:' + (basePct - lowPct) + '%;"></div>' +
          '<div class="tornado-bar high" style="left:' + basePct + '%; width:' + (highPct - basePct) + '%;"></div>' +
          '<div class="tornado-baseline" style="left:' + basePct + '%;"></div>' +
        '</div>' +
      '</div>';
    });
    html += '<div class="tornado-axis"><span>' + scaleMin.toFixed(2) + '</span><span>baseline ' + baseline.toFixed(3) + '</span><span>' + scaleMax.toFixed(2) + '</span></div>';
    html += '<div class="tornado-legend">' +
      '<span><i style="background:#f0997b;"></i>−10% of input</span>' +
      '<span><i style="background:#5dcaa5;"></i>+10% of input</span>' +
      '<span>Total impact, kg CO₂e/kg zeolite</span>' +
    '</div>';
    container.innerHTML = html;
  }

  function resetAll() {
    panesEl.innerHTML = '';
    tabsEl.innerHTML = '';
    buildUI();
    setActiveRoute(CATALYST_LCA_DATA.routes[0].id);
  }

  window.resetAll = resetAll;

  buildUI();
  CATALYST_LCA_DATA.routes.forEach(function (route) { recalc(route.id); });
  setActiveRoute(activeRoute);
}());
