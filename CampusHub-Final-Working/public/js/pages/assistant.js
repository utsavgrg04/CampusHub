export function register(R, A) {
  let chat = [];
  window.addEventListener('campushub:logout', () => { chat = []; });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const dateLabel = value => value ? esc(value) : 'No date set';

  R.assistant = async () => `<h2>Campus assistant</h2><div class="card chat" id="ch">${chat.map(([kind, message]) => `<p class="${kind}">${message}</p>`).join('') || '<p class="m">Ask about your events, registrations, tasks, reminders, goals or achievements.</p>'}</div><div class="row"><input id="aq" style="flex:1" placeholder="e.g. What deadlines are coming up?" aria-label="Ask about your CampusHub data" onkeydown="if(event.key==='Enter')ask()"><button type="button" onclick="ask()">Ask</button></div>`;

  async function ask() {
    const field = document.querySelector('#aq');
    const question = String(field?.value || '').trim();
    if (!question) return;

    const query = question.toLowerCase();
    const data = await window.all();
    const upcomingEvents = [...window.EV]
      .filter(event => event.date >= window.today() && !event.hidden)
      .sort((left, right) => left.date.localeCompare(right.date));
    const pendingTasks = data.task
      .filter(task => !task.done)
      .sort((left, right) => String(left.due || '9999-99-99').localeCompare(String(right.due || '9999-99-99')));
    const activeRegistrations = data.reg.filter(window.isActiveRegistration);
    const registeredIds = new Set(activeRegistrations.map(record => Number(record.eid)));
    const upcomingCalendar = data.calendar
      .filter(item => item.date >= window.today())
      .sort((left, right) => String(left.date).localeCompare(String(right.date)));
    let answer;

    if (/event|hackathon|workshop|competition/.test(query)) {
      answer = upcomingEvents.length
        ? `Upcoming events: ${upcomingEvents.slice(0, 5).map(event => `${esc(event.title)} — ${dateLabel(event.date)} at ${esc(event.venue || 'venue not listed')}`).join('; ')}`
        : 'There are no upcoming events in the event database.';
    } else if (/registr|signed up|booked/.test(query)) {
      const registeredEvents = window.EV.filter(event => registeredIds.has(Number(event.id)));
      answer = registeredEvents.length
        ? `Your registrations: ${registeredEvents.map(event => `${esc(event.title)} — ${dateLabel(event.date)}`).join('; ')}`
        : 'You have no event registrations yet.';
    } else if (/task|todo|pending|deadline/.test(query)) {
      answer = pendingTasks.length
        ? `Your pending tasks: ${pendingTasks.slice(0, 8).map(task => `${esc(task.title)} — ${dateLabel(task.due)}`).join('; ')}`
        : 'You have no pending tasks.';
      if (/deadline/.test(query) && upcomingCalendar.length) {
        answer += ` Upcoming calendar items: ${upcomingCalendar.slice(0, 5).map(item => `${esc(item.title)} — ${dateLabel(item.date)}`).join('; ')}`;
      }
    } else if (/remind|calendar|schedule/.test(query)) {
      answer = upcomingCalendar.length
        ? `Your upcoming calendar items: ${upcomingCalendar.slice(0, 8).map(item => `${esc(item.title)} — ${dateLabel(item.date)}${item.start ? ` at ${esc(item.start)}` : ''}`).join('; ')}`
        : 'You have no upcoming calendar reminders or personal events.';
    } else if (/goal|progress/.test(query)) {
      answer = data.goal.length
        ? `Your goals: ${data.goal.map(goal => `${esc(goal.title)} — ${Number(goal.cur) || 0} of ${Number(goal.target) || 0} complete`).join('; ')}`
        : 'You have not added any goals yet.';
    } else if (/achievement|award|milestone/.test(query)) {
      answer = data.ach.length
        ? `Your achievements: ${data.ach.slice(0, 8).map(item => `${esc(item.title)}${item.date ? ` — ${dateLabel(item.date)}` : ''}`).join('; ')}`
        : 'You have not recorded any achievements yet.';
    } else {
      answer = `I can search your saved campus data: ${upcomingEvents.length} upcoming event${upcomingEvents.length === 1 ? '' : 's'}, ${pendingTasks.length} pending task${pendingTasks.length === 1 ? '' : 's'}, ${upcomingCalendar.length} upcoming calendar item${upcomingCalendar.length === 1 ? '' : 's'}, ${activeRegistrations.length} registration${activeRegistrations.length === 1 ? '' : 's'}, ${data.goal.length} goal${data.goal.length === 1 ? '' : 's'} and ${data.ach.length} achievement${data.ach.length === 1 ? '' : 's'}. Ask about one of those sections.`;
    }

    chat.push(['me', esc(question)], ['bot', answer]);
    await window.add('history', { a: `Asked campus assistant: ${question}` });
    await window.render();
  }

  window.ask = ask;
}
