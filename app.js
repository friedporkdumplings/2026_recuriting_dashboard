const state = {
  jobs: [],
  category: 'All',
  quick: 'All',
  view: 'all',
  saved: new Set(JSON.parse(localStorage.getItem('savedJobs') || '[]')),
  applied: new Set(JSON.parse(localStorage.getItem('appliedJobs') || '[]')),
  hidden: new Set(JSON.parse(localStorage.getItem('hiddenJobs') || '[]')),
};

const els = {
  jobs: document.querySelector('#jobs'),
  template: document.querySelector('#jobTemplate'),
  search: document.querySelector('#searchInput'),
  freshness: document.querySelector('#freshnessFilter'),
  location: document.querySelector('#locationFilter'),
  sort: document.querySelector('#sortFilter'),
  stats: document.querySelector('#stats'),
  categoryNav: document.querySelector('#categoryNav'),
  quickFilters: document.querySelector('#quickFilters'),
  resultCount: document.querySelector('#resultCount'),
  feedTitle: document.querySelector('#feedTitle'),
  refreshStamp: document.querySelector('#refreshStamp'),
  empty: document.querySelector('#emptyState'),
};

const categories = [
  'All', 'Product Management', 'Strategy & Operations', 'Consulting', 'Marketing & GTM',
  'Program Management', 'Innovation & AI', 'Customer & Solutions', 'Research & Insights',
  'Partnerships & BD', 'Marketplace & Growth'
];

const quickFilters = ['All', 'New Grad', 'Internship', 'Entry Level', 'Remote', 'NYC', 'California'];

function saveState() {
  localStorage.setItem('savedJobs', JSON.stringify([...state.saved]));
  localStorage.setItem('appliedJobs', JSON.stringify([...state.applied]));
  localStorage.setItem('hiddenJobs', JSON.stringify([...state.hidden]));
}

function ageInDays(dateString) {
  if (!dateString) return Infinity;
  return (Date.now() - new Date(dateString).getTime()) / 86400000;
}

function ageLabel(dateString) {
  const days = ageInDays(dateString);
  if (!Number.isFinite(days)) return 'DATE UNKNOWN';
  if (days < 1 / 24) return 'JUST POSTED';
  if (days < 1) return `${Math.max(1, Math.floor(days * 24))}H AGO`;
  if (days < 2) return '1D AGO';
  return `${Math.floor(days)}D AGO`;
}

function locationMatches(location, value) {
  if (value === 'all') return true;
  return (location || '').toLowerCase().includes(value);
}

function quickMatches(job) {
  const hay = `${job.title} ${job.location} ${job.employmentType || ''}`.toLowerCase();
  const q = state.quick.toLowerCase();
  if (state.quick === 'All') return true;
  if (state.quick === 'NYC') return /new york|nyc|manhattan|brooklyn/.test(hay);
  if (state.quick === 'California') return /california|san francisco|los angeles|mountain view|palo alto|san jose|bay area|sunnyvale/.test(hay);
  return hay.includes(q);
}

