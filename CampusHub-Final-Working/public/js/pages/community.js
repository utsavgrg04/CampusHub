let activeCategory = 'all';
let searchQuery = '';
let sortOrder = 'latest';
let cachedPosts = [];
let controller;

const icon = (name, size = 20) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    message: '<path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.8L3 21l1.8-4.3A8.3 8.3 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z"/>',
    tag: '<path d="M20 13 13 20 3 10V3h7z"/><circle cx="7.5" cy="7.5" r="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function communityArt() {
  return `<svg class="community-hero-art" viewBox="0 0 720 180" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <path fill="#fff" opacity=".72" d="M70 60q19-28 40 0 21-25 42 1H70m278-29q17-25 34 0 20-22 38 1h-72m211 31q18-27 38 0 20-23 40 1h-78"/>
    <path fill="#e5efb8" d="M0 159q86-43 165 0t167-1q100-51 191 0t197-2v24H0z"/>
    <g fill="#a3c9cb"><path d="M18 181q-21-70 7-116 34 53 14 116m94 0q-12-57 13-91 29 47 14 91m441 0q-16-64 11-105 32 55 14 105m87 0q-13-59 14-94 29 48 13 94"/><path d="M35 181V66m88 114V91m455 90V75m81 107V94" stroke="#579d9a" stroke-width="5"/></g>
    <g transform="translate(245 42)"><path fill="#2863a8" d="M17 132q4-57 24-75l31-3q29 14 34 78z"/><path fill="#f0c6a6" d="M39 43q0-27 23-27 25 0 25 30L79 66H45z"/><path fill="#1f4778" d="M38 43Q34 8 62 8q29 0 31 34-15-11-28-6-12 3-18 14z"/><path fill="#1e3656" d="m22 79-20 39 8 6 28-33m61-16 31 21-6 9-37-14"/><rect x="84" y="102" width="39" height="27" rx="4" fill="#17365e"/><rect x="88" y="106" width="31" height="18" rx="2" fill="#8db5ee"/></g>
    <g transform="translate(382 38)"><path fill="#f1c5a3" d="M39 42q1-28 25-28t25 30L80 67H44z"/><path fill="#244d83" d="M38 43Q34 6 64 6t30 37q-16-14-31-7-10 3-17 14z"/><path fill="#d2e58f" d="M12 140q7-64 30-76l39 1q29 17 36 75z"/><path fill="#21426a" d="M34 92 6 118l6 9 38-24m47-13 38 25-6 9-43-19"/><path fill="#1c385f" d="M61 113h53v31H61z"/><path fill="#8db4ec" d="M66 118h43v20H66z"/></g>
    <g transform="translate(525 49)"><path fill="#f0c5a5" d="M32 38q0-25 23-25 24 0 24 28l-8 20H38z"/><path fill="#f6f4e9" d="M13 131q6-57 28-69l35 2q27 15 33 67z"/><path fill="#254c7d" d="M31 40Q29 7 56 7q27 0 26 33-14-11-28-6-10 3-16 14z"/></g>
    <g><rect x="345" y="14" width="66" height="39" rx="14" fill="#8db5f4"/><path fill="#8db5f4" d="m360 49-6 17 22-15"/><circle cx="365" cy="34" r="3" fill="white"/><circle cx="378" cy="34" r="3" fill="white"/><circle cx="391" cy="34" r="3" fill="white"/><rect x="480" y="25" width="69" height="38" rx="14" fill="#d4e78c"/><path fill="#d4e78c" d="m497 60-5 15 22-14"/><path d="M495 37h37m-37 9h24" stroke="white" stroke-width="3" stroke-linecap="round"/></g>
  </svg>`;
}

function parsePost(item) {
  let data = {};
  try { data = JSON.parse(item.data || '{}'); } catch { data = { text: String(item.data || '') }; }
  return { ...item, ...data, text: String(data.text || ''), category: String(data.category || '').trim() };
}

