export const Dashboard = (() => {
  const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parseDate = value => new Date(`${value}T12:00:00`);
  const weekStart = value => { const date = new Date(value); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - date.getDay()); return date; };
  let weekOffset = 0;
  let calendarView = 'week';
  let timeScrollTop = null;
  let dashboardCalendarInitialized = false;
  let bindController;

  const icon = (name, size = 26) => ico(name, size);
  const arrow = direction => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${direction < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}"/></svg>`;
  const todayISO = () => iso(new Date());

  function shiftMonth(amount) {
    const current = cal.sel ? parseDate(cal.sel) : new Date();
    const day = current.getDate();
    current.setDate(1);
    current.setMonth(current.getMonth() + amount);
    current.setDate(Math.min(day, new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()));
    cal.sel = iso(current); cal.y = current.getFullYear(); cal.m = current.getMonth(); setWeek(cal.sel);
  }
  function shiftWeek(amount) { weekOffset += amount; const date = weekStart(new Date()); date.setDate(date.getDate() + weekOffset * 7); cal.sel = iso(date); window.render(); }
  function shiftCalendarPeriod(amount) {
    if (calendarView === 'week') return shiftWeek(amount);
    const date = cal.sel ? parseDate(cal.sel) : new Date(), day = date.getDate();
    if (calendarView === 'month') { date.setDate(1); date.setMonth(date.getMonth() + amount); date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate())); }
    else date.setDate(date.getDate() + amount);
    cal.sel = iso(date);
    weekOffset = Math.round((weekStart(date) - weekStart(new Date())) / 604800000);
    window.render();
  }
  function setWeek(day) {
    const selectedWeek = weekStart(parseDate(day)), currentWeek = weekStart(new Date());
    weekOffset = Math.round((selectedWeek - currentWeek) / 604800000);
    window.render();
  }

  function openEvent(date = cal.sel || todayISO()) {
    document.querySelector('.calendar-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="calendar-modal" onclick="if(event.target===this)this.remove()"><form class="card dashboard-event-form" role="dialog" aria-modal="true" aria-labelledby="dashboard-event-title"><h2 id="dashboard-event-title">Add calendar event</h2><label>Title<input name="title" maxlength="100" required autocomplete="off" placeholder="Event title"></label><div class="row"><label style="flex:1">Date<input name="date" type="date" value="${date}" required></label><label style="flex:1">Start time<input name="start" type="time"></label></div><label>Color<select name="color"><option value="blue">Blue</option><option value="green">Green</option></select></label><div class="row" style="justify-content:flex-end"><button type="button" class="g" onclick="this.closest('.calendar-modal').remove()">Cancel</button><button type="submit">Save event</button></div></form></div>`);
    const form = document.querySelector('.dashboard-event-form');
    form.querySelector('[name="title"]').focus();
    form.addEventListener('submit', saveEvent);
  }
  async function saveEvent(event) {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form), title = String(data.get('title') || '').trim(), date = String(data.get('date') || '');
    if (!title || !date) return;
    if (form.dataset.saving) return;
    form.dataset.saving = 'true'; const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      await add('calendar', { title, date, start: String(data.get('start') || ''), color: String(data.get('color') || 'blue') });
      cal.sel = date; document.querySelector('.calendar-modal')?.remove(); window.render();
    } catch (error) {
      let message = form.querySelector('[role="alert"]'); if (!message) { message = document.createElement('p'); message.setAttribute('role','alert'); form.append(message); } message.textContent = error.message;
    } finally { delete form.dataset.saving; submit.disabled = false; }
  }

  function normalizeTime(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;
    let hours = Number(match[1]);
    if (match[3]) hours = (hours % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return hours * 60 + Number(match[2]);
  }
  function showTime(value) {
    const minutes = normalizeTime(value);
    return minutes === null ? '' : new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  function collectCalendar(data) {
    const [tasks, registrations, personal] = [data.task, data.reg.filter(window.isActiveRegistration), data.calendar];
    const registrationIds = new Set(registrations.map(item => Number(item.eid)));
    const registered = EV.filter(event => registrationIds.has(Number(event.id))).map(event => ({
      key: `event-${event.id}`, title: event.title, date: event.date, time: event.etime || '', place: event.venue || '',
      source: 'event', color: event.cat === 'Club' ? 'green' : 'blue',
    }));
    const personalEvents = personal.map(item => ({
      key: `personal-${item.id}`, title: item.title, date: item.date, time: item.start || item.time || '',
      place: item.place || item.location || '', source: 'personal', color: item.color || 'blue',
    }));
    const deadlines = tasks.filter(task => task.due).map(task => ({
      key: `task-${task.id}`, title: task.title, date: task.due, time: task.time || '', place: '',
      source: 'task', color: 'green', done: Boolean(task.done),
    }));
    return [...registered, ...personalEvents, ...deadlines].filter(item => item.date);
  }

  function miniCalendar(entries) {
    const selected = cal.sel ? parseDate(cal.sel) : new Date(), year = selected.getFullYear(), month = selected.getMonth();
    const first = new Date(year, month, 1), dayCount = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: Math.ceil((first.getDay() + dayCount) / 7) * 7 }, (_, index) => {
      if (index < first.getDay()) return '<span class="planner-mini-empty" aria-hidden="true"></span>';
      const date = new Date(year, month, index - first.getDay() + 1); const value = iso(date);
      const sources = [...new Set(entries.filter(item => item.date === value).map(item => item.source))];
      return `<button class="planner-mini-day ${value === iso(selected) ? 'selected' : ''} ${value === todayISO() ? 'today' : ''}" type="button" data-calendar-date="${value}" aria-label="${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}${sources.length ? `, ${sources.length} calendar categories` : ''}">${date.getDate()}${sources.length ? `<span class="planner-dots">${sources.map(source => `<i class="dot-${source === 'event' ? 'events' : source === 'personal' ? 'personal' : 'tasks'}"></i>`).join('')}</span>` : ''}</button>`;
    }).join('');
    const dailyQuotes = [
      'Small steps today, bigger opportunities tomorrow.',
      'A little progress each day adds up to a lot.',
      'Make room for one new thing you can learn today.',
      'Your next great idea can start with a simple question.',
      'Show up, stay curious, and let the results grow.',
      'Every deadline is a chance to see how far you have come.',
      'Keep going. The work you do today is building what comes next.',
    ];
    const currentDate = new Date();
    const dayNumber = Math.floor(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()) / 86400000);
    const quote = dailyQuotes[((dayNumber % dailyQuotes.length) + dailyQuotes.length) % dailyQuotes.length];
    const quoteArt = '<img src="/assets/dashboard-calendar-illustration.png" alt="" loading="lazy">';
    return `<section class="planner-panel planner-mini-panel"><div class="planner-mini-head"><h2>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><div><button type="button" data-month-step="-1" aria-label="Previous month">${arrow(-1)}</button><button type="button" data-month-step="1" aria-label="Next month">${arrow(1)}</button></div></div><div class="planner-mini-grid">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<span class="planner-weekday">${day}</span>`).join('')}${cells}</div><span class="dashboard-daily-quote-art" aria-hidden="true">${quoteArt}</span><p class="dashboard-daily-quote">${esc(quote)}</p></section>`;
  }

  function entryCard(entry) {
    const time = showTime(entry.time);
    return `<div class="calendar-event ${entry.color === 'green' ? 'green' : ''} ${entry.done ? 'calendar-event-done' : ''}" title="${esc(entry.title)}"><b>${esc(entry.title)}</b>${time ? `<span class="event-time">${esc(time)}</span>` : '<span class="event-time">All day</span>'}${entry.place ? `<span class="event-place">${esc(entry.place)}</span>` : ''}</div>`;
  }

  function week(entries) {
    const selected = cal.sel ? parseDate(cal.sel) : new Date(), today = todayISO();
    const start = weekStart(selected), days = calendarView === 'day' ? [selected] : Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
    const dayKeys = new Set(days.map(iso)), visibleEntries = entries.filter(entry => dayKeys.has(entry.date));
    const label = calendarView === 'month'
      ? selected.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : calendarView === 'day'
        ? selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
        : `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const toolbar = `<div class="planner-toolbar"><button type="button" class="planner-today" data-dashboard-today>Today</button><div class="planner-nav"><button type="button" data-week-step="-1" aria-label="Previous ${calendarView}">${arrow(-1)}</button><button type="button" data-week-step="1" aria-label="Next ${calendarView}">${arrow(1)}</button></div><h2>${label}</h2><div class="planner-toolbar-right"><div class="planner-view-switch" aria-label="Calendar view">${['day', 'week', 'month'].map(view => `<button type="button" data-calendar-view="${view}" class="${calendarView === view ? 'active' : ''}" aria-pressed="${calendarView === view}">${view[0].toUpperCase()}${view.slice(1)}</button>`).join('')}</div><button type="button" class="planner-add" data-add-calendar>${icon('plus', 18)}<span>Add Event</span></button></div></div>`;
    if (calendarView === 'month') {
      const first = new Date(selected.getFullYear(), selected.getMonth(), 1), monthStart = new Date(first); monthStart.setDate(1 - first.getDay());
      const count = Math.ceil((first.getDay() + new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()) / 7) * 7;
      const cells = Array.from({ length: count }, (_, index) => {
        const date = new Date(monthStart); date.setDate(monthStart.getDate() + index); const value = iso(date), matches = entries.filter(item => item.date === value);
        return `<button type="button" class="planner-month-cell${date.getMonth() === selected.getMonth() ? '' : ' outside'}${value === iso(selected) ? ' selected' : ''}" data-calendar-date="${value}"><span class="planner-month-number">${date.getDate()}</span>${matches.slice(0, 3).map(item => `<span class="planner-month-event ${item.source === 'event' ? 'events' : item.source === 'task' ? 'tasks' : 'personal'}">${esc(item.title)}</span>`).join('')}${matches.length > 3 ? `<small>+${matches.length - 3} more</small>` : ''}</button>`;
      }).join('');
      return `${toolbar}<div class="planner-month-scroll"><div class="planner-month-view"><div class="planner-month-weekdays">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<span>${day}</span>`).join('')}</div><div class="planner-month-grid">${cells}</div></div></div>`;
    }
    const timed = visibleEntries.map(entry => ({ ...entry, minutes: normalizeTime(entry.time) })).filter(entry => entry.minutes !== null);
    const allDay = visibleEntries.filter(entry => normalizeTime(entry.time) === null), hours = 24, hourHeight = 38;
    const allDayMarkup = allDay.length ? `<div class="planner-all-day" style="--days:${days.length}"><b>All day</b>${days.map(date => `<div>${allDay.filter(entry => entry.date === iso(date)).map(entry => `<article class="planner-entry planner-${entry.source === 'event' ? 'events' : entry.source === 'task' ? 'tasks' : 'personal'}"><strong>${esc(entry.title)}</strong></article>`).join('')}</div>`).join('')}</div>` : '';
    const labels = Array.from({ length: hours }, (_, index) => `<span style="top:${index * hourHeight}px">${new Date(2000, 0, 1, index).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`).join('');
    const columns = days.map(date => `<div class="planner-time-column${iso(date) === today ? ' selected-day' : ''}" style="--hours:${hours};--hour-height:${hourHeight}px">${timed.filter(item => item.date === iso(date)).map(item => `<article class="planner-timed-item ${item.source === 'personal' ? 'personal' : item.source === 'task' ? 'tasks' : ''}" style="top:${(item.minutes / 60) * hourHeight}px" title="${esc(item.title)}"><b>${esc(item.title)}</b><span>${esc(showTime(item.time))}${item.place ? ` - ${esc(item.place)}` : ''}</span></article>`).join('')}</div>`).join('');
    const heads = days.map(date => `<div class="planner-day-heading${iso(date) === today ? ' is-today' : ''}"><span>${date.toLocaleDateString(undefined, { weekday: 'short' })}</span><b>${date.getDate()}</b></div>`).join('');
    return `${toolbar}${allDayMarkup}<div class="planner-time-scroll" data-timeline><div class="planner-time-head" style="--days:${days.length}"><div></div>${heads}</div><div class="planner-time-body" style="--days:${days.length};--hours:${hours};--hour-height:${hourHeight}px"><div class="planner-time-labels">${labels}</div>${columns}</div></div>`;
  }
  async function render() {
    const data = await all(), entries = collectCalendar(data);
    if (!dashboardCalendarInitialized) {
      const nextEntry = entries.filter(item => item.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date))[0];
      if (nextEntry) {
        cal.sel = nextEntry.date;
        const selectedWeek = weekStart(parseDate(nextEntry.date));
        weekOffset = Math.round((selectedWeek - weekStart(new Date())) / 604800000);
      }
      dashboardCalendarInitialized = true;
    }
    const tasks = data.task, completedTasks = tasks.filter(task => task.done).length;
    const registrations = data.reg.filter(window.isActiveRegistration).length, achievements = data.ach.length;
    const pending = tasks.filter(task => !task.done), unread = data.notif.filter(item => !item.read);
    const percentage = tasks.length ? Math.round(completedTasks * 100 / tasks.length) : 0;
    // Upcoming deadlines on the dashboard are calendar entries the user explicitly added.
    // The event catalog and task list contain suggested/demo data and are not calendar commitments.
    const upcoming = data.calendar
      .map(item => ({ date: item.date, title: item.title }))
      .filter(item => item.date && item.date >= todayISO())
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
    window.__campushubUnread = unread.length;
    const selected = cal.sel ? parseDate(cal.sel) : new Date(); cal.y = selected.getFullYear(); cal.m = selected.getMonth();
    const campus = `<svg class="campus-art" viewBox="0 0 900 170" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><g fill="#fff" opacity=".72"><path d="M60 60q18-29 39-3 20-30 39 2 22-22 39 8H60zm390-34q17-24 33-2 20-26 39 1 23-18 36 5H450z"/></g><path d="M0 162q125-58 244 2t243-3q158-53 413 3v6H0Z" fill="#e7f1a8"/><g fill="#9fbbe9"><path d="M515 161q-16-51 0-101 18 51 4 101m61 0q-12-73 9-133 20 63 0 133m150 0q-4-54 18-90 20 41 4 90m89 0q3-55 25-89 15 47 2 89"/></g><g stroke="#718fc9" stroke-width="4"><path d="M520 162v-98m56 98V28m150 133V77m92 84V72"/><path d="M491 160q7-42-17-61m43 61q7-49 32-59m115 59q-6-38-23-55"/></g><g fill="#6d91d2"><path d="M185 165V65h207v100zm-18-97 122-45 122 45zm56 16h18v22h-18zm40 0h18v22h-18zm41 0h18v22h-18zm-81 37h18v22h-18zm40 0h18v22h-18zm41 0h18v22h-18z"/><path d="M272 165v-46q0-22 20-22t20 22v46z" fill="#fff"/><path d="M287 96V47h5v49m0-48h28l-28 14z"/></g></svg>`;
    return `<div class="dashboard"><section class="welcome"><div class="welcome-copy"><h2>Hi <span class="welcome-name">${esc(String(U.name || '').trim().split(/\s+/)[0] || '')}</span> <span aria-hidden="true">👋</span></h2><h3>Let’s make today productive!</h3><p>Explore events, manage your tasks and achieve more.</p></div>${campus}</section>
      <section class="stat-row" aria-label="Dashboard summaries"><a href="#/tasks" class="card stat-card blue"><span class="stat-icon">${icon('tasks')}</span><div class="stat-copy"><b class="stat">${pending.length}</b><span class="m">pending tasks</span></div><span class="stat-orb">${icon('tasks', 26)}</span></a><a href="#/registrations" class="card stat-card green"><span class="stat-icon">${icon('reg')}</span><div class="stat-copy"><b class="stat">${registrations}</b><span class="m">registered events</span></div><span class="stat-orb">${icon('reg', 26)}</span></a><a href="#/ach" class="card stat-card blue"><span class="stat-icon">${icon('ach')}</span><div class="stat-copy"><b class="stat">${achievements}</b><span class="m">achievements</span></div><span class="stat-orb">${icon('ach', 26)}</span></a><a href="#/notifs" class="card stat-card cream"><span class="stat-icon">${icon('notifs')}</span><div class="stat-copy"><b class="stat">${unread.length}</b><span class="m">unread notifications</span></div><span class="stat-orb">${icon('notifs', 26)}</span></a></section>
      <section class="progress-row"><a href="#/progress" class="card summary-card" aria-label="Overall progress ${percentage} percent. Open progress tracker"><span class="summary-icon">${icon('progress')}</span><div class="summary-content"><div class="progress-title-row"><span class="summary-title">Overall progress</span><b>${percentage}%</b></div><div class="progress-track"><i style="width:${percentage}%"></i></div></div></a><a href="#/reminders?filter=deadlines" class="card summary-card" aria-label="${upcoming.length} upcoming deadlines. Open deadlines"><span class="summary-icon">${icon('calendar')}</span><div class="deadline-copy"><div class="progress-title-row"><span class="summary-title">Upcoming deadlines</span></div><p>${upcoming.length ? `${esc(upcoming[0].date)} · ${esc(upcoming[0].title)}${upcoming.length > 1 ? ` · ${upcoming.length} upcoming items` : ''}` : 'Nothing upcoming.'}</p></div><svg class="deadline-art" viewBox="0 0 195 98" aria-hidden="true"><path d="M90 98q45-43 105-18v18Z" fill="#e7f1a8"/><rect x="52" y="25" width="72" height="63" rx="9" fill="#c8dcff"/><path d="M65 25v-8m45 8v-8" stroke="#73a2ed" stroke-width="6" stroke-linecap="round"/><path d="M61 42h10v10H61zm18 0h10v10H79zm18 0h10v10H97zm-36 19h10v10H61zm18 0h10v10H79zm18 0h10v10H97z" fill="#85acf1"/><path d="M154 98q-7-49 12-83 24 36 9 83" fill="#92afe5"/><path d="M164 95V28m0 47 19-17m-20 1-12-14" stroke="#557dbb" stroke-width="3"/></svg></a></section>
      <section class="calendar-row">${miniCalendar(entries)}<section class="planner-panel planner-main">${week(entries)}</section></section></div>`;
  }

  function bind() {
    bindController?.abort(); bindController = new AbortController();
    const { signal } = bindController;
    const main = document.querySelector('#main'); if (!main) return;
    main.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.dataset.monthStep) shiftMonth(Number(button.dataset.monthStep));
      else if (button.hasAttribute('data-dashboard-today')) { weekOffset = 0; cal.sel = todayISO(); window.render(); }
      else if (button.dataset.weekStep) shiftCalendarPeriod(Number(button.dataset.weekStep));
      else if (button.dataset.calendarView) { calendarView = button.dataset.calendarView; window.render(); }
      else if (button.dataset.calendarDate) { cal.sel = button.dataset.calendarDate; setWeek(cal.sel); }
      else if (button.hasAttribute('data-add-calendar')) openEvent();
    }, { signal });
    const timeline = main.querySelector('[data-timeline]');
    if (timeline) {
      timeline.scrollTop = timeScrollTop ?? Math.max(0, (new Date().getHours() - 2) * 38);
      timeline.addEventListener('scroll', () => { timeScrollTop = timeline.scrollTop; }, { signal, passive: true });
    }
  }

  return { render, shiftMonth, shiftWeek, openEvent, saveEvent, setWeek, bind, reset: () => { dashboardCalendarInitialized = false; weekOffset = 0; } };
})();

window.Dashboard = Dashboard;
