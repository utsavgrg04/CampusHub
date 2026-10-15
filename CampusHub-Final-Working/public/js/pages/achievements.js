let activeCategory = 'all';
let controller;

const localISO = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
const icon = (name, size = 24) => {
  const paths = {
    trophy: '<path d="M8 21h8m-4-4v4m-6-17h12v6a6 6 0 0 1-12 0V4Zm0 2H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    chart: '<path d="M4 20v-6h4v6zm6 0V9h4v11zm6 0V4h4v16z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function journeyArt() {
  return `<svg class="achievement-hero-art" viewBox="0 0 680 190" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <path fill="#fff" opacity=".75" d="M105 55q19-28 38 0 21-25 39 1h-77m145-29q16-24 35 0 20-21 39 1h-74m290 44q17-26 36 0 20-22 39 1h-75"/>
    <path fill="#e5efb8" d="M0 170q94-49 183 0t178-1q107-59 190 0t129-3v24H0z"/>
    <g fill="#a5c7e9"><path d="M20 190q-20-71 9-114 34 53 14 114m70 0q-11-52 12-86 26 44 12 86m451 0q-16-63 11-103 30 51 13 103m72 0q-13-58 13-93 27 47 13 93"/><path d="M38 190V77m66 112V104m472 87V88m75 102V102" stroke="#6f9dcd" stroke-width="5"/></g>
    <g transform="translate(274 15)"><path fill="#eeb946" d="M36 0h68v18a34 34 0 0 1-68 0z"/><path fill="#f8d978" d="M36 8H14v15q0 27 32 28V39Q27 36 27 21V19h9m68-11h22v15q0 27-32 28V39q19-3 19-18V19h-9"/><path fill="#c78d2c" d="M63 49h14v27H63zM51 75h38v9H51z"/><path fill="#f2ca61" d="m70 10 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z"/></g>
    <g transform="translate(414 32)"><path fill="#f1c4a3" d="M39 31q2-24 26-24 25 0 25 28L84 61H43z"/><path fill="#254d83" d="M38 33Q34 2 64 0q30 0 32 34-15-14-30-8-12 3-18 14z"/><path fill="#cde08c" d="M18 156q7-72 31-82l37 1q29 18 37 81z"/><path fill="#24446d" d="m31 94-26 40 9 8 38-33m40-17 38 27-7 10-45-20"/><path fill="#24446d" d="M66 113h52v36H66z"/><path fill="#7fa8e7" d="M71 118h42v26H71z"/></g>
    <path fill="#fff" opacity=".6" d="M0 182q131-16 256 1t224-2q108-16 200 1v8H0Z"/>
  </svg>`;
}

function calculateStreak(items) {
  const dates = [...new Set(items.map(item => item.date).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  if (!dates.length) return 0;
  const today = new Date(`${localISO(new Date())}T12:00:00`), latest = new Date(`${dates[0]}T12:00:00`);
  const gap = Math.round((today - latest) / 86400000);
  if (gap > 1 || gap < 0) return 0;
  let streak = 1;
  for (let index = 1; index < dates.length; index++) {
    const newer = new Date(`${dates[index - 1]}T12:00:00`), older = new Date(`${dates[index]}T12:00:00`);
    if (Math.round((newer - older) / 86400000) !== 1) break;
    streak++;
  }
  return streak;
}

function achievementCard(item) {
  const category = String(item.category || '').trim();
  return `<article class="achievement-record"><div class="achievement-record-top"><span class="achievement-record-icon">${icon(item.badge ? 'star' : 'trophy', 22)}</span>${item.badge ? '<span class="achievement-badge-pill">Badge earned</span>' : ''}<button type="button" class="achievement-delete" data-delete-achievement="${item.id}" aria-label="Delete ${esc(item.title)}">${icon('trash', 17)}</button></div><h3>${esc(item.title)}</h3><div class="achievement-record-meta"><span>${icon('calendar', 15)}${esc(formatDate(item.date))}</span>${category ? `<i>${esc(category)}</i>` : ''}</div></article>`;
}

function emptyState() {
  return `<div class="achievement-empty"><svg viewBox="0 0 250 120" aria-hidden="true"><path fill="#e8f2ff" d="M0 97q34-39 74-7t71-8q48-48 105 10v28H0z"/><path fill="#a8c8f0" d="M28 108q-15-46 7-74 25 35 12 74m157 0q-10-40 11-66 22 37 11 66"/><circle cx="125" cy="58" r="48" fill="#83adf0"/><circle cx="125" cy="58" r="34" fill="#a9c8fb"/><circle cx="125" cy="58" r="23" fill="#4f8de7"/><path fill="#ffdf75" d="m125 40 6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z"/><path fill="#c4def5" d="M76 109q3-37 25-49 20 20 19 49m28 0q5-34 29-47 15 21 11 47"/></svg><h3>No achievements yet</h3><p>Add your first achievement to start tracking your progress and celebrating your milestones.</p><button type="button" class="achievement-primary" data-focus-achievement>${icon('plus', 17)} Add your first achievement</button></div>`;
}

function achievementForm(categories) {
  return `<form class="achievement-form" data-achievement-form><div class="achievement-form-heading"><h2>Add a new achievement</h2><p>Log your achievements and keep track of your journey.</p></div><div class="achievement-form-fields"><label class="achievement-title-field">${icon('trophy', 20)}<input name="title" maxlength="120" required autocomplete="off" placeholder="Achievement or milestone"></label><label class="achievement-category-field"><input name="category" maxlength="40" list="achievement-categories" autocomplete="off" placeholder="Category (optional)"><datalist id="achievement-categories">${categories.map(category => `<option value="${esc(category)}">`).join('')}</datalist></label><label class="achievement-date-field">${icon('calendar', 18)}<input name="date" type="date" value="${localISO(new Date())}" required></label><label class="achievement-badge-field"><input type="checkbox" name="badge"><span>Badge earned</span></label><button type="submit" class="achievement-primary">${icon('plus', 18)} Add achievement</button></div>${journeyArt()}</form>`;
}

export function register(R, A) {
  R.ach = async () => {
    const achievements = await items('ach');
    const categories = [...new Set(achievements.map(item => String(item.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (activeCategory !== 'all' && !categories.includes(activeCategory)) activeCategory = 'all';
    const visible = activeCategory === 'all' ? achievements : achievements.filter(item => (item.category || '') === activeCategory);
    const badges = achievements.filter(item => item.badge).length;
    const streak = calculateStreak(achievements);
    return `<div class="achievement-page">
      <section class="achievement-hero"><div class="achievement-hero-copy"><span>YOUR MILESTONES</span><h1>Achievements &amp; badges</h1><p>Celebrate your progress, track your milestones and unlock new badges.</p></div>${journeyArt()}</section>
      <section class="achievement-stats" aria-label="Achievement summary"><article class="achievement-stat"><span class="stat-icon trophy">${icon('trophy', 31)}</span><div><p>Total achievements</p><strong>${achievements.length}</strong></div></article><article class="achievement-stat"><span class="stat-icon streak">${icon('star', 29)}</span><div><p>Streak</p><strong>${streak} ${streak === 1 ? 'day' : 'days'}</strong></div></article><article class="achievement-stat"><span class="stat-icon badges">${icon('chart', 29)}</span><div><p>Badges earned</p><strong>${badges}</strong></div></article></section>
      ${achievementForm(categories)}
      <nav class="achievement-filters" aria-label="Filter achievements"><button type="button" data-category-filter="all" class="${activeCategory === 'all' ? 'active' : ''}" aria-pressed="${activeCategory === 'all'}">All</button>${categories.map(category => `<button type="button" data-category-filter="${esc(category)}" class="${activeCategory === category ? 'active' : ''}" aria-pressed="${activeCategory === category}">${esc(category)}</button>`).join('')}</nav>
      <section class="achievement-results" aria-live="polite">${visible.length ? `<div class="achievement-grid">${visible.map(achievementCard).join('')}</div>` : activeCategory === 'all' ? emptyState() : `<div class="achievement-filter-empty">No achievements in ${esc(activeCategory)} yet.</div>`}</section>
    </div>`;
  };

  A.ach = () => {
    controller?.abort(); controller = new AbortController();
    const { signal } = controller, main = document.querySelector('#main');
    if (!main) return;
    // Keep this delegated click binding stable while a save-triggered render
    // replaces the page content. The #main element itself remains mounted.
    main.onclick = event => {
      if (!location.hash.replace(/^#\/?/, '').startsWith('ach')) return;
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-category-filter')) { activeCategory = button.dataset.categoryFilter; render(); }
      else if (button.hasAttribute('data-focus-achievement')) main.querySelector('[data-achievement-form] input[name="title"]')?.focus();
      else if (button.hasAttribute('data-delete-achievement')) del(Number(button.dataset.deleteAchievement));
    };
    main.addEventListener('submit', async event => {
      const form = event.target.closest('[data-achievement-form]');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form), title = String(data.get('title') || '').trim();
      if (!title) return;
      const category = String(data.get('category') || '').trim();
      await add('ach', { title, date: String(data.get('date') || localISO(new Date())), ...(category ? { category } : {}), badge: data.get('badge') === 'on' });
      form.reset();
      activeCategory = 'all';
      render();
    }, { signal });
  };
}
