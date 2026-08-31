/* LCA Calculator — Jiang Lab */

(function () {
  'use strict';

  const totalEl   = document.getElementById('lca-total');
  const bdListEl  = document.getElementById('lca-breakdown');
  const formEl    = document.getElementById('lca-form');

  function buildUI() {
    /* Set meta labels */
    document.getElementById('lca-unit-label').textContent  = LCA_DATA.meta.unit;
    document.getElementById('lca-fu-label').textContent    = LCA_DATA.meta.functionalUnit;
    document.getElementById('lca-system-title').textContent = LCA_DATA.meta.title;

    LCA_DATA.categories.forEach(function (cat) {
      const group = document.createElement('div');
      group.className = 'lca-group';

      const hdr = document.createElement('div');
      hdr.className = 'lca-group-header';
      hdr.innerHTML = cat.name +
        '<span class="lca-group-sub">Category</span>';
      group.appendChild(hdr);

      cat.items.forEach(function (item) {
        const row = document.createElement('div');
        row.className = 'lca-row';

        const labelDiv = document.createElement('div');
        labelDiv.innerHTML =
          '<div class="lca-row-name">' + item.name + '</div>' +
          '<div class="lca-row-hint">' + item.hint + ' · factor: ' +
            item.factor + ' ' + item.factorUnit + '</div>';

        const inputWrap = document.createElement('div');
        inputWrap.className = 'lca-input-wrap';

        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'lca-input';
        inp.id = 'lca-' + item.id;
        inp.min = '0';
        inp.step = 'any';
        inp.value = '';
        inp.placeholder = '0';
        inp.setAttribute('data-id', item.id);
        inp.setAttribute('data-factor', item.factor);
        inp.setAttribute('data-category', cat.name);
        inp.setAttribute('data-name', item.name);
        inp.addEventListener('input', recalculate);

        const unitSpan = document.createElement('span');
        unitSpan.className = 'lca-unit-label';
        unitSpan.textContent = item.unit;

        inputWrap.appendChild(inp);
        inputWrap.appendChild(unitSpan);

        row.appendChild(labelDiv);
        row.appendChild(inputWrap);
        group.appendChild(row);
      });

      formEl.appendChild(group);
    });
  }

  function recalculate() {
    const inputs = formEl.querySelectorAll('.lca-input');
    let total = 0;
    const rows = [];

    inputs.forEach(function (inp) {
      const val    = parseFloat(inp.value) || 0;
      const factor = parseFloat(inp.getAttribute('data-factor'));
      const contrib = val * factor;
      total += contrib;
      if (contrib > 0) {
        rows.push({
          name:   inp.getAttribute('data-name'),
          value:  contrib
        });
      }
    });

    totalEl.textContent = total.toFixed(4);

    bdListEl.innerHTML = '';
    if (rows.length === 0) {
      bdListEl.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Enter values above to see breakdown.</div>';
      return;
    }

    rows.sort(function (a, b) { return b.value - a.value; });
    rows.forEach(function (r) {
      const pct = total > 0 ? ((r.value / total) * 100).toFixed(1) : '0.0';
      const div = document.createElement('div');
      div.className = 'lca-bd-row';
      div.innerHTML =
        '<span class="lca-bd-name">' + r.name + '</span>' +
        '<span class="lca-bd-val">' + r.value.toFixed(4) + ' <span style="color:var(--text-3);font-size:10px">(' + pct + '%)</span></span>';
      bdListEl.appendChild(div);
    });
  }

  function resetAll() {
    formEl.querySelectorAll('.lca-input').forEach(function (inp) {
      inp.value = '';
    });
    totalEl.textContent = '0.0000';
    bdListEl.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:8px 0;">Enter values above to see breakdown.</div>';
  }

  document.getElementById('lca-reset-btn').addEventListener('click', resetAll);

  buildUI();
  recalculate();
}());
