const state = {
  jobs: [],
  payload: {},
  universe: null,
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
  industry: document.querySelector('#industryFilter'),
  tier: document.querySelector('#tierFilter'),
  sort: document.querySelector('#sortFilter'),
  stats: document.querySelector('#stats'),
  categoryNav: document.querySelector('#categoryNav'),
  quickFilters: document.querySelector('#quickFilters'),
  resultCount: document.querySelector('#resultCount'),
  feedTitle: document.querySelector('#feedTitle'),
  refreshStamp: document.querySelector('#refreshStamp'),
  coverageStamp: document.querySelector('#coverageStamp'),
  empty: document.querySelector('#emptyState'),
};

const categories = [
  'All', 'Product Management', 'Strategy & Operations', 'Consulting', 'Marketing & GTM',
  'Program Management', 'Innovation & AI', 'Customer & Solutions', 'Research & Insights',
  'Partnerships & BD', 'Marketplace & Growth'
];

const quickFilters = ['All', '🔥 Apply ASAP', 'Priority A', 'New Grad', 'Entry Level', 'Associate', 'Analyst', 'Internship', 'Remote', 'NYC', 'California'];

function saveState() {
  localStorage.setItem('savedJobs', JSON.stringify([...state.saved]));
  localStorage.setItem('appliedJobs', JSON.stringify([...state.applied]));
  localStorage.setItem('hiddenJobs', JSON.stringify([...state.hidden]));
}

function ageInDays(dateString) {
  if (!dateString) return Infinity;
  const age = (Date.now() - new Date(dateString).getTime()) / 86400000;
  return Number.isFinite(age) ? Math.max(0, age) : Infinity;
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
  const loc = (location || '').toLowerCase();
  if (value === 'new york') return /new york|nyc|manhattan|brooklyn/.test(loc);
  if (value === 'california') return /california|san francisco|los angeles|mountain view|palo alto|san jose|bay area|sunnyvale|burbank|santa monica/.test(loc);
  if (value === 'canada') return /canada|toronto|vancouver|montreal/.test(loc);
  return loc.includes(value);
}

