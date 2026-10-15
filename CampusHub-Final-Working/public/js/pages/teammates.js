let searchText = '';
let selectedDepartment = '';
let matchesOnly = false;
let teammateData = [];
let controller;

const icon = (name, size = 20) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    location: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

function heroArt() {
  return `<svg class="teammates-hero-art" viewBox="0 0 720 175" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><path fill="#fff" opacity=".78" d="M70 48q19-29 39 0 20-25 41 1H70m300-29q17-25 36 0 21-22 39 1h-75m195 34q17-26 36 0 19-22 38 1h-74"/><path fill="#e5efb7" d="M0 155q86-45 168 0t163-1q101-53 191 0t198-2v23H0z"/><g fill="#a3c9cb"><path d="M17 177q-21-70 7-116 34 53 14 116m90 0q-12-56 13-91 28 46 14 91m447 0q-16-63 11-104 32 54 14 104m77 0q-13-58 14-93 28 47 13 93"/><path d="M34 177V62m85 114V87m460 90V72m80 105V91" stroke="#579d9a" stroke-width="5"/></g><g transform="translate(235 37)"><path fill="#2c64a7" d="M13 137q5-62 28-81l35-1q31 17 35 82z"/><path fill="#f1c5a3" d="M38 46q0-29 25-29 26 0 26 32L80 69H44z"/><path fill="#21497a" d="M37 47Q33 8 64 8q30 0 31 39-17-14-32-7-11 3-18 15z"/><path fill="#21416b" d="m24 85-22 42 9 6 30-36m60-18 37 25-7 10-43-19"/><rect x="88" y="107" width="40" height="27" rx="4" fill="#19385f"/><rect x="92" y="111" width="32" height="19" rx="2" fill="#8fb8ef"/></g><g transform="translate(385 31)"><path fill="#efc4a4" d="M41 44q1-29 25-29 25 0 25 31L82 68H46z"/><path fill="#244d83" d="M39 44Q35 6 66 6t31 39q-16-14-31-7-12 3-18 15z"/><path fill="#d1e58e" d="M13 145q7-68 32-82l38 1q29 19 35 81z"/><path fill="#24446d" d="M41 95 12 124l8 8 37-28m44-14 41 25-7 10-46-18"/><rect x="67" y="108" width="51" height="35" rx="4" fill="#18385f"/><rect x="72" y="113" width="41" height="24" rx="2" fill="#83ace9"/></g><g transform="translate(540 45)"><path fill="#f1c5a4" d="M32 40q0-26 23-26t24 29l-8 20H38z"/><path fill="#f7f5ed" d="M9 132q7-58 30-70l37 2q29 17 36 68z"/><path fill="#254c7d" d="M31 41Q29 6 56 6t27 36q-14-12-28-7-10 3-17 15z"/></g><g><rect x="344" y="12" width="63" height="37" rx="13" fill="#8db5f4"/><path fill="#8db5f4" d="m359 45-5 15 22-14"/><circle cx="363" cy="30" r="3" fill="#fff"/><circle cx="375" cy="30" r="3" fill="#fff"/><circle cx="387" cy="30" r="3" fill="#fff"/></g></svg>`;
}

function parseProfile(person) {
  try { return { ...person, profile: JSON.parse(person.profile || '{}') }; }
  catch { return { ...person, profile: {} }; }
}
function tokens(value) { return String(value || '').split(/[,;\n]+/).map(item => item.trim()).filter(Boolean); }
function initials(name) { return String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
function initialsHue(name) { let hash = 0; for (const char of String(name || '')) hash = (hash * 31 + char.charCodeAt(0)) | 0; return Math.abs(hash) % 360; }
function department(profile) { return String(profile.department || profile.course || '').trim(); }
function sharedSkills(profile) {
  const mine = new Set(kw().map(item => item.toLowerCase()));
  const items = [...tokens(profile.skills), ...tokens(profile.interests)];
  return items.filter((item, index) => items.findIndex(value => value.toLowerCase() === item.toLowerCase()) === index && item.toLowerCase().split(/[\s,;]+/).some(word => mine.has(word)));
}

function teammateCard(person) {
  const profile = person.profile;
  const shared = sharedSkills(profile);
  const skills = tokens(profile.skills), interests = tokens(profile.interests);
  const tags = [...skills.map(value => ({ value, kind: 'skill' })), ...interests.map(value => ({ value, kind: 'interest' }))]
    .filter((item, index, all) => all.findIndex(entry => entry.value.toLowerCase() === item.value.toLowerCase()) === index).slice(0, 5);
  const course = String(profile.course || '').trim(), year = String(profile.year || '').trim();
  const about = String(profile.bio || profile.about || '').trim();
  const dept = department(profile);
  const avatar = String(profile.avatar || '').trim();
  const avatarMarkup = avatar ? `<img src="${esc(avatar)}" alt="" loading="lazy">` : esc(initials(person.name));
  const contactValue = String(profile.contact || '').trim();
  const contact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue) ? contactValue : '';
  const connect = contact ? `mailto:${encodeURIComponent(contact)}` : '#/community';
  return `<article class="teammate-card"><div class="teammate-card-head"><span class="teammate-avatar" style="--avatar-hue:${initialsHue(person.name)}">${avatarMarkup}</span><div class="teammate-heading"><h2>${esc(person.name)}</h2><p>${[course, year && `Year ${year}`].filter(Boolean).map(esc).join(' · ') || 'Campus member'}</p></div><span class="teammate-more" aria-hidden="true">${icon('more', 20)}</span></div>
    ${tags.length ? `<div class="teammate-tags">${tags.map(item => `<span class="teammate-tag ${item.kind}${shared.some(value => value.toLowerCase() === item.value.toLowerCase()) ? ' shared' : ''}">${esc(item.value)}</span>`).join('')}</div>` : ''}
    <p class="teammate-summary">${esc(about || 'Open to meeting peers and collaborating on campus projects.')}</p>
    <div class="teammate-card-footer"><span>${icon('location', 17)}<span>${esc(dept || 'Department not added')}</span></span><a class="teammate-connect" href="${esc(connect)}" title="${contact ? 'Email this teammate' : 'Open Campus Community to connect'}">${icon('person', 17)} Connect</a></div>
  </article>`;
}

