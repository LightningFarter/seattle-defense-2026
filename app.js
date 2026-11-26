const data = globalThis.SEA_DEFENSE;
const $ = id => document.getElementById(id);
const game = $('week'), type = $('kind'), order = $('order');
const bands = ['1–3 yards', '4–7 yards', '8+ yards'];
const downs = ['1st', '2nd', '3rd', '4th'];
const signed = value => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
let cell = null;

function make(tag, content) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  return node;
}

for (const week of data.weeks) {
  const play = data.plays.find(row => row[0] === week);
  const option = make('option', `Week ${week} · ${play[5]}`);
  option.value = week;
  game.append(option);
}

function render() {
  const week = game.value;
  const kind = type.value;
  const plays = data.plays.filter(row => (week === 'all' || row[0] === +week) && (kind === 'all' || row[3] === kind));
  const league = data.comparison.filter(row => (week === 'all' || row[0] === +week) && (kind === 'all' || row[3] === kind));
  const avg = rows => rows.length ? rows.reduce((sum, row) => sum + row[4], 0) / rows.length : null;
  function comparison(rows) {
    const [count, total] = rows.reduce(([n, sum], row) => [n + row[4], sum + row[5]], [0, 0]);
    return count ? total / count : null;
  }
  const formatted = value => value === null ? '—' : signed(value);
  $('snaps').textContent = plays.length;
  $('sea').textContent = formatted(avg(plays));
  $('league').textContent = formatted(comparison(league));
  const table = $('matrix');
  table.querySelectorAll('thead,tbody').forEach(node => node.remove());
  const head = table.createTHead().insertRow();
  for (const label of ['Down', ...bands]) {
    const th = make('th', label);
    th.scope = 'col';
    head.append(th);
  }
  const body = table.createTBody();
  downs.forEach((down, index) => {
    const tr = body.insertRow();
    const th = make('th', down);
    th.scope = 'row';
    tr.append(th);
    bands.forEach((band, bucket) => {
      const downNumber = index + 1;
      const matching = plays.filter(row => row[1] === downNumber && row[2] === bucket);
      const baseline = comparison(league.filter(row => row[1] === downNumber && row[2] === bucket));
      const delta = matching.length && baseline !== null ? avg(matching) - baseline : null;
      const td = tr.insertCell();
      if (delta !== null && Math.abs(delta) >= .05) td.className = delta < 0 ? 'good' : 'bad';
      const button = make('button');
      button.append(make('b', formatted(delta)), make('small', `${matching.length} snaps`));
      button.disabled = matching.length === 0;
      button.setAttribute('aria-label', `${down}, ${band}, difference ${formatted(delta)}, ${matching.length} snaps`);
      button.setAttribute('aria-pressed', String(cell?.[0] === downNumber && cell?.[1] === bucket));
      button.onclick = () => {
        cell = cell?.[0] === downNumber && cell?.[1] === bucket ? null : [downNumber, bucket];
        render();
        table.rows[downNumber].cells[bucket + 1].firstChild.focus();
      };
      td.append(button);
    });
  });
  $('review').textContent = cell ? `${downs[cell[0] - 1]} down · ${bands[cell[1]]}` : 'Seattle snaps';
  $('reset').hidden = !cell;
  const results = cell ? plays.filter(row => row[1] === cell[0] && row[2] === cell[1]) : plays;
  results.sort((a, b) => order.value === 'defense' ? a[4] - b[4] : order.value === 'offense' ? b[4] - a[4] : Math.abs(b[4]) - Math.abs(a[4]));
  $('sample').textContent = `Showing ${Math.min(results.length, 8)} of ${results.length} snaps`;
  $('plays').replaceChildren(...results.slice(0, 8).map(row => {
    const li = make('li');
    li.append(make('strong', `WK ${row[0]} vs ${row[5]} · ${downs[row[1] - 1]} & ${row[7]} · ${signed(row[4])} EPA`), document.createTextNode(row[8]));
    return li;
  }));
  renderDrives(week);
}

function renderDrives(week) {
  const table = $('drive-matrix');
  const start = $('transition').value;
  const selected = flag => start === 'all' || flag === (start === 'turnover');
  const groups = ['Own 1–25', 'Own 26–49', 'Midfield or better'];
  const rows = groups.map((label, group) => {
    const sea = data.drives.filter(row => selected(row[5]) && row[1] === group && (week === 'all' || row[0] === +week));
    const league = data.drive_comparison.filter(row => selected(row[2]) && row[1] === group && (week === 'all' || row[0] === +week));
    const points = sea.reduce((sum, row) => sum + row[2], 0);
    const [n, p] = league.reduce(([count, score], row) => [count + row[3], score + row[4]], [0, 0]);
    const tr = make('tr');
    const title = make('th', label);
    title.scope = 'row';
    tr.append(title, make('td', `${sea.length}`), make('td', sea.length ? (points / sea.length).toFixed(2) : '—'), make('td', n ? `${(p / n).toFixed(2)} (${n})` : '—'));
    return tr;
  });
  table.tBodies[0].replaceChildren(...rows);
}

for (const filter of [game, type]) filter.onchange = () => { cell = null; render(); };
order.onchange = render;
$('transition').onchange = () => renderDrives(game.value);
$('reset').onclick = () => { cell = null; render(); game.focus(); };
$('coverage').textContent = `${data.weeks.length} Seattle games in this snapshot, latest dated ${data.latest_seattle_game}.`;
render();
