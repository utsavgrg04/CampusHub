let activeFilter = 'all';
let activeSort = 'date-asc';
let controller;

const icon = (name, size = 20) => {
  const paths = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    place: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    more: '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
    cancel: '<path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    more: '<circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/>',
    arrow: '<path d="m7 10 5 5 5-5"/>',
    ticket: '<path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6z"/><path d="M12 8v2m0 2v2m0 2v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

function dateValue(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = dateValue(value);
  return date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
}

function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function statusOf(registration) {
  if (['cancelled', 'canceled'].includes(String(registration.status || '').toLowerCase())) return 'cancelled';
  return registration.date && registration.date < todayISO() ? 'past' : 'upcoming';
}

function campusArt() {
  return `<svg class="registration-hero-art" viewBox="0 0 820 190" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <path fill="#fff" opacity=".75" d="M38 60q20-32 44 0 23-28 45 0H38m228-34q18-28 40 0 22-26 42 0h-82m350 41q21-34 44 0 24-30 45 0h-89"/>
    <path fill="#e5efb5" d="M0 165q108-54 205 0t195-2q100-52 204 2t216-1v26H0z"/>
    <g fill="#70aaa1"><path d="M52 190q-17-67 10-111 28 51 13 111m66 0q-13-53 12-89 25 46 13 89m460 0q-15-69 12-111 30 55 13 111m74 0q-12-55 15-91 25 49 12 91m72 0q-19-78 10-131 35 65 15 131"/><path d="M63 190V81m67 109V99m474 91V78m73 112V101m68 89V60" stroke="#478f8a" stroke-width="4"/></g>
    <g transform="translate(350 37)"><path fill="#94b9ed" d="M0 153V61h213v92zm-15-92L106 8l121 53z"/><path fill="#e2edff" d="M15 74h30v34H15zm49 0h31v34H64zm52 0h31v34h-31zm51 0h29v34h-29zM17 120h28v25H17zm47 0h31v25H64zm52 0h31v25h-31zm51 0h29v25h-29z"/><path fill="#fff" d="M89 153v-35q0-20 18-20t18 20v35z"/><path fill="#fff" d="M90 64V27h5v37m0-36h47L95 47z"/><circle cx="106" cy="57" r="8" fill="#6d9fe7"/></g>
    <g fill="#91b4e9"><path d="M685 190q-12-69 12-105 27 50 12 105m80 0q-8-76 18-131 31 64 15 131"/><path d="M696 190V91m92 99V61" stroke="#567fb8" stroke-width="4"/></g>
  </svg>`;
}

function registrationCard(item) {
  const status = statusOf(item), event = item.event;
  const date = formatDate(item.date);
  const category = 'Registration';
  return `<article class="registration-card" data-registration="${item.id}">
    <span class="registration-event-icon">${icon('calendar', 29)}<i>${icon('ticket', 16)}</i></span>
    <div class="registration-info"><h2>${esc(item.title || event?.title || 'Event')}</h2><div class="registration-meta">${date ? `<span>${icon('calendar', 17)}${esc(date)}</span>` : ''}${item.venue ? `<span>${icon('place', 17)}${esc(item.venue)}</span>` : ''}</div><span class="registration-category">${esc(category)}</span></div>
    <div class="registration-actions"><div class="registration-status-row"><span class="registration-status ${status}"><i></i>${status === 'cancelled' ? 'Cancelled' : status === 'past' ? 'Completed' : 'Registered'}</span><span class="registration-more" aria-hidden="true">${icon('more', 17)}</span></div>${status !== 'cancelled' ? `<button type="button" class="registration-cancel" data-cancel-registration="${item.id}">${icon('cancel', 18)}<span>Cancel registration</span></button>` : ''}</div>
  </article>`;
}

function emptyState(filter) {
  const copy = filter === 'upcoming' ? ['No upcoming registrations', 'New events you register for will appear here.']
    : filter === 'past' ? ['No past registrations', 'Completed events will appear here.']
      : filter === 'cancelled' ? ['No cancelled registrations', 'Cancelled event registrations will appear here.']
        : ['No registrations yet', 'Discover campus events and register to see them here.'];
  return `<div class="registration-empty"><span>${icon('ticket', 30)}</span><h2>${copy[0]}</h2><p>${copy[1]}</p><a href="#/discover">Explore events</a></div>`;
}

export function register(R, A) {
  R.reg = async () => {
    const records = await items('reg');
    const registrations = records.map(record => {
      const event = EV.find(item => Number(item.id) === Number(record.eid));
      return { ...record, event, title: record.title || event?.title || '', date: record.date || event?.date || '', venue: record.venue || event?.venue || '', cat: record.cat || event?.cat || '' };
    });
    registrations.sort((a, b) => {
      const result = (a.date || '').localeCompare(b.date || '');
      return activeSort === 'date-desc' ? -result : activeSort === 'name' ? (a.title || '').localeCompare(b.title || '') : result;
    });
    const counts = {
      all: registrations.length,
      upcoming: registrations.filter(item => statusOf(item) === 'upcoming').length,
      past: registrations.filter(item => statusOf(item) === 'past').length,
      cancelled: registrations.filter(item => statusOf(item) === 'cancelled').length,
    };
    const visible = registrations.filter(item => activeFilter === 'all' || statusOf(item) === activeFilter);
    const filters = [['all', 'All'], ['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']];
    return `<div class="registration-page">
      <section class="registration-hero"><div><h1>My registrations</h1><p>All the events and activities you have signed up for, in one place.</p></div>${campusArt()}</section>
      <section class="registration-content"><div class="registration-toolbar"><nav class="registration-filters" aria-label="Filter registrations">${filters.map(([key, label]) => `<button type="button" data-registration-filter="${key}" class="${activeFilter === key ? 'active' : ''}" aria-pressed="${activeFilter === key}">${label} <span>${counts[key]}</span></button>`).join('')}</nav><label class="registration-sort">${icon('arrow', 17)}<select data-registration-sort aria-label="Sort registrations"><option value="date-asc" ${activeSort === 'date-asc' ? 'selected' : ''}>Sort by: date</option><option value="date-desc" ${activeSort === 'date-desc' ? 'selected' : ''}>Sort by: newest</option><option value="name" ${activeSort === 'name' ? 'selected' : ''}>Sort by: name</option></select>${icon('arrow', 17)}</label></div>
        <div class="registration-list" aria-live="polite">${visible.length ? visible.map(registrationCard).join('') : emptyState(activeFilter)}</div>
      </section>
    </div>`;
  };

  A.reg = () => {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller, main = document.querySelector('#main');
    if (!main) return;
    main.addEventListener('click', async event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-registration-filter')) {
        activeFilter = button.dataset.registrationFilter;
        render();
      } else if (button.hasAttribute('data-cancel-registration')) {
        const id = Number(button.dataset.cancelRegistration);
        await window.cancelReg(id);
      }
    }, { signal });
    main.addEventListener('change', event => {
      if (!event.target.matches('[data-registration-sort]')) return;
      activeSort = event.target.value;
      render();
    }, { signal });
  };
}