function quickMatches(job) {
  const hay = `${job.title} ${job.location} ${job.employmentType || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  if (state.quick === 'All') return true;
  if (state.quick === '🔥 Apply ASAP') return (job.matchScore || 0) >= 85 && ageInDays(job.postedAt) <= 3;
  if (state.quick === 'Priority A') return job.companyTier === 'A';
  if (state.quick === 'NYC') return /new york|nyc|manhattan|brooklyn/.test(hay);
  if (state.quick === 'California') return /california|san francisco|los angeles|mountain view|palo alto|san jose|bay area|sunnyvale|burbank|santa monica/.test(hay);
  return hay.includes(state.quick.toLowerCase());
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
    if (els.industry.value !== 'all' && (job.industry || 'Other') !== els.industry.value) return false;
    if (els.tier.value !== 'all' && (job.companyTier || 'C') !== els.tier.value) return false;
    if (freshness !== 'all' && ageInDays(job.postedAt) > Number(freshness)) return false;
    if (query) {
      const hay = `${job.title} ${job.company} ${job.location} ${job.category} ${job.industry || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  if (els.sort.value === 'newest') {
    list.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
  } else if (els.sort.value === 'recommended') {
    list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0) || new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
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
  const asap = state.jobs.filter(j => (j.matchScore || 0) >= 85 && ageInDays(j.postedAt) <= 3).length;
  const healthy = state.payload.successfulSources ?? 0;
  const totalSources = state.payload.sourceCount ?? 0;
  const stats = [
    [state.jobs.length, 'Matching jobs'],
    [day, 'Posted ≤24h'],
    [asap, 'Apply ASAP'],
    [totalSources ? `${healthy}/${totalSources}` : '—', 'Sources live'],
    [state.saved.size, 'Saved'],
    [state.applied.size, 'Applied']
  ];
  els.stats.innerHTML = stats.map(([n, label]) => `<div class="stat"><strong>${n}</strong><span>${label}</span></div>`).join('');
}

function initials(company) {
  return company.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
}

function priorityLabel(job) {
  const score = job.matchScore || 0;
  if (score >= 90 && ageInDays(job.postedAt) <= 3) return '🔥 APPLY ASAP';
  if (score >= 85) return 'STRONG FIT';
  if (score >= 75) return 'GOOD FIT';
  return 'CONSIDER';
}

function scoreTooltip(job) {
  const b = job.scoreBreakdown;
  if (!b) return 'Heuristic fit score';
  return `Role ${b.roleFit} · Experience ${b.experienceFit} · Company ${b.companyFit} · Early-career ${b.careerFit} · Freshness ${b.freshness}`;
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
    const tier = node.querySelector('.tier');
    tier.textContent = `TIER ${job.companyTier || 'C'}`;
    tier.classList.add(`tier-${(job.companyTier || 'C').toLowerCase()}`);

    const match = node.querySelector('.match');
    match.textContent = `${job.matchScore || 0}%`;
    match.title = scoreTooltip(job);
    node.querySelector('.priority-text').textContent = priorityLabel(job);

    const tags = [job.category, job.industry, ...(job.tags || []).slice(0, 3)].filter(Boolean);
    node.querySelector('.tags').innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');

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

function populateIndustryFilter() {
  const current = els.industry.value;
  const industries = [...new Set(state.jobs.map(j => j.industry).filter(Boolean))].sort();
  els.industry.innerHTML = '<option value="all">All industries</option>' + industries.map(x => `<option value="${x}">${x}</option>`).join('');
  if ([...els.industry.options].some(o => o.value === current)) els.industry.value = current;
}

function renderCoverage() {
  const universeCount = state.universe?.count || 0;
  const automated = state.universe?.automatedCount || state.payload.sourceCount || 0;
  const failures = state.payload.failedSources || 0;
  const parts = [];
  const community = state.payload.communityFeedCount || 0;
  if (automated) parts.push(`${automated} direct ATS companies`);
  if (community) parts.push(`${community} broad early-career feeds`);
  if (universeCount) parts.push(`${universeCount} priority companies tracked`);
  if (failures) parts.push(`${failures} source failures this run`);
  els.coverageStamp.textContent = parts.join(' · ');
}

function render() {
  renderNav();
  renderQuickFilters();
  renderStats();
  renderJobs();
  renderCoverage();
}

async function loadData() {
  try {
    const [jobRes, universeRes] = await Promise.all([
      fetch(`data/jobs.json?ts=${Date.now()}`),
      fetch(`config/company-universe.json?ts=${Date.now()}`).catch(() => null)
    ]);
    if (!jobRes.ok) throw new Error('Could not load jobs.json');
    const payload = await jobRes.json();
    state.payload = payload;
    state.jobs = payload.jobs || [];

    if (universeRes?.ok) state.universe = await universeRes.json();

    els.refreshStamp.textContent = payload.generatedAt
      ? `Updated ${new Date(payload.generatedAt).toLocaleString()}`
      : 'Updated automatically';

    populateIndustryFilter();
    render();
  } catch (err) {
    console.error(err);
    els.refreshStamp.textContent = 'Could not load job feed';
  }
}

['input','change'].forEach(evt => els.search.addEventListener(evt, render));
[els.freshness, els.location, els.industry, els.tier, els.sort].forEach(el => el.addEventListener('change', render));
document.querySelector('#showSavedBtn').onclick = () => { state.view = state.view === 'saved' ? 'all' : 'saved'; render(); };
document.querySelector('#showAppliedBtn').onclick = () => { state.view = state.view === 'applied' ? 'all' : 'applied'; render(); };
document.querySelector('#exportBtn').onclick = () => {
  const selected = state.jobs.filter(j => state.saved.has(j.id) || state.applied.has(j.id));
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), jobs: selected }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'recruiting-tracker-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

loadData();
