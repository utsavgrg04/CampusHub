const filterState = { query: '', type: '', location: '', sort: 'date', free: false, from: '', to: '' };
let controller;

const icon = (name) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    place: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    date: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    distance: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18m0-18a15 15 0 0 0 0 18"/>',
    tune: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

const art = `<svg class="radar-campus-art" viewBox="0 0 900 210" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <path fill="#fff" opacity=".75" d="M90 76q25-38 50 0 26-35 52 1H90m168-34q18-29 38 0 22-27 42 1h-80m375 35q20-32 42 0 23-29 43 1h-85"/>
  <path fill="#e5efb6" d="M0 186q102-53 190 0t187-2q107-62 214 1t309-1v26H0z"/>
  <g fill="#72a9a0"><path d="M36 205q-22-81 8-135 34 61 13 135m84 0q-14-64 12-104 31 53 14 104m496 0q-19-74 11-120 32 60 14 120m87 0q-12-63 16-101 31 56 14 101m91 0q-23-83 10-140 39 70 16 140"/><path d="M54 206V73m80 132V101m505 104V85m88 120V106m91 101V67" stroke="#478d8a" stroke-width="5"/></g>
  <g transform="translate(430 38)"><path fill="#9fc7f5" d="M0 164V70h220v94zm-13-93 123-58L233 71z"/><path fill="#dceaff" d="M14 83h34v38H14zm55 0h32v38H69zm55 0h32v38h-32zm54 0h29v38h-29zM17 132h31v25H17zm53 0h32v25H70zm54 0h32v25h-32zm54 0h29v25h-29z"/><path fill="#fff" d="M93 164v-37q0-22 20-22t20 22v37z"/><circle cx="112" cy="53" r="11" fill="#72a4ea"/><path stroke="#78a8e9" stroke-width="5" d="M112 45V8h54l-54 18zM106 8h12"/><path fill="#92b9ee" d="M0 70h220v8H0z"/></g>
  <path fill="#fff" opacity=".65" d="M0 202q162-21 314 0t294 0q148-20 292 0v8H0z"/>
</svg>`;

function posterFor(event) {
  const text = `${event.title} ${event.cat}`.toLowerCase();
  if (/smart india|hackathon/.test(text)) return 'hackathon.svg';
  if (/ai|machine|robot|workshop/.test(text)) return 'robot.svg';
  if (/dtu|code|sprint/.test(text)) return 'code.svg';
  if (/startup|pitch|rocket/.test(text)) return 'startup.svg';
  if (/cyber|ctf|security/.test(text)) return 'cyber.svg';
  if (/art|cultural|music|club/.test(text)) return 'arts.svg';
  return 'code.svg';
}

function isRadarEvent(event) { return Boolean(event.hidden) || event.cat === 'Club'; }
function filteredEvents() {
  const query = filterState.query.trim().toLowerCase();
  return EV.filter(event => {
    if (!isRadarEvent(event)) return false;
    const text = [event.title, event.descr, event.dept, event.venue, event.cat].join(' ').toLowerCase();
    return (!query || text.includes(query))
      && (!filterState.type || event.cat === filterState.type)
      && (!filterState.location || event.venue === filterState.location)
      && (!filterState.free || Number(event.fee) === 0)
      && (!filterState.from || event.date >= filterState.from)
      && (!filterState.to || event.date <= filterState.to);
  }).sort((a, b) => filterState.sort === 'distance' ? dkm(a) - dkm(b)
    : filterState.sort === 'fee' ? Number(a.fee) - Number(b.fee)
      : a.date.localeCompare(b.date));
}

async function bookmarks() {
  return (await window.items('bookmark')).map(item => Number(item.eid));
}
function eventCard(event, registered, saved) {
  const id = Number(event.id);
  const fee = Number(event.fee) > 0 ? `₹${Number(event.fee).toLocaleString('en-IN')}` : 'Free';
  return `<article class="discover-event-card radar-event-card">
    <img class="event-poster" src="/assets/discover/${posterFor(event)}" alt="Illustration for ${esc(event.title)}">
    <div class="event-card-copy">
      <div class="event-card-top"><div class="event-tags"><span class="event-tag">${esc(event.cat)}</span><span class="event-tag radar-hidden-tag">hidden</span></div>
        <button class="bookmark-button ${saved.includes(id) ? 'saved' : ''}" type="button" data-bookmark="${id}" aria-label="${saved.includes(id) ? 'Remove bookmark' : 'Bookmark'} ${esc(event.title)}" aria-pressed="${saved.includes(id)}"><svg viewBox="0 0 24 24" fill="${saved.includes(id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/></svg></button>
      </div>
      <h2>${esc(event.title)}</h2><p class="event-description">${esc(event.descr)}</p>
      <p class="event-meta">${icon('date')}<span>${esc(event.date)}, ${esc(event.etime || 'Time not specified')}</span></p>
      <p class="event-meta">${icon('place')}<span>${esc(event.venue)}</span></p>
      <p class="event-meta event-distance">${icon('distance')}<span>${esc(dist(event))} <i>·</i> ${fee}</span></p>
      <div class="event-card-actions"><button type="button" class="register-button" data-register="${id}" ${registered.includes(id) ? 'disabled' : ''}>${registered.includes(id) ? 'Registered ✓' : 'Register'}</button><button type="button" class="map-button" data-map="${id}">${icon('place')}Map</button></div>
    </div>
  </article>`;
}