function filteredJobs() {
  const query = els.search.value.trim().toLowerCase();
  const freshness = els.freshness.value;
  let list = state.jobs.filter(job => {
    if (state.hidden.has(job.id)) return false;
    if (state.view === 'saved' && !state.saved.has(job.id)) return false;
    if (state.view === 'applied' && !state.applied.has(job.id)) return false;
    if (state.category !== 'All' && job.category !== state.category) return false;
    if (!quickMatches(job)) return false;
    if (!locationMatches(job.location, els.location.value)) return false;
    if (freshness !== 'all' && ageInDays(job.postedAt) > Number(freshness)) return false;
    if (query) {
      const hay = `${job.title} ${job.company} ${job.location} ${job.category} ${(job.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  if (els.sort.value === 'newest') {
    list.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
  } else if (els.sort.value === 'match') {
    list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  } else {
    list.sort((a, b) => a.company.localeCompare(b.company));
  }
  return list;
}

function renderNav() {
  els.categoryNav.innerHTML = '';
  categories.forEach(category => {
    const btn = document.createElement('button');
    const count = category === 'All' ? state.jobs.length : state.jobs.filter(j => j.category === category).length;
    btn.className = state.category === category ? 'active' : '';
    btn.innerHTML = `<span>${category}</span><span class="count">${count}</span>`;
    btn.onclick = () => { state.category = category; state.view = 'all'; render(); };
    els.categoryNav.appendChild(btn);
  });
}

function renderQuickFilters() {
  els.quickFilters.innerHTML = '';
  quickFilters.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `chip ${state.quick === item ? 'active' : ''}`;
    btn.textContent = item;
    btn.onclick = () => { state.quick = item; render(); };
    els.quickFilters.appendChild(btn);
  });
}

function renderStats() {
  const day = state.jobs.filter(j => ageInDays(j.postedAt) <= 1).length;
  const three = state.jobs.filter(j => ageInDays(j.postedAt) <= 3).length;
  const stats = [
    [state.jobs.length, 'Matching jobs'],
    [day, 'Posted ≤24h'],
    [three, 'Posted ≤3d'],
    [state.saved.size, 'Saved'],
    [state.applied.size, 'Applied']
  ];
  els.stats.innerHTML = stats.map(([n, label]) => `<div class="stat"><strong>${n}</strong><span>${label}</span></div>`).join('');
}

function initials(company) {
  return company.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
}

function renderJobs() {
  const jobs = filteredJobs();
  els.jobs.innerHTML = '';
  els.empty.classList.toggle('hidden', jobs.length !== 0);
  els.resultCount.textContent = `${jobs.length} role${jobs.length === 1 ? '' : 's'}`;
  els.feedTitle.textContent = state.view === 'saved' ? 'Saved jobs' : state.view === 'applied' ? 'Applied jobs' : state.category === 'All' ? 'All matching jobs' : state.category;

  jobs.forEach(job => {
    const node = els.template.content.cloneNode(true);
    const card = node.querySelector('.job-card');
    node.querySelector('.company-mark').textContent = initials(job.company);
    node.querySelector('.company').textContent = job.company;
    node.querySelector('.title').textContent = job.title;
    node.querySelector('.meta').textContent = [job.location, job.employmentType].filter(Boolean).join(' · ');
    const age = node.querySelector('.age');
    age.textContent = ageLabel(job.postedAt);
    if (ageInDays(job.postedAt) <= 1) age.classList.add('new');
    node.querySelector('.source').textContent = job.source || 'CAREERS';
    node.querySelector('.match').textContent = `${job.matchScore || 0}%`;
    node.querySelector('.tags').innerHTML = [job.category, ...(job.tags || []).slice(0,3)].map(t => `<span class="tag">${t}</span>`).join('');

    const save = node.querySelector('.save');
    save.textContent = state.saved.has(job.id) ? '★' : '☆';
    save.classList.toggle('active', state.saved.has(job.id));
    save.onclick = () => {
      state.saved.has(job.id) ? state.saved.delete(job.id) : state.saved.add(job.id);
      saveState(); render();
    };

    node.querySelector('.hide-job').onclick = () => { state.hidden.add(job.id); saveState(); render(); };
    const apply = node.querySelector('.apply-btn');
    apply.href = job.url;
    const applied = node.querySelector('.mark-applied');
    applied.textContent = state.applied.has(job.id) ? '✓ Applied' : 'Mark applied';
    applied.classList.toggle('active', state.applied.has(job.id));
    applied.onclick = () => {
      state.applied.has(job.id) ? state.applied.delete(job.id) : state.applied.add(job.id);
      saveState(); render();
    };

    card.dataset.id = job.id;
    els.jobs.appendChild(node);
  });
}

function render() {
  renderNav();
  renderQuickFilters();
  renderStats();
  renderJobs();
}

async function loadJobs() {
  try {
    const res = await fetch(`data/jobs.json?ts=${Date.now()}`);
    if (!res.ok) throw new Error('Could not load jobs.json');
    const payload = await res.json();
    state.jobs = payload.jobs || [];
    els.refreshStamp.textContent = payload.generatedAt ? `Updated ${new Date(payload.generatedAt).toLocaleString()}` : 'Updated automatically';
    render();
  } catch (err) {
    console.error(err);
    els.refreshStamp.textContent = 'Could not load job feed';
  }
}

['input','change'].forEach(evt => els.search.addEventListener(evt, render));
[els.freshness, els.location, els.sort].forEach(el => el.addEventListener('change', render));

document.querySelector('#showSavedBtn').onclick = () => { state.view = state.view === 'saved' ? 'all' : 'saved'; render(); };
document.querySelector('#showAppliedBtn').onclick = () => { state.view = state.view === 'applied' ? 'all' : 'applied'; render(); };
document.querySelector('#exportBtn').onclick = () => {
  const selected = state.jobs.filter(j => state.saved.has(j.id) || state.applied.has(j.id));
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), jobs: selected }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'recruiting-tracker-export.json'; a.click();
  URL.revokeObjectURL(a.href);
};

loadJobs();
