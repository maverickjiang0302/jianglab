/* Catalyst LCA Calculator — Jiang Lab */

(function () {
  'use strict';

  const CP_WATER = 4.186;      // kJ/kg*K, universal constant (used as a proxy for gel/solid heat capacity)
  const LATENT_WATER = 2257;   // kJ/kg, universal constant (heat of vaporization)
  const DEFAULT_AMBIENT_C = 20;
  const DEFAULT_HEAT_EFF = 70;      // %, documented assumption (indirect industrial heating) — study's own calibrated value is in a reference file not provided
  const DEFAULT_ELEC_INTENSITY = 0.03; // kWh per MJ of process heat — illustrative auxiliary-electricity assumption (agitation/controls during heating), not sourced from GREET or the manuscript; editable

  const BATCH_VOLUME_M3 = 10;
  const BATCH_DENSITY_KG_PER_M3 = 1000; // nominal, documented assumption (water-like density) — for illustrative batch scale-up only
  const BATCH_MASS_KG = BATCH_VOLUME_M3 * BATCH_DENSITY_KG_PER_M3;

  // Standard atomic weights, g/mol (IUPAC)
  const MW_AL = 26.9815385;
  const MW_H  = 1.008;
  const MW_SI = 28.085;
  const MW_O2 = 2 * 15.999;

  /* kg Al per kg H-form framework H_x Al_x Si_(1-x) O2, x = 1/(1+Si/Al molar ratio). */
  function alWeightFraction(siAl) {
    const x = 1.0 / (1.0 + siAl);
    const denom = x * (MW_AL + MW_H) + (1 - x) * MW_SI + MW_O2;
    return (x * MW_AL) / denom;
  }

  const tabsEl   = document.getElementById('route-tabs');
  const panesEl  = document.getElementById('route-panes');
  const totalEl  = document.getElementById('cat-total');
  const benchmarkBadgeEl = document.getElementById('cat-benchmark-badge');
  const kpiEnergyEl  = document.getElementById('kpi-energy');
  const kpiReagentEl = document.getElementById('kpi-reagent');
  const kpiBenchmarkEl = document.getElementById('kpi-benchmark');
  const kpiAlEl = document.getElementById('kpi-al');

  const state = {};      // routeId -> { itemId -> quantity (per kg zeolite) }
  const siAlState = {};  // routeId -> Si/Al molar ratio (null if not entered)
  const tempState = {};  // routeId -> { cryst, calc, ambient, eff, elecIntensity }
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
      tempState[route.id] = { cryst: null, calc: null, ambient: DEFAULT_AMBIENT_C, eff: DEFAULT_HEAT_EFF, elecIntensity: DEFAULT_ELEC_INTENSITY };

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

      siAlState[route.id] = null;
      const sialCard = document.createElement('div');
      sialCard.className = 'sial-card';
      sialCard.innerHTML =
        '<label>Si/Al ratio in final product (molar)<input type="number" min="0.1" step="any" id="sial-' + route.id + '" placeholder="e.g. 12"></label>' +
        '<span class="sial-note">Used to convert the total impact to a kg-CO₂e-per-kg-framework-Al basis (H<sub>x</sub>Al<sub>x</sub>Si<sub>1-x</sub>O<sub>2</sub>, x = 1/(1+Si/Al)). Leave blank to skip.</span>';
      pane.appendChild(sialCard);
      sialCard.querySelector('input').addEventListener('input', function (e) {
        const v = parseFloat(e.target.value);
        siAlState[route.id] = (v && v > 0) ? v : null;
        recalc(route.id);
      });

      pane.appendChild(buildTempCard(route));

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
          if (item.derived) {
            const badge = document.createElement('span');
            badge.className = 'derived-badge';
            badge.id = 'qty-' + item.id;
            badge.textContent = '0.000 ' + item.unit;
            qtyTd.appendChild(badge);
          } else {
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
          }
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

      const batchCard = document.createElement('div');
      batchCard.className = 'batch-card';
      batchCard.innerHTML = 'Scaled to a <b>' + BATCH_VOLUME_M3 + ' m³</b> batch (≈' + BATCH_MASS_KG.toLocaleString() +
        ' kg zeolite, assuming a nominal ' + BATCH_DENSITY_KG_PER_M3 + ' kg/m³ batch density — an illustrative assumption, not process-specific): total impact ≈ <b id="batch-total-' + route.id + '">0</b> kg CO₂e per batch.';
      pane.appendChild(batchCard);

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

  function buildTempCard(route) {
    const wrap = document.createElement('div');
    wrap.className = 'temp-card';
    wrap.innerHTML =
      '<div class="temp-card-title">Process Temperatures → Electricity &amp; Natural Gas (auto-computed)</div>' +
      '<div class="temp-row">' +
        '<label>Crystallization temperature (°C)<input type="number" step="any" class="t-cryst" placeholder="e.g. 140"></label>' +
        '<label>Calcination temperature (°C)<input type="number" step="any" class="t-calc" placeholder="e.g. 550"></label>' +
      '</div>' +
      '<div class="temp-result">NG: <span class="t-ng-mj">0.000</span> MJ/kg &nbsp;•&nbsp; Electricity: <span class="t-elec-kwh">0.000</span> kWh/kg</div>' +
      '<div class="temp-assumptions-toggle">⚙ Assumptions ▾</div>' +
      '<div class="temp-assumptions-body">' +
        '<label>Ambient temp (°C)<input type="number" step="any" class="t-ambient" value="' + DEFAULT_AMBIENT_C + '"></label>' +
        '<label>Heating efficiency (%)<input type="number" min="1" max="100" step="any" class="t-eff" value="' + DEFAULT_HEAT_EFF + '"></label>' +
        '<label>Elec. intensity (kWh/MJ heat)<input type="number" min="0" step="any" class="t-elec-int" value="' + DEFAULT_ELEC_INTENSITY + '"></label>' +
      '</div>' +
      '<div style="font-size:9.5px;color:var(--ink3);margin-top:6px;">' +
        'NG: Q = mass·Cp·[(T<sub>cryst</sub>−T<sub>ambient</sub>) + (T<sub>calc</sub>−T<sub>ambient</sub>)] / efficiency, converted to MJ. ' +
        'Mass basis = sum of all reagent quantities entered below (kg per kg zeolite). Cp = ' + CP_WATER + ' kJ/kg·K (water, used as a proxy for the gel/solid mixture). ' +
        'Electricity = NG (MJ) × electricity intensity, an illustrative assumption for agitation/controls during heating — the source study models electricity from equipment size and duration, not temperature, and that calibration data was not available. ' +
        'Efficiency and electricity intensity are documented defaults, not the source study\'s own calibrated values — both are editable above.' +
      '</div>';

    const toggle = wrap.querySelector('.temp-assumptions-toggle');
    const body = wrap.querySelector('.temp-assumptions-body');
    toggle.addEventListener('click', function () {
      body.classList.toggle('open');
      toggle.textContent = '⚙ Assumptions ' + (body.classList.contains('open') ? '▴' : '▾');
    });

    function compute() {
      const t = tempState[route.id];
      t.cryst = parseFloat(wrap.querySelector('.t-cryst').value) || 0;
      t.calc = parseFloat(wrap.querySelector('.t-calc').value) || 0;
      t.ambient = parseFloat(wrap.querySelector('.t-ambient').value);
      if (isNaN(t.ambient)) t.ambient = DEFAULT_AMBIENT_C;
      t.eff = parseFloat(wrap.querySelector('.t-eff').value) || DEFAULT_HEAT_EFF;
      t.elecIntensity = parseFloat(wrap.querySelector('.t-elec-int').value);
      if (isNaN(t.elecIntensity)) t.elecIntensity = DEFAULT_ELEC_INTENSITY;

      const massBasis = sumMassBasis(route.id);
      const dT = Math.max(t.cryst - t.ambient, 0) + Math.max(t.calc - t.ambient, 0);
      const qKJ = (massBasis * CP_WATER * dT) / Math.max(t.eff / 100, 0.01);
      const ngMJ = Math.max(qKJ, 0) / 1000;
      const elecKWh = ngMJ * t.elecIntensity;

      wrap.querySelector('.t-ng-mj').textContent = ngMJ.toFixed(3);
      wrap.querySelector('.t-elec-kwh').textContent = elecKWh.toFixed(3);

      const elecItem = route.id + '_elec';
      const ngId = route.id + '_ng';
      state[route.id][ngId] = ngMJ;
      state[route.id][elecItem] = elecKWh;
      const ngBadge = document.getElementById('qty-' + ngId);
      const elecBadge = document.getElementById('qty-' + elecItem);
      if (ngBadge) ngBadge.textContent = ngMJ.toFixed(3) + ' MJ';
      if (elecBadge) elecBadge.textContent = elecKWh.toFixed(3) + ' kWh';

      recalc(route.id);
    }

    wrap.querySelectorAll('input').forEach(function (inp) { inp.addEventListener('input', compute); });
    return wrap;
  }

  /* Sum of all non-derived, kg-unit input quantities entered for a route — used as the heating mass basis. */
  function sumMassBasis(routeId) {
    const route = findRoute(routeId);
    let sum = 0;
    allItems(route).forEach(function (entry) {
      const item = entry.item;
      if (item.derived) return;
      if (item.unit !== 'kg') return;
      sum += state[routeId][item.id] || 0;
    });
    return sum;
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

    const batchEl = document.getElementById('batch-total-' + routeId);
    if (batchEl) batchEl.textContent = (total * BATCH_MASS_KG).toLocaleString(undefined, { maximumFractionDigits: 0 });

    renderTornado(routeId, total);

    if (routeId === activeRoute) {
      totalEl.textContent = total.toFixed(3);
      kpiEnergyEl.textContent = energyTotal.toFixed(3);
      kpiReagentEl.textContent = reagentTotal.toFixed(3);
      kpiBenchmarkEl.textContent = route.manuscriptBenchmark.toFixed(1);
      benchmarkBadgeEl.textContent = route.label;

      const siAl = siAlState[routeId];
      if (siAl) {
        const alFrac = alWeightFraction(siAl);
        kpiAlEl.textContent = (total / alFrac).toFixed(2);
      } else {
        kpiAlEl.textContent = '—';
      }
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