async function resultsMarkup() {
  const [registered] = await Promise.all([regIds()]);
  const events = filteredEvents();
  const saved = await bookmarks();
  return events.length ? events.map(event => eventCard(event, registered.map(Number), saved)).join('')
    : '<div class="discover-empty"><h2>No hidden events found</h2><p>Try another search or adjust your filters.</p></div>';
}

export function register(R, A) {
  R.radar = async () => {
    const events = EV.filter(isRadarEvent);
    const types = [...new Set(events.map(event => event.cat).filter(Boolean))].sort();
    const locations = [...new Set(events.map(event => event.venue).filter(Boolean))].sort();
    return `<div class="radar-page">
      <section class="radar-hero"><div class="radar-hero-copy"><span class="discover-eyebrow">Explore</span><h1>EventRadar</h1><p>Hidden events &amp; club activities across campus</p></div>${art}</section>
      <section class="radar-filters" aria-label="Filter hidden events"><div class="radar-filter-row">
        <label class="discover-search radar-search">${icon('search')}<input type="search" data-radar-search value="${esc(filterState.query)}" placeholder="Search events, clubs, topics..." aria-label="Search hidden events"></label>
        <label class="filter-select"><select data-radar-type aria-label="Event type"><option value="">All types</option>${types.map(type => `<option value="${esc(type)}" ${filterState.type === type ? 'selected' : ''}>${esc(type)}</option>`).join('')}</select></label>
        <label class="filter-select"><select data-radar-sort aria-label="Sort events"><option value="date" ${filterState.sort === 'date' ? 'selected' : ''}>Sort: date</option><option value="distance" ${filterState.sort === 'distance' ? 'selected' : ''}>Sort: distance</option><option value="fee" ${filterState.sort === 'fee' ? 'selected' : ''}>Sort: fee</option></select></label>
        <label class="filter-select location-select radar-location">${icon('place')}<select data-radar-location aria-label="Event location"><option value="">All locations</option>${locations.map(location => `<option value="${esc(location)}" ${filterState.location === location ? 'selected' : ''}>${esc(location)}</option>`).join('')}</select></label>
        <button class="advanced-filter-button radar-filter-toggle ${filterState.free || filterState.from || filterState.to ? 'active' : ''}" type="button" data-radar-toggle aria-label="Advanced filters" aria-expanded="false">${icon('tune')}</button>
      </div><div class="radar-advanced" data-radar-advanced hidden><label><input type="checkbox" data-radar-free ${filterState.free ? 'checked' : ''}><span>Free events</span></label><label>From<input type="date" data-radar-from value="${esc(filterState.from)}"></label><label>To<input type="date" data-radar-to value="${esc(filterState.to)}"></label></div></section>
      <section class="radar-results event-grid" data-radar-results aria-live="polite">${await resultsMarkup()}</section>
    </div>`;
  };

  A.radar = () => {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const main = document.querySelector('#main');
    if (!main) return;
    let timer;
    const update = async () => {
      const container = main.querySelector('[data-radar-results]');
      if (container) container.innerHTML = await resultsMarkup();
    };
    main.querySelector('[data-radar-search]')?.addEventListener('input', event => {
      filterState.query = event.target.value;
      clearTimeout(timer);
      timer = setTimeout(update, 160);
    }, { signal });
    main.addEventListener('change', event => {
      if (event.target.matches('[data-radar-type]')) filterState.type = event.target.value;
      else if (event.target.matches('[data-radar-location]')) filterState.location = event.target.value;
      else if (event.target.matches('[data-radar-sort]')) filterState.sort = event.target.value;
      else if (event.target.matches('[data-radar-free]')) filterState.free = event.target.checked;
      else if (event.target.matches('[data-radar-from]')) filterState.from = event.target.value;
      else if (event.target.matches('[data-radar-to]')) filterState.to = event.target.value;
      else return;
      main.querySelector('[data-radar-toggle]')?.classList.toggle('active', filterState.free || filterState.from || filterState.to);
      update();
    }, { signal });
    main.addEventListener('click', async event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-radar-toggle')) {
        const panel = main.querySelector('[data-radar-advanced]');
        panel.hidden = !panel.hidden;
        button.setAttribute('aria-expanded', String(!panel.hidden));
      } else if (button.hasAttribute('data-bookmark')) {
        const id = Number(button.dataset.bookmark), current = await window.items('bookmark');
        const saved = current.find(item => Number(item.eid) === id);
        if (saved) await window.api('items/' + saved.id, 'DELETE');
        else await window.add('bookmark', { eid: id });
        await update();} else if (button.hasAttribute('data-register')) window.regEv(Number(button.dataset.register));
      else if (button.hasAttribute('data-map')) location.hash = `#/map?e=${Number(button.dataset.map)}`;
    }, { signal });
  };
}
