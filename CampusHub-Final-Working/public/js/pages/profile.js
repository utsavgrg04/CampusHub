import { state } from '../core/state.js';

let controller;

const icon = (name, size = 20) => {
  const paths = {
    user: '<path d="M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    community: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.9M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-4a4 4 0 0 1 0 8"/>',
    trophy: '<path d="M8 21h8m-4-4v4m-6-17h12v6a6 6 0 0 1-12 0V4Zm0 2H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5"/>',
    robot: '<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4m-5 6h.01M17 13h.01M8 17h8m-9-14L5 5m11-2 2 2"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M3 12a9 9 0 0 1 3-6.7L8 7"/>',
    bolt: '<path d="m13 2-3 8H5l6 12 3-9h5L13 2Z"/>',
    edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    save: '<path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-7h10v7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    logout: '<path d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

const csv = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);

function initials(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function campusArt() {
  return `<svg class="profile-hero-art" viewBox="0 0 780 150" preserveAspectRatio="xMaxYMax meet" aria-hidden="true"><circle cx="628" cy="72" r="105" fill="#d8e7ff" opacity=".8"/><circle cx="720" cy="115" r="70" fill="#e7f1b8" opacity=".9"/><path d="M507 150c8-42 39-67 78-67s70 25 78 67" fill="#8db4ee"/><circle cx="585" cy="53" r="38" fill="#b9d5f7"/><path d="M585 28c-13 0-21 10-21 24 0 8 3 14 7 18-11 5-17 15-17 29v4h62v-4c0-14-6-24-17-29 4-5 7-11 7-19 0-14-8-23-21-23Z" fill="#204b8f"/><rect x="677" y="37" width="87" height="76" rx="14" fill="#fffdf8" stroke="#d0e0fa" stroke-width="3"/><circle cx="703" cy="64" r="13" fill="#e5efff"/><path d="M696 65a7 7 0 1 1 14 0m-17 17c1-6 5-9 10-9s9 3 10 9" fill="none" stroke="#568fe3" stroke-width="3" stroke-linecap="round"/><path d="M727 59h23m-23 10h18m-18 16h24" stroke="#9bb8e5" stroke-width="4" stroke-linecap="round"/><circle cx="758" cy="30" r="15" fill="#a8cb72"/><path d="m751 30 5 5 9-11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M509 37q18-26 36 0 17-22 35 0h-71m132-22q15-19 29 0 15-18 30 0h-59" fill="#fff" opacity=".8"/></svg>`;
}

function avatar(name) {
  return `<div class="profile-avatar" aria-label="${esc(name || 'Student')} profile avatar"><svg viewBox="0 0 100 112" aria-hidden="true"><circle cx="50" cy="50" r="49" fill="#b7dce2"/><path fill="#183e48" d="M50 17c-15 0-23 11-23 28 0 9 3 15 8 20-12 6-19 18-19 35v8h68v-8c0-17-7-29-19-35 5-6 8-13 8-22 0-16-8-26-23-26Z"/></svg><span>${esc(initials(name))}</span></div>`;
}

function tagField(name, label, values, placeholder) {
  return `<div class="profile-field profile-tag-field"><label for="${name}-entry">${label}</label><div class="profile-tagbox" data-tagbox="${name}"><div class="profile-tags">${values.map(value => `<span class="profile-tag">${esc(value)}<button type="button" data-remove-tag="${esc(name)}" data-tag-value="${esc(value)}" aria-label="Remove ${esc(value)}">×</button></span>`).join('')}<input id="${name}-entry" type="text" data-tag-entry="${name}" autocomplete="off" placeholder="${placeholder}"></div><input type="hidden" name="${name}" value="${esc(values.join(', '))}"></div><small>Press Enter to add</small></div>`;
}

export function register(R, A) {
  R.profile = async () => {
    const user = state.user, profile = user.profile || {};
    const [registrations, achievements] = await Promise.all([items('reg'), items('ach')]);
    const eventIds = new Set(registrations.filter(window.isActiveRegistration).map(item => Number(item.eid)));
    const registeredEvents = EV.filter(event => eventIds.has(Number(event.id)));
    const clubs = registeredEvents.filter(event => String(event.cat || '').toLowerCase() === 'club').length;
    const skills = csv(profile.skills), interests = csv(profile.interests);
    const name = user.name || '';
    return `<div class="profile-page">
      <section class="profile-hero"><div><h1>Profile</h1><p>Manage your CampusHub profile</p></div>${campusArt()}</section>
      <div class="profile-layout">
        <aside class="profile-sidebar">
          <section class="profile-panel profile-summary">${avatar(name)}<h2>${esc(name)}</h2><p>${esc(profile.course || 'Add your degree')}<span aria-hidden="true">&middot;</span>Year ${esc(profile.year || '-')}</p><button type="button" class="profile-bio-toggle" data-focus-bio>${icon('edit', 17)}<span>${profile.bio ? 'Edit your bio' : 'Add a short bio'}</span></button><blockquote>${profile.bio ? esc(profile.bio) : 'Add a short bio to introduce yourself to campus.'}</blockquote>
            <div class="profile-stats"><article class="profile-stat events" title="Registered events"><span>${icon('calendar', 21)}</span><b>${registeredEvents.length}</b><small>Events</small></article><article class="profile-stat clubs" title="Registered club events"><span>${icon('community', 21)}</span><b>${clubs}</b><small>Club</small></article><article class="profile-stat achievements"><span>${icon('trophy', 21)}</span><b>${achievements.length}</b><small>Achievements</small></article></div>
          </section>
          <section class="profile-panel profile-account-actions" aria-label="Account actions"><a class="profile-activity-link" href="#/history"><span>${icon('history', 22)}</span><b>Activity history<small>View your past activity</small></b>${icon('arrow', 18)}</a><button type="button" class="profile-logout" data-profile-logout>${icon('logout', 18)}<span>Log out</span></button></section>
        </aside>
        <form class="profile-panel profile-information" data-profile-form>
          <header class="profile-panel-heading"><span class="profile-heading-icon">${icon('user', 25)}</span><div><h2>Profile information</h2><p>This information will be visible to other students on CampusHub.</p></div></header>
          <div class="profile-basic-fields"><label class="profile-field"><span>Name</span><input name="name" value="${esc(name)}" autocomplete="name" required maxlength="80"></label><label class="profile-field"><span>Degree</span><input name="course" value="${esc(profile.course || '')}" placeholder="Add your degree" maxlength="100"></label><label class="profile-field"><span>Year</span><input name="year" value="${esc(profile.year || '')}" placeholder="Add your year" maxlength="30"></label></div>
          ${tagField('skills', 'Skills', skills, 'Add a skill...')}
          ${tagField('interests', 'Interests', interests, 'Add an interest...')}
          <label class="profile-field profile-bio-field" for="profile-bio" data-bio-field hidden><span>Short bio</span><textarea id="profile-bio" name="bio" rows="3" maxlength="240" placeholder="A little about you">${esc(profile.bio || '')}</textarea></label>
          <div class="profile-form-footer"><span class="profile-save-status" aria-live="polite"></span><div><button type="button" class="profile-secondary" data-cancel-profile>Cancel</button><button type="submit" class="profile-primary">${icon('save', 17)}Save changes</button></div></div>
        </form>
      </div>
    </div>`;
  };

  A.profile = () => {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller, main = document.querySelector('#main');
    if (!main) return;
    window.scrollTo(0, 0);
    document.querySelector('.shell>aside')?.scrollTo(0, 0);

    main.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-remove-tag')) {
        const field = button.dataset.removeTag, value = button.dataset.tagValue;
        const container = main.querySelector(`[data-tagbox="${CSS.escape(field)}"]`), hidden = container.querySelector(`[name="${CSS.escape(field)}"]`);
        hidden.value = csv(hidden.value).filter(tag => tag !== value).join(', ');
        container.querySelector('.profile-tags').querySelectorAll('.profile-tag').forEach(tag => { if (tag.textContent.slice(0, -1) === value) tag.remove(); });
      } else if (button.hasAttribute('data-cancel-profile')) render();
      else if (button.hasAttribute('data-focus-bio')) { const field = main.querySelector('[data-bio-field]'); field.hidden = false; main.querySelector('#profile-bio')?.focus(); }
      else if (button.hasAttribute('data-profile-logout')) logout();
    }, { signal });

    main.addEventListener('keydown', event => {
      const input = event.target.closest('[data-tag-entry]');
      if (!input || !['Enter', ','].includes(event.key)) return;
      event.preventDefault();
      const value = input.value.replace(/,/g, '').trim();
      if (!value) return;
      const field = input.dataset.tagEntry, container = input.closest('[data-tagbox]'), hidden = container.querySelector(`[name="${CSS.escape(field)}"]`), values = csv(hidden.value);
      if (values.some(item => item.toLowerCase() === value.toLowerCase())) { input.value = ''; return; }
      values.push(value); hidden.value = values.join(', ');
      const tag = document.createElement('span'); tag.className = 'profile-tag';
      tag.append(document.createTextNode(value));
      const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.removeTag = field; remove.dataset.tagValue = value; remove.setAttribute('aria-label', `Remove ${value}`); remove.textContent = '\u00d7';
      tag.append(remove); container.querySelector('.profile-tags').insertBefore(tag, input); input.value = '';
    }, { signal });

    main.addEventListener('submit', async event => {
      const form = event.target.closest('[data-profile-form]');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form), name = String(data.get('name') || '').trim();
      if (!name) return;
      const updated = await api('me', 'PUT', { name, profile: { ...state.user.profile, course: String(data.get('course') || '').trim(), year: String(data.get('year') || '').trim(), skills: String(data.get('skills') || ''), interests: String(data.get('interests') || ''), bio: String(data.get('bio') || '').trim() } });
      window.setCurrentUser(updated);
      await add('history', { a: 'Updated profile' });
      render();
    }, { signal });
  };
}
