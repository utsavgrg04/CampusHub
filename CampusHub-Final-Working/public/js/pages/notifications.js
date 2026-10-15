let activeCategory = 'all';
let controller;

const categoryLabels = {
  registration: 'Registrations',
  event: 'Events',
  achievement: 'Achievements',
  reminder: 'Reminders',
  deadline: 'Reminders',
  motivation: 'Announcements',
  announcement: 'Announcements',
  community: 'Community',
};

const iconFor = kind => {
  const normalized = String(kind || '').toLowerCase();
  const name = normalized.includes('reg') ? 'calendar'
    : normalized.includes('achiev') ? 'ach'
    : normalized.includes('community') ? 'community'
    : normalized.includes('remind') || normalized.includes('deadline') ? 'reminders'
    : normalized.includes('event') ? 'calendar'
    : 'recs';
  return ico(name, 25);
};

function categoryFor(notification) {
  const kind = String(notification.kind || '').toLowerCase();
  if (categoryLabels[kind]) return categoryLabels[kind];
  const match = Object.keys(categoryLabels).find(key => kind.includes(key));
  return match ? categoryLabels[match] : kind ? kind[0].toUpperCase() + kind.slice(1) : 'Updates';
}

function formatTimestamp(value) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function heroArt() {
  return `<svg class="notification-hero-art" viewBox="0 0 560 170" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <path fill="#fff" opacity=".7" d="M32 47q18-29 40 0 21-25 41 0H32m350-24q17-25 36 0 18-22 37 0h-73"/>
    <path fill="#d9e9ff" d="M0 158q82-49 153-4 63-43 123 4t135-7q68-35 149 4v15H0z"/>
    <g fill="#79b8ae"><path d="M38 169q-9-56 11-88 22 43 10 88m31 0q-8-43 13-70 16 33 7 70m340 0q-12-57 8-92 23 46 11 92m30 0q-7-45 14-75 18 39 6 75"/><path d="M49 168V88m40 80v-61m351 61V77m30 91v-63" stroke="#4b9690" stroke-width="4"/></g>
    <g stroke="#315b97" stroke-linecap="round" stroke-linejoin="round"><path fill="#5895ed" stroke-width="3" d="M322 76h53l30 13v29l-30 13h-53z"/><path fill="#244b7b" stroke-width="3" d="m322 83-30 11v18l30 11z"/><path fill="none" stroke-width="4" d="m339 72 12-19m18 20 22-15m-48 23-4-18"/><path fill="#f1c847" stroke="none" d="m345 61 7-18 5 19m33 1 18-13-8 22"/><path fill="#f2c7a9" stroke-width="2" d="M413 107q0-32 21-43 20-8 36 10 13 17 4 41l-4 25h-50z"/><path fill="#214677" stroke-width="3" d="M406 97q-3-30 22-43 21-12 40 2 15 12 8 32l-12-17q-25 15-55 26z"/><path fill="#e7f2a5" stroke-width="2" d="M393 169v-39q23-20 48-5 14 8 27 2 17 6 22 42z"/><path fill="none" stroke-width="3" d="M429 91h2m18 0h2m-16 11q8 7 15 0"/></g>
    <path fill="#6da3f3" d="M489 43h42q9 0 9 9v29q0 9-9 9h-15l-13 12V90h-14q-9 0-9-9V52q0-9 9-9"/><path fill="#f6d34f" d="M510 53q7 0 7 7l-2 15h-9l-2-15q0-7 6-7m-5 27h10v9h-10z"/>
  </svg>`;
}