function filterPeople() {
  const query = searchText.trim().toLowerCase();
  return teammateData.filter(person => {
    const profile = person.profile;
    const dept = department(profile);
    if (selectedDepartment && dept !== selectedDepartment) return false;
    const shared = sharedSkills(profile);
    if (matchesOnly && !shared.length) return false;
    const text = [person.name, dept, profile.course, profile.year, profile.skills, profile.interests, profile.bio, profile.about].join(' ').toLowerCase();
    return !query || text.includes(query);
  }).sort((a, b) => sharedSkills(b.profile).length - sharedSkills(a.profile).length || String(a.name).localeCompare(String(b.name)));
}

function emptyState() {
  const heading = matchesOnly ? 'No matches found' : 'No teammates found';
  const detail = matchesOnly ? 'Update your profile interests or show everyone to explore more people.' : 'Try another search or department filter.';
  return `<section class="teammates-empty"><span>${icon('person', 30)}</span><h2>${heading}</h2><p>${detail}</p>${matchesOnly ? '<button type="button" class="teammates-primary" data-match-toggle>Show everyone</button>' : ''}</section>`;
}

function updateCards(main) {
  const list = main.querySelector('.teammates-grid');
  if (!list) return;
  const people = filterPeople();
  list.innerHTML = people.length ? people.map(teammateCard).join('') : emptyState();
}

export function register(R, A) {
  R.team = async () => {
    teammateData = (await api('teammates')).map(parseProfile);
    const departments = [...new Set(teammateData.map(person => department(person.profile)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (selectedDepartment && !departments.includes(selectedDepartment)) selectedDepartment = '';
    const people = filterPeople();
    return `<div class="teammates-page"><section class="teammates-hero"><div class="teammates-hero-copy"><span>YOUR CAMPUS NETWORK</span><h1>Teammates</h1><p>Find and connect with like-minded peers, build teams and grow together.</p></div>${heroArt()}</section>
      <section class="teammates-controls"><label class="teammates-search">${icon('search', 22)}<input type="search" data-teammate-search value="${esc(searchText)}" placeholder="Search teammates by name, skills, interests or department..." aria-label="Search teammates"></label><label class="teammates-department"><select data-teammate-department aria-label="Filter by department"><option value="">All Departments</option>${departments.map(value => `<option value="${esc(value)}" ${selectedDepartment === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label><button type="button" class="teammates-primary ${matchesOnly ? 'selected' : ''}" data-match-toggle aria-label="${matchesOnly ? 'Show everyone' : 'Find teammates with shared interests'}">${icon('person', 18)}${matchesOnly ? 'Show Everyone' : 'Find Teammates'}</button></section>
      <section class="teammates-grid" aria-live="polite">${people.length ? people.map(teammateCard).join('') : emptyState()}</section>
    </div>`;
  };

  A.team = () => {
    controller?.abort(); controller = new AbortController();
    const { signal } = controller;
    const main = document.querySelector('#main');
    if (!main) return;
    main.querySelector('[data-teammate-search]')?.addEventListener('input', event => { searchText = event.target.value; updateCards(main); }, { signal });
    main.querySelector('[data-teammate-department]')?.addEventListener('change', event => { selectedDepartment = event.target.value; updateCards(main); }, { signal });
    main.addEventListener('click', event => {
      const toggle = event.target.closest('[data-match-toggle]');
      if (toggle) {
        matchesOnly = !matchesOnly;
        const mainButton = main.querySelector('.teammates-controls [data-match-toggle]');
        if (mainButton) { mainButton.classList.toggle('selected', matchesOnly); mainButton.innerHTML = `${icon('person', 18)}${matchesOnly ? 'Show Everyone' : 'Find Teammates'}`; mainButton.setAttribute('aria-label', matchesOnly ? 'Show everyone' : 'Find teammates with shared interests'); }
        updateCards(main);
        return;
      }
    }, { signal });
  };
}
