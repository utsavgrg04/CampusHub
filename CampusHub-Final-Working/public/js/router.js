let latest = 0;
export const invalidateRoutes = () => { latest++; };
export const getRoute = () => { const raw = location.hash.replace(/^#\/?/, '') || 'dashboard'; const [requestedPath, ...query] = raw.split('?'); const path = requestedPath === 'registrations' ? 'reg' : requestedPath; return { path, query: query.join('?') }; };
export async function renderRoute({ user, routes, actions, api, setEvents }) {
  const ticket = ++latest, owner = user()?.id, main = document.querySelector('#main');
  if (!owner || !main) return;
  const { path } = getRoute();
  main.removeAttribute('aria-busy');
  if(main.dataset.route!==path){document.querySelectorAll('.calendar-modal,.planner-modal').forEach(modal=>modal.remove());main.scrollTop=0;window.scrollTo(0,0)}
  const current = () => ticket === latest && owner === user()?.id && main === document.querySelector('#main');
  if (!routes[path]) { main.innerHTML = '<section class="card"><h2>Page not found</h2><a href="#/dashboard">Return to dashboard</a></section>'; return; }
  if (path === 'organizer' && user().role !== 'organizer') { main.innerHTML = '<section class="card"><h2>Organizer access required</h2><p>This page is available to event organizers.</p></section>'; return; }
  main.setAttribute('aria-busy', 'true');
  try {
    const events = await api('events'); if (!current()) return;
    setEvents(events);
    const html = await routes[path](); if (!current()) return;
    main.innerHTML = html; main.dataset.route = path;
    document.querySelectorAll('.shell>aside [data-p]').forEach(link => { const active = link.dataset.p === path; link.classList.toggle('on', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    await actions[path]?.(); if (!current()) return;
    if (renderRoute.last !== path) { renderRoute.last = path; try { await window.add('history', { a: 'Opened ' + path }); } catch {} }
  } catch (error) {
    if (!current()) return;
    const card = document.createElement('section'); card.className = 'card'; card.setAttribute('role', 'alert');
    const message = document.createElement('p'); message.textContent = error.message || 'This page could not be loaded.';
    const retry = document.createElement('button'); retry.textContent = 'Try again'; retry.onclick = () => window.render();
    card.append(message, retry); main.replaceChildren(card);
  } finally { if (current()) main.removeAttribute('aria-busy'); }
}
export const listenToRoutes = render => window.addEventListener('hashchange', render);
