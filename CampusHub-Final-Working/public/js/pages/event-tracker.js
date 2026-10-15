let controller;

const icon = (name, size = 22) => {
  const paths = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m8 15 2 2 5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    place: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    distance: '<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
    cancel: '<path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    ticket: '<path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6z"/><path d="M12 8v2m0 2v2m0 2v1"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countdown(value) {
  const date = parseDate(value);
  if (!date) return '';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((date - now) / 86400000);
  if (days < 0) return 'Event completed';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

function displayDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
}

function displayTime(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return String(value);
  let hour = Number(match[1]);
  if (match[3]) hour = (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return new Date(2000, 0, 1, hour, Number(match[2])).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function heroArt() {
  return `<svg class="tracker-hero-art" viewBox="0 0 850 190" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <path fill="#fff" opacity=".78" d="M75 68q22-38 48 0 26-34 54 0H75m210-24q18-31 42 0 25-29 48 0h-90m330 27q21-35 47 0 26-31 50 0h-97m99-21q19-31 42 0 24-28 46 0h-88"/>
    <path fill="#e5efb5" d="M0 162q112-49 218 0t211 0q108-48 216 0t205 0v28H0z"/>
    <g fill="#77aaa3"><path d="M60 190q-18-69 11-118 31 59 13 118m75 0q-16-59 11-100 28 51 14 100m456 0q-18-78 12-125 32 60 14 125m77 0q-14-62 13-103 29 54 15 103m67 0q-18-88 12-145 38 72 15 145"/><path d="M72 190V74m70 116V94m467 96V68m75 122V91m66 99V48" stroke="#4c9690" stroke-width="4"/></g>
    <g transform="translate(364 28)"><path fill="#8eb6ed" d="M0 162V70h212v92zm-15-92L106 9 227 70z"/><path fill="#e8f1ff" d="M16 81h29v33H16zm49 0h30v33H65zm51 0h30v33h-30zm51 0h29v33h-29zM17 126h28v27H17zm47 0h31v27H64zm52 0h31v27h-31zm51 0h29v27h-29z"/><path fill="#fff" d="M89 162v-39q0-20 18-20t18 20v39z"/><circle cx="106" cy="64" r="9" fill="#6698df"/><path fill="#fff" d="M104 63h4v3h-4z"/><path fill="#8eb6ed" d="M105 24V3h5v21m0-20h41l-41 23z"/></g>
  </svg>`;
}

function flightArt() {
  return `<svg class="tracker-flight-art" viewBox="0 0 360 130" aria-hidden="true">
    <path d="M8 93c36-36 71 17 106-4 30-18 40-72 83-60 30 8 21 48 52 43 26-4 39-35 74-34" fill="none" stroke="#85b4ff" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 7"/>
    <path d="m321 23 30-10-18 26-5-9-11 7 4-13z" fill="#78aaff" stroke="#6598ec" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="m195 7 2 7m-12-2 5 5m18-13-1 8" fill="none" stroke="#ffc94f" stroke-width="2.5" stroke-linecap="round"/>
    <path d="m250 49 2 7m-8-3 5 1m8-8-1 5" fill="none" stroke="#ffc94f" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function eventCard(registration) {
  const event = registration.event || {};
  const title = registration.title || event.title || 'Event';
  const date = registration.date || event.date || '';
  const time = registration.etime || event.etime || registration.time || event.time || '';
  const venue = registration.venue || event.venue || '';
  const distance = event.lat != null && event.lng != null ? dist(event) : '';
  const countdownText = countdown(date);
  return `<article class="tracker-event-card" data-tracker-event="${registration.id}">${flightArt()}
    <div class="tracker-event-icon">${icon('calendar', 44)}<span>${icon('ticket', 18)}</span></div>
    <div class="tracker-event-details"><h2>${esc(title)}</h2><div class="tracker-event-meta">
      ${date ? `<span>${icon('calendar', 21)}${esc(displayDate(date))}</span>` : ''}
      ${time ? `<span>${icon('clock', 21)}${esc(displayTime(time))}</span>` : ''}
      ${venue ? `<span>${icon('place', 21)}${esc(venue)}</span>` : ''}
      ${distance ? `<span>${icon('distance', 21)}${esc(distance)}</span>` : ''}
    </div>${countdownText ? `<span class="tracker-countdown ${countdownText === 'Event completed' ? 'completed' : ''}">${esc(countdownText)}</span>` : ''}</div>
    ${!['cancelled', 'canceled'].includes(String(registration.status || '').toLowerCase()) ? `<button class="tracker-cancel" type="button" data-tracker-cancel="${registration.id}">${icon('cancel', 19)}<span>Cancel registration</span></button>` : `<span class="tracker-cancelled">Cancelled</span>`}
  </article>`;
}

export function register(R, A) {
  R.tracker = async () => {
    const registrations = await items('reg');
    const tracked = registrations.filter(window.isActiveRegistration).map(registration => ({
      ...registration,
      event: EV.find(event => Number(event.id) === Number(registration.eid)),
    }));
    tracked.sort((a, b) => (a.date || a.event?.date || '').localeCompare(b.date || b.event?.date || ''));
    return `<div class="event-tracker-page">
      <section class="tracker-hero"><div class="tracker-hero-copy"><h1>Event tracker</h1><p>Keep track of your registered events and never miss a thing!</p></div>${heroArt()}</section>
      <section class="tracker-event-list" aria-label="Your registered events" aria-live="polite">${tracked.length ? tracked.map(eventCard).join('') : `<div class="tracker-empty"><span>${icon('ticket', 30)}</span><h2>No registered events yet</h2><p>Events you register for will appear here so you can keep track of them.</p><a href="#/discover">Discover events</a></div>`}</section>
    </div>`;
  };

  A.tracker = () => {
    controller?.abort();
    controller = new AbortController();
    const main = document.querySelector('#main');
    if (!main) return;
    main.addEventListener('click', async event => {
      const button = event.target.closest('[data-tracker-cancel]');
      if (!button) return;
      await window.cancelReg(Number(button.dataset.trackerCancel));
    }, { signal: controller.signal });
  };
}
