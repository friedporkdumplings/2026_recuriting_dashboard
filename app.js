const state = {
  jobs: [],
  payload: {},
  universe: null,
  categories: new Set(),
  quick: new Set(),
  locations: new Set(),
  industries: new Set(),
  tiers: new Set(),
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
  sort: document.querySelector('#sortFilter'),
  stats: document.querySelector('#stats'),
  categoryNav: document.querySelector('#categoryNav'),
  quickFilters: document.querySelector('#quickFilters'),
  resultCount: document.querySelector('#resultCount'),
  feedTitle: document.querySelector('#feedTitle'),
  refreshStamp: document.querySelector('#refreshStamp'),
  coverageStamp: document.querySelector('#coverageStamp'),
  empty: document.querySelector('#emptyState'),
  locationOptions: document.querySelector('#locationOptions'),
  locationSummary: document.querySelector('#locationSummary'),
  industryOptions: document.querySelector('#industryOptions'),
  industrySummary: document.querySelector('#industrySummary'),
  tierOptions: document.querySelector('#tierOptions'),
  tierSummary: document.querySelector('#tierSummary'),
  resetFilters: document.querySelector('#resetFilters'),
};

const categories = [
  'Product Management', 'Strategy & Operations', 'Consulting', 'Marketing & GTM',
  'Program Management', 'Innovation & AI', 'Customer & Solutions', 'Research & Insights',
  'Partnerships & BD', 'Marketplace & Growth'
];

const quickFilters = ['🔥 Apply ASAP', 'Priority A', 'New Grad', 'Entry Level', 'Associate', 'Analyst', 'Internship', 'Remote', 'NYC', 'California'];

const locationLabels = {
  usa: 'USA based',
  'new york': 'New York',
  california: 'California',
  remote: 'Remote',
  chicago: 'Chicago',
  boston: 'Boston',
  seattle: 'Seattle',
  austin: 'Austin',
  shanghai: 'Shanghai',
  london: 'London',
  canada: 'Canada',
};

const tierLabels = { A: 'Priority A', B: 'Priority B', C: 'Priority C' };

const US_STATE_NAMES = [
  'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho',
  'illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi',
  'missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio',
  'oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia',
  'washington','west virginia','wisconsin','wyoming','district of columbia'
];

const US_CITY_HINTS = [
  'new york','nyc','manhattan','brooklyn','san francisco','los angeles','mountain view','palo alto','san jose','sunnyvale','burbank',
  'santa monica','seattle','austin','chicago','boston','atlanta','miami','orlando','tampa','dallas','houston','denver','phoenix',
  'philadelphia','pittsburgh','washington dc','washington, dc','arlington','mclean','reston','raleigh','charlotte','nashville',
  'minneapolis','detroit','columbus','cincinnati','cleveland','portland','salt lake city','las vegas','san diego','irvine','bellevue',
  'redmond','menlo park','cupertino','bentonville','st. louis','st louis','jersey city','hoboken','stamford','hartford'
];

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

function isUsaLocation(location) {
  const original = location || '';
  const loc = original.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!loc) return false;

  if (/\bunited states\b|\busa\b|\bu\.s\.a\.?\b|\bunited states of america\b/.test(loc)) return true;
  if (/\bremote\b.*\b(us|u\.s\.|usa|united states)\b|\b(us|u\.s\.|usa)\b.*\bremote\b/.test(loc)) return true;

  // Common U.S. state abbreviation formatting: "New York, NY", "Austin, TX", etc.
  if (/,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i.test(original)) return true;

  if (US_STATE_NAMES.some(stateName => loc.includes(stateName))) return true;
  if (US_CITY_HINTS.some(city => loc.includes(city))) return true;
  return false;
}

