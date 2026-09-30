/* Catalyst LCA Calculator — Jiang Lab */

(function () {
  'use strict';

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

      panesEl.appendChild(pane);
    });
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

    if (routeId === activeRoute) {
      totalEl.textContent = total.toFixed(3);
      kpiEnergyEl.textContent = energyTotal.toFixed(3);
      kpiReagentEl.textContent = reagentTotal.toFixed(3);
      kpiBenchmarkEl.textContent = route.manuscriptBenchmark.toFixed(1);
      benchmarkBadgeEl.textContent = route.label;
    }
  }

  function resetAll() {
    CATALYST_LCA_DATA.routes.forEach(function (route) {
      route.sections.forEach(function (section) {
        section.items.forEach(function (item) {
          state[route.id][item.id] = item.defaultQty || 0;
        });
      });
    });
    document.querySelectorAll('.input-cell input').forEach(function (inp, i) {
      // rebuild inputs from data order
    });
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