function notificationRow(notification) {
  const category = categoryFor(notification);
  const kind = String(notification.kind || 'update').toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const unread = !notification.read;
  return `<article class="notification-row ${unread ? 'is-unread' : 'is-read'}" data-notification-id="${notification.id}">
    <span class="notification-unread-dot${unread ? ' visible' : ''}" aria-label="${unread ? 'Unread' : 'Read'}"></span>
    <span class="notification-kind-icon kind-${kind}">${iconFor(notification.kind)}</span>
    <span class="notification-category category-${kind}">${esc(category)}</span>
    <span class="notification-copy"><strong>${esc(notification.title || category)}</strong><span>${esc(notification.text || '')}</span></span>
    <time class="notification-time" datetime="${esc(notification.ts || '')}">${esc(formatTimestamp(notification.ts))}</time>
    <span class="notification-actions"><button type="button" data-notification-menu aria-label="Notification actions" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button><span class="notification-menu" hidden><button type="button" data-notification-read="${notification.id}">${unread ? 'Mark as read' : 'Mark as unread'}</button><button type="button" data-notification-delete="${notification.id}">Delete</button></span></span>
  </article>`;
}

export function register(R, A) {
  R.notifs = async () => {
    const notifications = (await items('notif')).sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    const categories = [...new Set(notifications.map(categoryFor))];
    const visible = activeCategory === 'all' ? notifications : notifications.filter(item => categoryFor(item) === activeCategory);
    const unread = notifications.filter(item => !item.read).length;
    return `<div class="notification-page">
      <section class="notification-hero"><div class="notification-hero-copy"><span>STAY UPDATED</span><h1>Notification center</h1><p>Updates from your events, registrations, achievements and campus activity.</p></div>${heroArt()}</section>
      <nav class="notification-filters" aria-label="Filter notifications"><button type="button" data-notification-filter="all" class="${activeCategory === 'all' ? 'active' : ''}" aria-pressed="${activeCategory === 'all'}">All <span>${notifications.length}</span></button>${categories.map(category => `<button type="button" data-notification-filter="${esc(category)}" class="${activeCategory === category ? 'active' : ''}" aria-pressed="${activeCategory === category}">${esc(category)}</button>`).join('')}<button type="button" class="notification-mark-all" data-notification-mark-all ${unread ? '' : 'disabled'}>${ico('tasks', 18)}<span>Mark all read</span></button></nav>
      <section class="notification-list" aria-live="polite">${visible.length ? visible.map(notificationRow).join('') : `<div class="notification-empty"><span>${ico('notifs', 30)}</span><h2>${notifications.length ? `No ${esc(activeCategory.toLowerCase())} notifications` : 'You are all caught up'}</h2><p>${notifications.length ? 'Choose another category to see more updates.' : 'New activity and reminders will appear here.'}</p></div>`}</section>
    </div>`;
  };

  A.notifs = () => {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const main = document.querySelector('#main');
    if (!main) return;
    main.addEventListener('click', async event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-notification-filter')) {
        activeCategory = button.dataset.notificationFilter;
        render();
      } else if (button.hasAttribute('data-notification-mark-all')) {
        const unread = (await items('notif')).filter(item => !item.read);
        await Promise.all(unread.map(item => {
          const { id, ts, ...data } = item;
          return api(`items/${id}`, 'PUT', { ...data, read: 1 });
        }));
        render();
      } else if (button.hasAttribute('data-notification-menu')) {
        const menu = button.parentElement.querySelector('.notification-menu');
        const willOpen = menu.hidden;
        main.querySelectorAll('.notification-menu').forEach(item => { item.hidden = true; });
        main.querySelectorAll('[data-notification-menu]').forEach(item => item.setAttribute('aria-expanded', 'false'));
        menu.hidden = !willOpen;
        button.setAttribute('aria-expanded', String(willOpen));
      } else if (button.hasAttribute('data-notification-read')) {
        const id = Number(button.dataset.notificationRead), item = (await items('notif')).find(row => row.id === id);
        if (item) await patch(id, { read: item.read ? 0 : 1 });
      } else if (button.hasAttribute('data-notification-delete')) {
        await del(Number(button.dataset.notificationDelete));
      }
    }, { signal });
  };
}
