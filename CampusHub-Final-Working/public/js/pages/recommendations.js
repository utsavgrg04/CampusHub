const icon = (name) => {
  const paths = {
    date: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    place: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    distance: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18m0-18a15 15 0 0 0 0 18"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

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

function recommendationArt() {
  return `<svg class="recommendations-hero-art" viewBox="0 0 620 190" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <path fill="#fff" opacity=".72" d="M390 48q16-25 31 0 18-23 34 1h-65m93 18q13-20 27 0 16-19 30 1h-57"/>
    <path fill="#e8f0c6" d="M0 172q86-43 156 0t153-1q90-49 165 0t146-6v25H0z"/>
    <g fill="#b6d5c9"><path d="M52 183q-21-75 8-123 36 56 14 123m48 4q-9-57 15-93 28 50 13 93m360-4q-17-66 10-108 31 54 14 108m70 3q-12-54 13-89 26 47 11 89"/><path d="M68 183V66m62 120V97m414 88V75m68 110V99" stroke="#80b5a7" stroke-width="5"/></g>
    <path fill="#547fc5" d="M315 177q7-46 30-58l23 12 22-15q31 15 38 61z"/>
    <path fill="#f2c6a5" d="M365 97q-8-32 10-47 24-17 42 4 15 17 4 42l-9 21-38-2z"/>
    <path fill="#244d87" d="M370 86q-7-41 25-48 32-5 40 29-12-9-25-7-12 3-20 15l-2 21-11-2z"/>
    <path fill="#244d87" d="M381 108q-17 13-23 44l-17 24 13 7 34-38 29-28-13-13z"/>
    <path fill="#cde08c" d="M394 116q27-13 45 8l17 52h-97l9-48z"/>
    <path fill="#d7e7ff" d="M220 159h137l-9 20H231z"/><path fill="#6f9df0" d="M234 127h98l18 33H220z"/><rect x="244" y="135" width="77" height="23" rx="3" fill="#244d87"/><circle cx="283" cy="146" r="3" fill="#8fb5f3"/>
    <path fill="#fff" opacity=".8" d="M477 91a12 12 0 0 1 24 0c0 10-12 18-12 18s-12-8-12-18"/><path fill="#6f9df0" d="M485 91q3-6 6 0 5-5 7 1 0 5-7 9-6-4-6-10"/>
  </svg>`;
}

function eventCard(event, registered, bookmarks) {
  const id = Number(event.id);
  const saved = bookmarks.includes(id);
  const fee = Number(event.fee) > 0 ? `₹${Number(event.fee).toLocaleString('en-IN')}` : 'Free';
  const date = String(event.date || '');
  return `<article class="discover-event-card recommendation-card">
    <img class="event-poster" src="/assets/discover/${posterFor(event)}" alt="Illustration for ${esc(event.title)}">
    <div class="event-card-copy">
      <div class="event-card-top"><div class="event-tags"><span class="event-tag">${esc(event.cat)}</span><span class="event-tag audience">${esc(event.dept || 'All')}</span>${event.hidden ? '<span class="event-tag recommendation-hidden">hidden</span>' : ''}</div>
        <button class="bookmark-button ${saved ? 'saved' : ''}" type="button" data-bookmark="${id}" aria-label="${saved ? 'Remove bookmark' : 'Bookmark'} ${esc(event.title)}" aria-pressed="${saved}"><svg viewBox="0 0 24 24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/></svg></button>
      </div>
      <h2>${esc(event.title)}</h2><p class="event-description">${esc(event.descr)}</p>
      <p class="event-meta">${icon('date')}<span>${esc(date)}, ${esc(event.etime || 'Time not specified')}</span></p>
      <p class="event-meta">${icon('place')}<span>${esc(event.venue)}</span></p>
      <p class="event-meta event-distance">${icon('distance')}<span>${esc(dist(event))} <i>·</i> ${fee}</span></p>
      <div class="event-card-actions"><button type="button" class="register-button" onclick="regEv(${id})" ${registered.includes(id) ? 'disabled' : ''}>${registered.includes(id) ? 'Registered ✓' : 'Register'}</button><button type="button" class="map-button" onclick="location.hash='#/map?e=${id}'">${icon('place')}Map</button></div>
    </div>
  </article>`;
}

export function register(R, A) {
  R.recs = async () => {
    const [registeredItems, bookmarkItems] = await Promise.all([regIds(), items('bookmark')]);
    const registered = registeredItems.map(Number), bookmarks = bookmarkItems.map(item => Number(item.eid));
    const keywords = kw();
    const scoreEvent = event => score(`${event.title} ${event.cat} ${event.descr} ${event.dept}`);
    const events = [...EV].sort((a, b) => scoreEvent(b) - scoreEvent(a)).slice(0, 4);
    const art = recommendationArt();
    return `<div class="recommendations-page">
      <section class="recommendations-hero"><div class="recommendations-hero-copy"><span class="discover-eyebrow">For you</span><h1>Recommended for you</h1><p>Based on your skills &amp; interests: ${esc(keywords.join(', ') || 'add some in Profile')}</p></div>${art}</section>
      <section class="recommendation-grid" aria-label="Recommended events">${events.map(event => eventCard(event, registered, bookmarks)).join('') || '<p class="m">No events to recommend yet.</p>'}</section>
    </div>`;
  };
  A.recs = () => {
    const main = document.querySelector('#main');
    main?.addEventListener('click', async event => {
      const button = event.target.closest('[data-bookmark]');
      if (!button) return;
      const id = Number(button.dataset.bookmark), records = await items('bookmark');
      const saved = records.find(item => Number(item.eid) === id);
      if (saved) await api(`items/${saved.id}`, 'DELETE');
      else await add('bookmark', { eid: id });
      render();
    });
  };
}