function initials(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function timeLabel(value) {
  if (!value) return '';
  const normalized = String(value).includes('T') ? value : String(value).replace(' ', 'T') + 'Z';
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function postCard(post) {
  return `<article class="community-post"><header class="community-post-head"><span class="community-avatar" aria-hidden="true">${esc(initials(post.name))}</span><div class="community-author"><strong>${esc(post.name)}</strong><time datetime="${esc(post.ts)}">${esc(timeLabel(post.ts))}</time></div>${post.category ? `<span class="community-category">${icon('tag', 14)}${esc(post.category)}</span>` : ''}${Number(post.uid) === Number(U.id) ? `<button class="community-delete" type="button" data-delete-post="${post.id}" aria-label="Delete post">${icon('trash', 17)}</button>` : ''}</header><p class="community-post-text">${esc(post.text).replace(/\n/g, '<br>')}</p></article>`;
}

function emptyState(query, category) {
  const filtered = Boolean(query || category !== 'all');
  return `<section class="community-empty"><svg viewBox="0 0 260 130" aria-hidden="true"><path fill="#e7f1ff" d="M0 105q38-43 78-7t79-8q47-46 103 12v28H0z"/><g fill="#a7c9f1"><path d="M22 127q-15-50 9-81 27 40 14 81m174 0q-12-45 12-73 24 35 13 73"/></g><rect x="74" y="25" width="112" height="67" rx="18" fill="#8db5f4"/><path fill="#8db5f4" d="m94 84-9 29 29-22"/><circle cx="106" cy="59" r="5" fill="white"/><circle cx="130" cy="59" r="5" fill="white"/><circle cx="154" cy="59" r="5" fill="white"/><rect x="161" y="53" width="45" height="38" rx="13" fill="#d6e98f" opacity=".8"/><path fill="#d6e98f" d="m171 85-3 18 17-15"/></svg><h2>${filtered ? 'No matching posts' : 'No posts yet'}</h2><p>${filtered ? 'Try another search or category.' : 'Be the first to start a conversation with your campus community!'}</p>${filtered ? '' : `<button type="button" class="community-primary" data-focus-composer>${icon('plus', 18)} Create a post</button>`}</section>`;
}

function filteredPosts() {
  const query = searchQuery.trim().toLowerCase();
  const posts = cachedPosts.filter(post => (activeCategory === 'all' || post.category === activeCategory) && (!query || `${post.text} ${post.name} ${post.category}`.toLowerCase().includes(query)));
  posts.sort((a, b) => sortOrder === 'latest' ? b.id - a.id : a.id - b.id);
  return posts;
}

export function register(R, A) {
  R.community = async () => {
    cachedPosts = (await api('community')).map(parsePost);
    const rows = cachedPosts;
    const categories = [...new Set(rows.map(post => post.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (activeCategory !== 'all' && !categories.includes(activeCategory)) activeCategory = 'all';
    const query = searchQuery.trim().toLowerCase();
    const posts = filteredPosts();
    return `<div class="community-page">
      <section class="community-hero"><div class="community-hero-copy"><h1>Campus community</h1><p>Share ideas, find collaborators, ask questions and connect<br>with people across campus.</p></div>${communityArt()}</section>
      <form class="community-composer" data-community-form><div class="community-avatar composer-avatar" aria-hidden="true">${esc(initials(U.name))}</div><div class="community-composer-main"><textarea name="text" maxlength="2000" required placeholder="Share something with campus..." aria-label="Write a community post"></textarea><div class="community-composer-footer"><label class="community-category-input">${icon('tag', 18)}<input name="category" maxlength="40" list="community-categories" placeholder="Add a category (optional)" aria-label="Post category"><datalist id="community-categories">${categories.map(category => `<option value="${esc(category)}">`).join('')}</datalist></label><button type="submit" class="community-primary">Post</button></div></div></form>
      <section class="community-toolbar"><nav class="community-filters" aria-label="Post categories"><button type="button" data-post-category="all" class="${activeCategory === 'all' ? 'active' : ''}" aria-pressed="${activeCategory === 'all'}">All posts</button>${categories.map(category => `<button type="button" data-post-category="${esc(category)}" class="${activeCategory === category ? 'active' : ''}" aria-pressed="${activeCategory === category}">${esc(category)}</button>`).join('')}</nav><label class="community-search">${icon('search', 19)}<input type="search" data-post-search value="${esc(searchQuery)}" placeholder="Search posts..." aria-label="Search community posts"></label><select class="community-sort" data-post-sort aria-label="Sort posts"><option value="latest" ${sortOrder === 'latest' ? 'selected' : ''}>Latest</option><option value="oldest" ${sortOrder === 'oldest' ? 'selected' : ''}>Oldest</option></select></section>
      <section class="community-feed" aria-live="polite">${posts.length ? posts.map(postCard).join('') : emptyState(query, activeCategory)}</section>
    </div>`;
  };

  A.community = () => {
    controller?.abort(); controller = new AbortController();
    const { signal } = controller, main = document.querySelector('#main');
    if (!main) return;
    let timer;
    const updateFeed = () => {
      const feed = main.querySelector('.community-feed');
      if (!feed) return;
      const posts = filteredPosts();
      feed.innerHTML = posts.length ? posts.map(postCard).join('') : emptyState(searchQuery.trim().toLowerCase(), activeCategory);
    };
    main.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-post-category')) {
        activeCategory = button.dataset.postCategory;
        main.querySelectorAll('[data-post-category]').forEach(chip => { const active = chip.dataset.postCategory === activeCategory; chip.classList.toggle('active', active); chip.setAttribute('aria-pressed', String(active)); });
        updateFeed();
      }
      else if (button.hasAttribute('data-delete-post')) del(Number(button.dataset.deletePost));
      else if (button.hasAttribute('data-focus-composer')) main.querySelector('[data-community-form] textarea')?.focus();
    }, { signal });
    main.querySelector('[data-post-search]')?.addEventListener('input', event => {
      searchQuery = event.target.value;
      clearTimeout(timer); timer = setTimeout(updateFeed, 100);
    }, { signal });
    main.querySelector('[data-post-sort]')?.addEventListener('change', event => { sortOrder = event.target.value; updateFeed(); }, { signal });
    main.addEventListener('submit', async event => {
      const form = event.target.closest('[data-community-form]');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form), text = String(data.get('text') || '').trim(), category = String(data.get('category') || '').trim();
      if (!text) return;
      await add('post', { text, ...(category ? { category } : {}) });
      searchQuery = ''; activeCategory = 'all';
      render();
    }, { signal });
  };
}
