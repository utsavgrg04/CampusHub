const dateISO = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseISO = value => new Date(`${value}T12:00:00`);
const startOfWeek = value => { const date = parseISO(value); date.setDate(date.getDate() - date.getDay()); return date; };
const model = { selected: dateISO(new Date()), view: 'week', initialized: false, sources: { events: true, personal: true, tasks: true } };
let controller;

const icon = (name, size = 20) => {
  const paths = {
    prev: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', date: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    events: '<path d="M4 5h16v15H4zM8 3v4m8-4v4M4 10h16"/>', tasks: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>',
    personal: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function formatTime(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return String(value);
  let hours = Number(match[1]);
  if (match[3]) { const pm = match[3].toUpperCase() === 'PM'; hours = (hours % 12) + (pm ? 12 : 0); }
  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}
function timeMinutes(value) { const normalized = formatTime(value), match = normalized.match(/^(\d{1,2}):(\d{2})$/); return match ? Number(match[1]) * 60 + Number(match[2]) : null; }
function displayTime(value) {
  const minutes = timeMinutes(value);
  if (minutes === null) return '';
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function monthLabel(value, options = { month: 'long', year: 'numeric' }) { return parseISO(value).toLocaleDateString(undefined, options); }
function sameWeekLabel(days) { return `${monthLabel(dateISO(days[0]), { month: 'short', day: 'numeric' })} – ${monthLabel(dateISO(days[6]), { month: 'short', day: 'numeric', year: 'numeric' })}`; }

function collectEntries([tasks, registeredIds, personal]) {
  const ids = new Set(registeredIds.map(Number));
  const entries = [
    ...EV.filter(event => ids.has(Number(event.id))).map(event => ({
      key: `event-${event.id}`, source: 'events', title: event.title, date: event.date,
      time: event.etime || '', place: event.venue || '', detail: event.cat || '',
    })),
    ...personal.map(item => ({
      key: `personal-${item.id}`, source: 'personal', title: item.title, date: item.date,
      time: item.start || item.time || '', place: item.place || item.location || '', detail: item.description || '',
    })),
    ...tasks.filter(task => task.due).map(task => ({
      key: `task-${task.id}`, source: 'tasks', title: task.title, date: task.due,
      time: task.time || '', place: '', detail: task.done ? 'Completed' : (task.pri || 'Task'), done: Boolean(task.done),
    })),
  ];
  return entries.filter(entry => entry.date && model.sources[entry.source]);
}

async function getEntries() {
  const data = await Promise.all([items('task'), regIds(), items('calendar')]);
  return collectEntries(data);
}

function sourceIcon(source) { return icon(source === 'events' ? 'events' : source === 'tasks' ? 'tasks' : 'personal', 16); }
function entryCard(entry, compact = false) {
  const time = displayTime(entry.time);
  return `<article class="planner-entry planner-${entry.source}${entry.done ? ' planner-done' : ''}${compact ? ' planner-entry-compact' : ''}" title="${esc(entry.title)}">
    <span class="planner-entry-icon">${sourceIcon(entry.source)}</span><strong>${esc(entry.title)}</strong>
    ${time ? `<span class="planner-entry-time">${esc(time)}</span>` : '<span class="planner-entry-time">All day</span>'}
    ${entry.place ? `<span class="planner-entry-place">${esc(entry.place)}</span>` : ''}
  </article>`;
}

function miniCalendar(entries) {
  const selected = parseISO(model.selected), first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const offset = first.getDay(), days = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate();
  const monthDays = Math.ceil((offset + days) / 7) * 7, cells = [];
  for (let index = 0; index < monthDays; index++) {
    const date = new Date(selected.getFullYear(), selected.getMonth(), index - offset + 1);
    const value = dateISO(date), day = date.getDate();
    const sources = [...new Set(entries.filter(entry => entry.date === value).map(entry => entry.source))];
    cells.push(`<button class="planner-mini-day${date.getMonth() === selected.getMonth() ? '' : ' outside'}${value === model.selected ? ' selected' : ''}${value === dateISO(new Date()) ? ' today' : ''}" type="button" data-select-date="${value}" aria-label="${monthLabel(value, { month: 'long', day: 'numeric', year: 'numeric' })}${sources.length ? `, ${sources.length} calendar categories` : ''}">${day}${sources.length ? `<span class="planner-dots">${sources.map(source => `<i class="dot-${source}"></i>`).join('')}</span>` : ''}</button>`);
  }
  return `<section class="planner-panel planner-mini-panel"><div class="planner-mini-head"><h2>${esc(monthLabel(model.selected))}</h2><div><button type="button" data-step-month="-1" aria-label="Previous month">${icon('prev')}</button><button type="button" data-step-month="1" aria-label="Next month">${icon('next')}</button></div></div><div class="planner-mini-grid">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<span class="planner-weekday">${day}</span>`).join('')}${cells.join('')}</div></section>`;
}

function calendarSources() {
  return `<section class="planner-panel planner-sources"><div class="planner-sources-head"><h2>My calendars</h2><button type="button" data-add-event aria-label="Add personal calendar event">${icon('plus', 23)}</button></div>
    ${[['events', 'Registered events'], ['personal', 'Personal events'], ['tasks', 'Tasks & deadlines']].map(([key, label]) => `<label class="planner-source planner-source-${key}"><input type="checkbox" data-source="${key}" ${model.sources[key] ? 'checked' : ''}><span>${icon(key, 17)}</span><b>${label}</b></label>`).join('')}
  </section>`;
}

function dayHeader(date) {
  const value = dateISO(date);
  return `<div class="planner-day-heading${value === dateISO(new Date()) ? ' is-today' : ''}"><span>${esc(date.toLocaleDateString(undefined, { weekday: 'short' }))}</span><b>${date.getDate()}</b></div>`;
}

function monthView(entries, monthStart) {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const total = Math.ceil((first.getDay() + new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()) / 7) * 7;
  const cells = Array.from({ length: total }, (_, index) => {
    const date = new Date(start); date.setDate(start.getDate() + index); const value = dateISO(date);
    const dayEntries = entries.filter(entry => entry.date === value);
    return `<button type="button" class="planner-month-cell${date.getMonth() === monthStart.getMonth() ? '' : ' outside'}${value === model.selected ? ' selected' : ''}" data-select-date="${value}"><span class="planner-month-number">${date.getDate()}</span>${dayEntries.slice(0, 3).map(entry => `<span class="planner-month-event ${entry.source}">${esc(entry.title)}</span>`).join('')}${dayEntries.length > 3 ? `<small>+${dayEntries.length - 3} more</small>` : ''}</button>`;
  }).join('');
  return `<div class="planner-month-view"><div class="planner-month-weekdays">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<span>${day}</span>`).join('')}</div><div class="planner-month-grid">${cells}</div></div>`;
}

function timedSchedule(entries, days, selected) {
  const dayEntries = entries.filter(entry => days.some(day => dateISO(day) === entry.date));
  const firstHour = 0;
  const lastHour = 24;
  const hourHeight = 31, hours = lastHour - firstHour;
  const labels = Array.from({ length: hours }, (_, index) => `<span style="top:${(index + 0.5) * hourHeight}px">${new Date(2000, 0, 1, firstHour + index).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>`).join('');
  const headings = `<div class="planner-time-spacer"></div>${days.map(dayHeader).join('')}`;
  const columns = days.map(day => {
    const value = dateISO(day), items = dayEntries.filter(entry => entry.date === value && timeMinutes(entry.time) !== null);
    return `<div class="planner-time-column${value === selected ? ' selected-day' : ''}" style="--hours:${hours};--hour-height:${hourHeight}px">${items.map(entry => {
      const minutes = timeMinutes(entry.time), top = (minutes / 60 - firstHour) * hourHeight;
      return `<div class="planner-timed-item ${entry.source}" style="top:${top}px" title="${esc(entry.title)}"><b>${esc(entry.title)}</b><span>${esc(displayTime(entry.time))}${entry.place ? ` · ${esc(entry.place)}` : ''}</span></div>`;
    }).join('')}</div>`;
  }).join('');
  return `<div class="planner-time-scroll" style="--days:${days.length}"><div class="planner-time-head">${headings}</div><div class="planner-time-body" style="--days:${days.length};--hours:${hours};--hour-height:${hourHeight}px"><div class="planner-time-labels">${labels}</div>${columns}</div></div>`;
}

function schedule(entries) {
  const selected = parseISO(model.selected);
  let days;
  if (model.view === 'day') days = [selected];
  else if (model.view === 'month') return monthView(entries, selected);
  else { const start = startOfWeek(model.selected); days = Array.from({ length: 7 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; }); }
  const daySet = new Set(days.map(dateISO));
  const allDayEntries = entries.filter(entry => daySet.has(entry.date) && timeMinutes(entry.time) === null);
  return `<div class="planner-schedule">${allDayEntries.length ? `<div class="planner-all-day" style="--days:${days.length}"><b>All day</b>${days.map(day => `<div>${allDayEntries.filter(entry => entry.date === dateISO(day)).map(entry => entryCard(entry, true)).join('')}</div>`).join('')}</div>` : ''}${timedSchedule(entries, days, model.selected)}</div>`;
}

function toolbar() {
  const selected = parseISO(model.selected);
  const label = model.view === 'month' ? monthLabel(model.selected) : model.view === 'day'
    ? monthLabel(model.selected, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    : sameWeekLabel(Array.from({ length: 7 }, (_, index) => { const day = startOfWeek(model.selected); day.setDate(day.getDate() + index); return day; }));
  return `<div class="planner-toolbar"><button type="button" class="planner-today" data-today>Today</button><div class="planner-nav"><button type="button" data-step-date="-1" aria-label="Previous ${model.view}">${icon('prev')}</button><button type="button" data-step-date="1" aria-label="Next ${model.view}">${icon('next')}</button></div><h2>${esc(label)}</h2><div class="planner-toolbar-right"><div class="planner-view-switch">${['day', 'week', 'month'].map(view => `<button type="button" data-view="${view}" class="${model.view === view ? 'active' : ''}" aria-pressed="${model.view === view}">${view[0].toUpperCase()}${view.slice(1)}</button>`).join('')}</div><button type="button" class="planner-add" data-add-event>${icon('plus')}<span>Add Event</span></button></div></div>`;
}

function modal(date = model.selected) {
  document.querySelector('.planner-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div class="planner-modal" data-modal-backdrop><form class="planner-modal-card" data-event-form role="dialog" aria-modal="true" aria-labelledby="planner-form-title"><h2 id="planner-form-title">Add personal event</h2><label>Title<input name="title" maxlength="100" required autocomplete="off" placeholder="Event title"></label><div class="planner-form-row"><label>Date<input name="date" type="date" value="${esc(date)}" required></label><label>Start time<input name="start" type="time"></label></div><label>Location<input name="place" maxlength="120" placeholder="Optional"></label><div class="planner-form-actions"><button type="button" class="planner-cancel" data-close-modal>Cancel</button><button type="submit" class="planner-add">Save event</button></div></form></div>`);
  document.querySelector('.planner-modal input[name="title"]')?.focus();
}

function moveMonth(date, amount) { const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+amount);date.setDate(Math.min(day,new Date(date.getFullYear(),date.getMonth()+1,0).getDate())); }
function moveDate(amount) {
  const date = parseISO(model.selected);
  if (model.view === 'month') moveMonth(date,amount);
  else date.setDate(date.getDate() + amount * (model.view === 'week' ? 7 : 1));
  model.selected = dateISO(date);
}

export function register(R, A) {
  R.calendar = async () => {
    const entries = await getEntries();
    if (!model.initialized) {
      const today = dateISO(new Date());
      const nextEntry = entries.filter(entry => entry.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
      if (nextEntry) model.selected = nextEntry.date;
      model.initialized = true;
    }
    return `<div class="planner-page"><section class="planner-hero"><div><h1>Calendar &amp; day planner</h1><p>Keep track of your events, deadlines and activities across campus.</p></div><svg viewBox="0 0 900 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><path fill="#fff" opacity=".7" d="M80 67q20-30 42 0 24-28 43 1H80m350-36q18-27 36 0 20-24 40 1h-76"/><path fill="#e6efba" d="M0 145q110-43 205 0t200-1q110-48 220 0t275 0v16H0z"/><g fill="#75a9a1"><path d="M600 160q-16-66 10-107 29 50 12 107m95 0q-13-58 13-96 29 52 13 96m120 0q-18-73 12-116 34 60 14 116"/><path d="M617 160V53m99 107V69m119 91V46" stroke="#4c8f8b" stroke-width="5"/></g><g fill="#8cb4eb"><path d="M280 160V64h200v96zm-14-96 114-54 114 54z"/><path fill="#dbe9ff" d="M298 77h23v31h-23zm43 0h24v31h-24zm44 0h24v31h-24zm44 0h27v31h-27zM300 120h23v29h-23zm43 0h24v29h-24zm44 0h24v29h-24zm44 0h27v29h-27z"/><path fill="#fff" d="M365 160v-39q0-20 19-20t19 20v39z"/><path d="M377 100V45h5v55m0-53h38l-38 18z"/></g></svg></section>
      <div class="planner-layout"><aside class="planner-sidebar">${miniCalendar(entries)}${calendarSources()}</aside><section class="planner-panel planner-main">${toolbar()}${schedule(entries)}</section></div></div>`;
  };

  A.calendar = () => {
    controller?.abort(); controller = new AbortController();
    const { signal } = controller;
    const main = document.querySelector('#main');
    if (!main) return;
    main.addEventListener('click', async event => {
      const button = event.target.closest('button');
      if (button?.hasAttribute('data-step-month')) {
        const date = parseISO(model.selected); moveMonth(date,Number(button.dataset.stepMonth)); model.selected = dateISO(date); render();
      } else if (button?.hasAttribute('data-select-date')) { model.selected = button.dataset.selectDate; render(); }
      else if (button?.hasAttribute('data-today')) { model.selected = dateISO(new Date()); render(); }
      else if (button?.hasAttribute('data-step-date')) { moveDate(Number(button.dataset.stepDate)); render(); }
      else if (button?.hasAttribute('data-view')) { model.view = button.dataset.view; render(); }
      else if (button?.hasAttribute('data-add-event')) modal(model.selected);
      else if (button?.hasAttribute('data-close-modal') || event.target.matches('[data-modal-backdrop]')) document.querySelector('.planner-modal')?.remove();
    }, { signal });
    document.addEventListener('click', event => {
      if (event.target.closest('.planner-modal [data-close-modal]') || event.target.matches('[data-modal-backdrop]')) document.querySelector('.planner-modal')?.remove();
    }, { signal });
    main.addEventListener('change', event => {
      const source = event.target.dataset.source;
      if (!source) return;
      model.sources[source] = event.target.checked;
      render();
    }, { signal });
    document.addEventListener('submit', async event => {
      const form = event.target.closest('[data-event-form]');
      if (!form) return;
      event.preventDefault();
      const formData = new FormData(form);
      const title = String(formData.get('title') || '').trim(), date = String(formData.get('date') || '');
      if (!title || !date) return;
      await add('calendar', { title, date, start: String(formData.get('start') || ''), place: String(formData.get('place') || '') });
      model.selected = date;
      document.querySelector('.planner-modal')?.remove();
      render();
    }, { signal });
  };
}