function locationMatchesValue(location, value) {
  const loc = (location || '').toLowerCase();
  if (value === 'usa') return isUsaLocation(location);
  if (value === 'new york') return /new york|nyc|manhattan|brooklyn/.test(loc);
  if (value === 'california') return /california|san francisco|los angeles|mountain view|palo alto|san jose|bay area|sunnyvale|burbank|santa monica|san diego|irvine|cupertino|menlo park/.test(loc);
  if (value === 'canada') return /canada|toronto|vancouver|montreal/.test(loc);
  if (value === 'remote') return /remote|work from home|virtual/.test(loc);
  return loc.includes(value);
}

function locationMatches(location) {
  if (state.locations.size === 0) return true;
  return [...state.locations].some(value => locationMatchesValue(location, value));
}

function quickMatchesOne(job, item) {
  const hay = `${job.title} ${job.location} ${job.employmentType || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  if (item === '🔥 Apply ASAP') return (job.matchScore || 0) >= 85 && ageInDays(job.postedAt) <= 3;
  if (item === 'Priority A') return job.companyTier === 'A';
  if (item === 'NYC') return /new york|nyc|manhattan|brooklyn/.test(hay);
  if (item === 'California') return /california|san francisco|los angeles|mountain view|palo alto|san jose|bay area|sunnyvale|burbank|santa monica|san diego|irvine|cupertino|menlo park/.test(hay);
  return hay.includes(item.toLowerCase());
}

function quickMatches(job) {
  if (state.quick.size === 0) return true;
  return [...state.quick].some(item => quickMatchesOne(job, item));
}

function filteredJobs() {
  const query = els.search.value.trim().toLowerCase();
  const freshness = els.freshness.value;

  let list = state.jobs.filter(job => {
    if (state.hidden.has(job.id)) return false;
    if (state.view === 'saved' && !state.saved.has(job.id)) return false;
    if (state.view === 'applied' && !state.applied.has(job.id)) return false;

    if (state.categories.size && !state.categories.has(job.category)) return false;
    if (!quickMatches(job)) return false;
    if (!locationMatches(job.location)) return false;
    if (state.industries.size && !state.industries.has(job.industry || 'Other')) return false;
    if (state.tiers.size && !state.tiers.has(job.companyTier || 'C')) return false;
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

  const allBtn = document.createElement('button');
  allBtn.className = state.categories.size === 0 ? 'active' : '';
  allBtn.innerHTML = `<span>All</span><span class="count">${state.jobs.length}</span>`;
  allBtn.onclick = () => {
    state.categories.clear();
    state.view = 'all';
    render();
  };
  els.categoryNav.appendChild(allBtn);

  categories.forEach(category => {
    const btn = document.createElement('button');
    const count = state.jobs.filter(j => j.category === category).length;
    btn.className = state.categories.has(category) ? 'active' : '';
    btn.innerHTML = `<span>${category}</span><span class="count">${count}</span>`;
    btn.onclick = () => {
      state.categories.has(category) ? state.categories.delete(category) : state.categories.add(category);
      state.view = 'all';
      render();
    };
    els.categoryNav.appendChild(btn);
  });
}

function renderQuickFilters() {
  els.quickFilters.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `chip ${state.quick.size === 0 ? 'active' : ''}`;
  allBtn.textContent = 'All';
  allBtn.onclick = () => {
    state.quick.clear();
    render();
  };
  els.quickFilters.appendChild(allBtn);

  quickFilters.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `chip ${state.quick.has(item) ? 'active' : ''}`;
    btn.textContent = item;
    btn.onclick = () => {
      state.quick.has(item) ? state.quick.delete(item) : state.quick.add(item);
      render();
    };
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

  if (state.view === 'saved') {
    els.feedTitle.textContent = 'Saved jobs';
  } else if (state.view === 'applied') {
    els.feedTitle.textContent = 'Applied jobs';
  } else if (state.categories.size === 0) {
    els.feedTitle.textContent = 'All matching jobs';
  } else if (state.categories.size <= 2) {
    els.feedTitle.textContent = [...state.categories].join(' + ');
  } else {
    els.feedTitle.textContent = `${state.categories.size} categories selected`;
  }

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
      saveState();
      render();
    };

    node.querySelector('.hide-job').onclick = () => {
      state.hidden.add(job.id);
      saveState();
      render();
    };

    const apply = node.querySelector('.apply-btn');
    apply.href = job.url;

    const applied = node.querySelector('.mark-applied');
    applied.textContent = state.applied.has(job.id) ? '✓ Applied' : 'Mark applied';
    applied.classList.toggle('active', state.applied.has(job.id));
    applied.onclick = () => {
      state.applied.has(job.id) ? state.applied.delete(job.id) : state.applied.add(job.id);
      saveState();
      render();
    };

    card.dataset.id = job.id;
    els.jobs.appendChild(node);
  });
}

function summaryText(selectedSet, labels, fallback) {
  if (selectedSet.size === 0) return fallback;
  const names = [...selectedSet].map(value => labels?.[value] || value);
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join(' + ');
  return `${names.length} selected`;
}

function syncMultiSelectSummaries() {
  els.locationSummary.textContent = summaryText(state.locations, locationLabels, 'All locations');
  els.industrySummary.textContent = summaryText(state.industries, null, 'All industries');
  els.tierSummary.textContent = summaryText(state.tiers, tierLabels, 'All company tiers');
}

function bindStaticMultiSelect(container, stateSet) {
  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = stateSet.has(input.value);
    input.addEventListener('change', () => {
      input.checked ? stateSet.add(input.value) : stateSet.delete(input.value);
      render();
    });
  });
}

function populateIndustryOptions() {
  const industries = [...new Set(state.jobs.map(j => j.industry || 'Other').filter(Boolean))].sort();
  state.industries = new Set([...state.industries].filter(x => industries.includes(x)));
  els.industryOptions.innerHTML = '';

  industries.forEach(industry => {
    const label = document.createElement('label');
    label.className = 'multi-option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = industry;
    input.checked = state.industries.has(industry);
    input.addEventListener('change', () => {
      input.checked ? state.industries.add(industry) : state.industries.delete(industry);
      render();
    });

    const span = document.createElement('span');
    span.textContent = industry;
    label.append(input, span);
    els.industryOptions.appendChild(label);
  });
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
  syncMultiSelectSummaries();
}

function resetFilters() {
  state.categories.clear();
  state.quick.clear();
  state.locations.clear();
  state.industries.clear();
  state.tiers.clear();
  state.view = 'all';
  els.search.value = '';
  els.freshness.value = 'all';
  els.sort.value = 'newest';

  document.querySelectorAll('.multi-menu input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });

  render();
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

    populateIndustryOptions();
    bindStaticMultiSelect(els.locationOptions, state.locations);
    bindStaticMultiSelect(els.tierOptions, state.tiers);
    render();
  } catch (err) {
    console.error(err);
    els.refreshStamp.textContent = 'Could not load job feed';
  }
}

els.search.addEventListener('input', render);
els.freshness.addEventListener('change', render);
els.sort.addEventListener('change', render);
els.resetFilters.addEventListener('click', resetFilters);

document.querySelector('#showSavedBtn').onclick = () => {
  state.view = state.view === 'saved' ? 'all' : 'saved';
  render();
};

document.querySelector('#showAppliedBtn').onclick = () => {
  state.view = state.view === 'applied' ? 'all' : 'applied';
  render();
};

document.querySelector('#exportBtn').onclick = () => {
  const selected = state.jobs.filter(j => state.saved.has(j.id) || state.applied.has(j.id));
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), jobs: selected }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'recruiting-tracker-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

// Close multi-select menus when clicking elsewhere so the toolbar stays tidy.
document.addEventListener('click', event => {
  document.querySelectorAll('.multi-select[open]').forEach(details => {
    if (!details.contains(event.target)) details.removeAttribute('open');
  });
});

loadData();
