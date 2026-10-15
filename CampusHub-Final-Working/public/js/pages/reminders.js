const reminderIcon = (name, size = 22) => {
  const paths = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tasks: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    event: '<path d="M4 5h16v15H4zM8 3v4m8-4v4M4 10h16"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateLabel = value => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};
const esc = value => window.esc(value ?? '');

function heroArt() {
  return `<svg class="reminder-hero-art" viewBox="0 0 650 190" preserveAspectRatio="xMaxYMax meet" aria-hidden="true"><path fill="#fff" opacity=".67" d="M25 57q18-26 38 0 20-28 41 0h-79m200-30q18-24 38 0 18-23 39 0h-77"/><path fill="#e6f0b8" d="M0 169q86-37 167 0t162-4q97-45 178 1t143-3v27H0Z"/><g transform="translate(168 28)"><path fill="#8cafec" d="M34 40h169v113H34z"/><path fill="#fff" d="M50 52h137v93H50z"/><path fill="#dce9ff" d="M65 69h26v20H65zm40 0h26v20h-26zm40 0h26v20h-26zm-80 37h26v20H65zm40 0h26v20h-26z"/><path fill="#568ee9" d="M51 27q0-15 9-15t9 15v13h-9V27q0-6-2-6t-2 6v13h-5zm38 0q0-15 9-15t9 15v13h-9V27q0-6-2-6t-2 6v13h-5zm38 0q0-15 9-15t9 15v13h-9V27q0-6-2-6t-2 6v13h-5zm38 0q0-15 9-15t9 15v13h-9V27q0-6-2-6t-2 6v13h-5z"/><circle cx="194" cy="106" r="29" fill="#ffce73"/><path fill="#f7a927" d="M194 85c-9 0-14 7-14 16v9l-5 7h38l-5-7v-9c0-9-5-16-14-16zm-6 36q1 8 6 8t6-8z"/></g><g fill="#8db3e9"><path d="M458 169q-18-47 1-85 23 41 8 85m87 1q-13-58 12-96 28 47 9 96"/><path d="M468 171V84m91 86V75" stroke="#6f9bd7" stroke-width="4"/></g><g transform="translate(394 119)"><rect width="104" height="34" rx="9" fill="#759ddd"/><path d="M8 12h88M16 22h65" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M44 8q0-9 8-9t8 9" fill="none" stroke="#497ac3" stroke-width="4"/></g></svg>`;
}

function emptyArt() {
  return `<svg class="reminder-empty-art" viewBox="0 0 300 210" aria-hidden="true"><path fill="#eff5ff" d="M39 109Q27 67 69 54q18-44 65-25 40-30 74 2 50 2 47 51 37 32 4 69-24 36-78 25-45 31-76 2-63 20-78-27-25-22 12-42Z"/><g transform="translate(83 42)"><rect x="0" y="18" width="133" height="115" rx="13" fill="#91b5ed"/><rect x="8" y="27" width="117" height="99" rx="7" fill="#fff"/><path d="M28 18V3m36 15V3m36 15V3" stroke="#4e8def" stroke-width="8" stroke-linecap="round"/><path fill="#e4efff" d="M25 50h21v20H25zm33 0h21v20H58zm33 0h21v20H91zM25 82h21v20H25zm33 0h21v20H58zm33 0h21v20H91z"/><circle cx="143" cy="111" r="39" fill="#5b95f4"/><path fill="#fff" d="M143 84q-13 0-13 15v11l-7 10h40l-7-10V99q0-15-13-15zm-8 40q1 10 8 10t8-10z"/></g><g stroke="#5b95f4" stroke-width="5" stroke-linecap="round"><path d="m46 69-15-9m23-8-5-18m-5 49H25"/></g></svg>`;
}

export function register(R, A) {
  let filter = 'all';
  let records = [];
  const notificationPreference = 'campushub.browserNotificationsEnabled';

  function notificationsEnabled() {
    return 'Notification' in window && Notification.permission === 'granted' && localStorage.getItem(notificationPreference) === 'true';
  }

  function notificationControl() {
    const supported = 'Notification' in window;
    const blocked = supported && Notification.permission === 'denied';
    const enabled = notificationsEnabled();
    const label = !supported ? 'Browser notifications unavailable' : blocked ? 'Notifications blocked in browser settings' : enabled ? 'Disable browser notifications' : 'Enable browser notifications';
    return `<button type="button" class="reminder-notify-button" data-enable-notifications aria-pressed="${enabled}"${!supported || blocked ? ' disabled' : ''}>${reminderIcon('bell', 22)}<span>${label}</span></button>`;
  }

  async function loadRecords() {
    const [tasks, registrations, personal] = await Promise.all([
      window.items('task'), window.items('reg'), window.items('calendar'),
    ]);
    const start = localDate(new Date());
    const inRange = date => Boolean(date && date >= start);
    const registrationIds = new Set(registrations.filter(window.isActiveRegistration).map(item => Number(item.eid)));
    const entries = [
      ...window.EV.filter(event => registrationIds.has(Number(event.id)) && inRange(event.date)).map(event => ({
        id: `event-${event.id}`, title: event.title, date: event.date, time: event.etime || '', detail: event.venue || event.dept || '', type: 'events', categories: ['events'],
      })),
      ...tasks.filter(task => !task.done && inRange(task.due)).map(task => ({
        id: `task-${task.id}`, title: task.title, date: task.due, time: task.time || '', detail: task.pri ? `${task.pri} priority` : '', type: 'tasks', categories: ['tasks'],
      })),
      ...personal.filter(item => inRange(item.date)).map(item => ({
        id: `reminder-${item.id}`, title: item.title, date: item.date, time: item.start || item.time || '', detail: item.description || item.place || '', type: item.kind === 'reminder' ? 'reminders' : 'events', categories: [item.kind === 'reminder' ? 'reminders' : 'events', 'deadlines'],
      })),
    ];
    return entries.sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)) || a.title.localeCompare(b.title));
  }

  function visibleRecords() { return filter === 'all' ? records : records.filter(item => item.categories.includes(filter)); }

  function filtersMarkup() {
    const options = [
      ['all', 'All', ''], ['events', 'Events', 'event'], ['deadlines', 'Deadlines', 'clock'], ['tasks', 'Tasks', 'tasks'], ['reminders', 'Reminders', 'bell'],
    ];
    return options.map(([key, label, glyph]) => `<button type="button" data-reminder-filter="${key}" class="${filter === key ? 'active' : ''}" aria-pressed="${filter === key}">${glyph ? reminderIcon(glyph, 21) : ''}${label}<span>${key === 'all' ? records.length : records.filter(item => item.categories.includes(key)).length}</span></button>`).join('');
  }

  function emptyState() {
    const hasItems = records.length > 0;
    const title = hasItems ? 'No reminders in this category' : 'Nothing coming up!';
    const copy = hasItems ? 'Choose another filter to see your upcoming events and tasks.' : 'You’re all caught up. Enjoy your week.';
    return `<section class="reminder-empty">${emptyArt()}<h2>${title}</h2><p>${copy}</p><button type="button" class="reminder-add-button" data-add-reminder>${reminderIcon('plus', 26)} Add a reminder</button><svg class="reminder-empty-landscape" viewBox="0 0 1400 190" preserveAspectRatio="none" aria-hidden="true"><path fill="#e8f1b7" d="M0 190V90q94-40 187 7 74 36 155-5 116-59 228 4 78 44 158 5 90-45 186 3 92 47 190 0 122-59 296-10v96H0Z"/><g fill="#a6c7f1"><path d="M0 190Q-8 94 60 43q17 80-20 147 75-79 101-76-35 67-95 76h120q-71-58-43-115 76 52 74 115m1177 0q-10-89 53-137 23 70-7 137 61-86 112-94-21 66-95 94h160q-88-77-50-134 79 58 72 134"/></g><g fill="none" stroke="#85a9de" stroke-width="5"><path d="M37 190q24-81 99-110M48 190q-5-53-36-75m1410 75q-29-80-102-110m30 110q7-52 39-75"/></g></svg></section>`;
  }

  function recordCard(item) {
    const glyph = item.type === 'events' ? 'event' : item.type === 'tasks' ? 'tasks' : 'bell';
    const label = item.type === 'events' ? 'Event' : item.type === 'tasks' ? 'Task deadline' : 'Reminder';
    return `<article class="reminder-item reminder-kind-${item.type}"><span class="reminder-item-icon">${reminderIcon(glyph, 24)}</span><div class="reminder-item-copy"><span class="reminder-item-type">${label}</span><h2>${esc(item.title)}</h2>${item.detail ? `<p>${esc(item.detail)}</p>` : ''}</div><time datetime="${esc(item.date)}">${esc(dateLabel(item.date))}${item.time ? ` · ${esc(item.time)}` : ''}</time></article>`;
  }

  function contentMarkup() {
    const visible = visibleRecords();
    return visible.length ? `<section class="reminder-list" aria-live="polite">${visible.map(recordCard).join('')}<button type="button" class="reminder-add-button" data-add-reminder>${reminderIcon('plus', 26)} Add a reminder</button></section>` : emptyState();
  }

  R.reminders = async () => {
    records = await loadRecords();
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    filter = ['all', 'events', 'deadlines', 'tasks', 'reminders'].includes(params.get('filter')) ? params.get('filter') : 'all';
    return `<div class="reminder-page"><section class="reminder-hero"><div class="reminder-hero-copy"><h1>Upcoming reminders &amp; deadlines</h1><p>Stay on top of upcoming campus events, personal events, reminders and task deadlines.</p></div>${heroArt()}</section><section class="reminder-filter-bar"><nav class="reminder-filters" aria-label="Filter reminders">${filtersMarkup()}</nav>${notificationControl()}</section><div class="reminder-content" aria-live="polite">${contentMarkup()}</div></div>`;
  };

  A.reminders = () => {
    const root = document.querySelector('.reminder-page');
    if (!root) return;
    const paint = () => {
      root.querySelector('.reminder-filters').innerHTML = filtersMarkup();
      root.querySelector('.reminder-content').innerHTML = contentMarkup();
    };
    root.addEventListener('click', async event => {
      const filterButton = event.target.closest('[data-reminder-filter]');
      if (filterButton) { filter = filterButton.dataset.reminderFilter; paint(); return; }
      if (event.target.closest('[data-add-reminder]')) {
        const today = localDate(new Date());
        const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 7);
        root.insertAdjacentHTML('beforeend', `<div class="reminder-modal" data-reminder-modal><form class="reminder-modal-card" aria-labelledby="reminder-form-title"><button type="button" class="reminder-modal-close" data-close-reminder aria-label="Close">${reminderIcon('close', 19)}</button><h2 id="reminder-form-title">Add a reminder</h2><label>Title<input name="title" maxlength="120" required autocomplete="off" placeholder="What do you want to remember?"></label><div class="reminder-modal-row"><label>Date<input name="date" type="date" value="${today}" min="${today}" max="${localDate(maxDate)}" required></label><label>Time<input name="time" type="time"></label></div><label>Details<input name="description" maxlength="180" autocomplete="off" placeholder="Add a note (optional)"></label><div class="reminder-modal-actions"><button type="button" class="reminder-cancel" data-close-reminder>Cancel</button><button type="submit" class="reminder-save">Save reminder</button></div></form></div>`);
        root.querySelector('.reminder-modal input[name="title"]')?.focus();
        return;
      }
      if (event.target.closest('[data-close-reminder]') || event.target.matches('[data-reminder-modal]')) { root.querySelector('[data-reminder-modal]')?.remove(); return; }
      if (event.target.closest('[data-enable-notifications]')) {
        const button = root.querySelector('[data-enable-notifications]');
        if (notificationsEnabled()) {
          localStorage.setItem(notificationPreference, 'false');
          button.querySelector('span').textContent = 'Enable browser notifications';
          button.setAttribute('aria-pressed', 'false');
          return;
        }
        if (!('Notification' in window)) { button.querySelector('span').textContent = 'Browser notifications unavailable'; button.disabled = true; return; }
        const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
        if (permission === 'granted') {
          localStorage.setItem(notificationPreference, 'true');
          new Notification('CampusHub reminders', { body: `${records.length} upcoming ${records.length === 1 ? 'item' : 'items'}.` });
          button.querySelector('span').textContent = 'Disable browser notifications';
          button.setAttribute('aria-pressed', 'true');
        } else {
          localStorage.setItem(notificationPreference, 'false');
          button.querySelector('span').textContent = permission === 'denied' ? 'Notifications blocked in browser settings' : 'Enable browser notifications';
          if (permission === 'denied') button.disabled = true;
          button.setAttribute('aria-pressed', 'false');
        }
      }
    });
    root.addEventListener('submit', async event => {
      const form = event.target.closest('.reminder-modal-card');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      const title = String(data.get('title') || '').trim();
      const date = String(data.get('date') || '');
      if (!title || !date) return;
      await window.add('calendar', { title, date, start: String(data.get('time') || ''), description: String(data.get('description') || '').trim(), kind: 'reminder' });
      root.querySelector('[data-reminder-modal]')?.remove();
      await window.render();
    });
  };
}
