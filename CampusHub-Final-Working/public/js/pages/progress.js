let activeTab = 'goals';
let controller;

const icon = (name, size = 22) => {
  const paths = {
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="m13 11 7-7m-3 0h3v3"/>',
    trophy: '<path d="M8 21h8m-4-4v4m-6-17h12v6a6 6 0 0 1-12 0V4Zm0 2H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5"/>',
    goal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18m-13 5 2 2 4-4"/>',
    flag: '<path d="M5 21V4m0 0c7-5 10 5 17 0v11c-7 5-10-5-17 0"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

const percent = (value, target) => target > 0 ? Math.min(100, Math.max(0, Math.round(value / target * 100))) : 0;
const dateISO = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

function heroArt() {
  return `<svg class="progress-hero-art" viewBox="0 0 620 180" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <path fill="#fff" opacity=".7" d="M110 50q18-28 37 0 20-25 39 1h-76m155-26q16-24 33 0 20-21 36 1h-69"/>
    <path fill="#e5efb8" d="M0 157q85-48 169 0t165-2q93-55 174 0t112-2v27H0z"/>
    <g fill="#a6c5ee"><path d="M420 164q-15-60 10-102 29 49 13 102m75 0q-11-52 15-87 25 46 12 87m74 0q-18-72 11-114 34 61 14 114"/><path d="M435 163V62m80 101V77m77 86V52" stroke="#759ed9" stroke-width="4"/></g>
    <g fill="#6793d6"><path d="M190 165v-56h18v56zm33 0V91h18v74zm34 0V73h18v92zm34 0V53h18v112z"/><path d="m182 115 49-40 30 3 53-55" fill="none" stroke="#6f9df0" stroke-width="6"/><path d="m305 22 17-5-4 18"/></g>
    <g transform="translate(365 26)"><path fill="#f3c6a4" d="M40 31q2-22 25-22 25 0 25 27l-4 24H44z"/><path fill="#254d83" d="M39 34Q36 3 65 1q29-1 31 32-16-12-31-7-9 2-16 13z"/><path fill="#416ca9" d="M20 148q8-68 31-76l34 2q28 17 35 74z"/><path fill="#d9e9ff" d="M45 86h43l12 62H35z"/><path fill="#273e61" d="M32 103 1 132l8 9 38-21m41-16 37 24-7 10-44-18"/><rect x="66" y="108" width="44" height="31" rx="4" fill="#162f54"/><rect x="70" y="112" width="36" height="22" rx="2" fill="#80a8e7"/></g>
  </svg>`;
}

function goalCard(goal) {
  const current = Number(goal.cur) || 0, target = Number(goal.target) || 0, done = target > 0 && current >= target, progress = percent(current, target);
  return `<article class="progress-goal-card"><div class="progress-goal-main"><span class="progress-goal-icon">${icon('target')}</span><div class="progress-goal-copy"><div class="progress-goal-title-row"><h3>${esc(goal.title)}</h3>${done ? '<span class="progress-status complete">Complete</span>' : '<span class="progress-status">In progress</span>'}</div><p>${current} of ${target} completed</p><div class="progress-track"><i style="width:${progress}%"></i></div></div></div><div class="progress-goal-actions"><strong>${progress}%</strong><button type="button" data-goal-increment="${goal.id}" aria-label="Add progress to ${esc(goal.title)}" ${done ? 'disabled' : ''}>${icon('plus', 17)} Update</button><button class="progress-delete" type="button" data-delete="${goal.id}" aria-label="Delete ${esc(goal.title)}">${icon('trash', 17)}</button></div></article>`;
}

function taskRow(task) {
  return `<article class="progress-task-row${task.done ? ' done' : ''}"><label><input type="checkbox" data-task-toggle="${task.id}" ${task.done ? 'checked' : ''}><span class="progress-task-check">${icon('task', 16)}</span></label><div class="progress-task-copy"><strong>${esc(task.title)}</strong><span>${task.due ? `Due ${esc(dateLabel(task.due))}` : 'No due date'}${task.pri ? ` · ${esc(task.pri)} priority` : ''}</span></div><button class="progress-delete" type="button" data-delete="${task.id}" aria-label="Delete ${esc(task.title)}">${icon('trash', 17)}</button></article>`;
}

function achievementRow(item) {
  return `<article class="progress-achievement-row"><span class="achievement-icon">${icon('trophy', 20)}</span><div><strong>${esc(item.title)}</strong><span>${esc(dateLabel(item.date))}</span></div><button class="progress-delete" type="button" data-delete="${item.id}" aria-label="Delete ${esc(item.title)}">${icon('trash', 17)}</button></article>`;
}

function emptyState(kind) {
  const labels = {
    goals: ['No goals yet', 'Add your first goal to start tracking your progress and stay motivated.'],
    tasks: ['No tasks yet', 'Add a task to keep track of the steps in your campus journey.'],
    achievements: ['No achievements yet', 'Record a milestone when you accomplish something worth celebrating.'],
  }[kind];
  const focusAttr = kind === 'goals' ? 'data-focus-goal' : 'data-focus-tab-form';
  return `<div class="progress-empty"><svg viewBox="0 0 220 110" aria-hidden="true"><path fill="#e5f0ff" d="M0 92q30-36 65-5t65-7q42-42 90 8v22H0z"/><rect x="69" y="23" width="78" height="75" rx="11" fill="#8bb3f3"/><rect x="77" y="31" width="62" height="67" rx="7" fill="#eaf2ff"/><path d="M91 47h7v7h-7zm0 17h7v7h-7zm0 17h7v7h-7z" fill="#6e9df0"/><path d="m92 49 2 2 4-5m-6 22 2 2 4-5m-6 22 2 2 4-5" fill="none" stroke="#fff" stroke-width="1.5"/><path stroke="#6e9df0" stroke-width="6" stroke-linecap="round" d="M85 23v-8m22 8v-8m22 8v-8"/><path fill="#b5d5c4" d="M48 97q-8-34 7-50 18 24 10 50m99 0q-3-31 14-47 16 23 9 47"/></svg><h3>${labels[0]}</h3><p>${labels[1]}</p><button type="button" class="progress-primary" ${focusAttr}>${icon('plus', 17)} ${kind === 'goals' ? 'Add your first goal' : `Add ${kind === 'tasks' ? 'a task' : 'an achievement'}`}</button></div>`;
}

function tabContent(tab, goals, tasks, achievements) {
  const list = tab === 'goals' ? goals.map(goalCard).join('') : tab === 'tasks' ? tasks.map(taskRow).join('') : achievements.map(achievementRow).join('');
  const count = tab === 'goals' ? goals.length : tab === 'tasks' ? tasks.length : achievements.length;
  const form = tab === 'tasks' ? `<form class="progress-inline-form" data-task-form><label><span>New task</span><input name="title" maxlength="100" required placeholder="Task title"></label><label><span>Due date</span><input name="due" type="date"></label><label><span>Priority</span><select name="priority"><option>High</option><option selected>Medium</option><option>Low</option></select></label><button type="submit" class="progress-primary">${icon('plus', 17)} Add task</button></form>`
    : tab === 'achievements' ? `<form class="progress-inline-form" data-achievement-form><label><span>New achievement</span><input name="title" maxlength="100" required placeholder="Milestone title"></label><label><span>Date</span><input name="date" type="date" value="${dateISO(new Date())}"></label><button type="submit" class="progress-primary">${icon('plus', 17)} Add achievement</button></form>` : '';
  return `${form}${count ? `<div class="progress-list">${list}</div>` : emptyState(tab)}`;
}

export function register(R, A) {
  R.progress = async () => {
    const [goals, tasks, achievements] = await Promise.all([items('goal'), items('task'), items('ach')]);
    const completed = tasks.filter(task => task.done).length;
    const activeGoals = goals.filter(goal => Number(goal.cur) < Number(goal.target)).length;
    const completion = tasks.length ? percent(completed, tasks.length) : 0;
    return `<div class="progress-page">
      <section class="progress-hero"><div class="progress-hero-copy"><span>YOUR JOURNEY</span><h1>Progress tracker</h1><p>Set goals, track your tasks and stay consistent with your campus journey.</p></div>${heroArt()}</section>
      <section class="progress-stats" aria-label="Progress summary">
        <article class="progress-stat-card task-stat"><span class="progress-stat-icon">${icon('target', 34)}</span><div><h2>Tasks completed</h2><strong>${completed} <i>/</i> ${tasks.length}</strong><div class="progress-track"><i style="width:${completion}%"></i></div><p>${tasks.length ? `${completion}% of your tasks completed` : 'Add tasks to start tracking your progress.'}</p></div></article>
        <article class="progress-stat-card achievement-stat"><span class="progress-stat-icon">${icon('trophy', 34)}</span><div><h2>Achievements</h2><strong>${achievements.length}</strong><p>${achievements.length ? `${achievements.length} achievements recorded` : 'Your milestones will appear here.'}</p></div></article>
        <article class="progress-stat-card goal-stat"><span class="progress-stat-icon">${icon('goal', 34)}</span><div><h2>Active goals</h2><strong>${activeGoals}</strong><p>${activeGoals ? `${goals.length - activeGoals} completed goals` : 'Set a goal to begin tracking.'}</p></div></article>
      </section>
      <form class="progress-goal-form" data-goal-form><div class="progress-form-heading"><h2>Add a new goal</h2><p>Set a personal goal and break it into tasks to track your progress.</p></div><div class="progress-form-fields"><label class="progress-title-field">${icon('target')}<input name="title" maxlength="100" required autocomplete="off" placeholder="Goal title"></label><label class="progress-target-field">${icon('flag')}<input name="target" type="number" min="1" step="1" required placeholder="Target"></label><button type="submit" class="progress-primary">${icon('plus', 18)} Add goal</button></div>${heroArt()}</form>
      <section class="progress-content"><div class="progress-tabs" role="tablist" aria-label="Progress details">${[['goals', 'Goals'], ['tasks', 'Tasks'], ['achievements', 'Achievements']].map(([key, label]) => `<button type="button" role="tab" data-progress-tab="${key}" aria-selected="${activeTab === key}" class="${activeTab === key ? 'active' : ''}">${label}</button>`).join('')}</div><div class="progress-tab-panel" role="tabpanel">${tabContent(activeTab, goals, tasks, achievements)}</div></section>
    </div>`;
  };

  A.progress = () => {
    controller?.abort(); controller = new AbortController();
    const { signal } = controller, main = document.querySelector('#main');
    if (!main) return;
    main.addEventListener('click', async event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.progressTab) { activeTab = button.dataset.progressTab; render(); }
      else if (button.hasAttribute('data-focus-goal')) main.querySelector('[data-goal-form] input[name="title"]')?.focus();
      else if (button.hasAttribute('data-focus-tab-form')) main.querySelector('.progress-inline-form input[name="title"]')?.focus();
      else if (button.dataset.goalIncrement) {
        const goals = await items('goal'), goal = goals.find(item => Number(item.id) === Number(button.dataset.goalIncrement));
        if (goal) await patch(goal.id, { cur: Math.min(Number(goal.target) || 0, (Number(goal.cur) || 0) + 1) });
      } else if (button.dataset.delete) del(Number(button.dataset.delete));
    }, { signal });
    main.addEventListener('change', event => {
      if (event.target.dataset.taskToggle) patch(Number(event.target.dataset.taskToggle), { done: event.target.checked });
    }, { signal });
    main.addEventListener('submit', async event => {
      const form = event.target.closest('form');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      if (form.matches('[data-goal-form]')) {
        const title = String(data.get('title') || '').trim(), target = Number(data.get('target'));
        if (!title || !Number.isFinite(target) || target < 1) return;
        await add('goal', { title, target, cur: 0 });
        form.reset(); activeTab = 'goals'; render();
      } else if (form.matches('[data-task-form]')) {
        const title = String(data.get('title') || '').trim();
        if (!title) return;
        await add('task', { title, due: String(data.get('due') || ''), pri: String(data.get('priority') || 'Medium'), done: false });
        render();
      } else if (form.matches('[data-achievement-form]')) {
        const title = String(data.get('title') || '').trim();
        if (!title) return;
        await add('ach', { title, date: String(data.get('date') || dateISO(new Date())) });
        render();
      }
    }, { signal });
  };
}
