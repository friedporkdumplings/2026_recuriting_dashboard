import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const config = JSON.parse(await fs.readFile(new URL('../config/sources.json', import.meta.url), 'utf8'));
const companyUniverse = JSON.parse(await fs.readFile(new URL('../config/company-universe.json', import.meta.url), 'utf8'));

function normalizeCompanyName(value='') {
  return String(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

const COMPANY_META = new Map(companyUniverse.companies.map(c => [normalizeCompanyName(c.company), c]));
const COMPANY_ALIASES = new Map([
  ['salesforce com', 'salesforce'],
  ['databricks', 'databricks'],
  ['appian', 'appian'],
  ['tiktok', 'tiktok'],
  ['byte dance', 'bytedance'],
  ['american express', 'american express'],
  ['amex', 'american express'],
  ['ibm', 'ibm'],
  ['microsoft', 'microsoft'],
  ['google', 'google'],
  ['meta', 'meta'],
  ['facebook', 'meta'],
  ['apple', 'apple'],
  ['amazon', 'amazon'],
  ['goldman sachs', 'goldman sachs'],
  ['jpmorgan chase', 'jpmorgan chase'],
  ['jp morgan', 'jpmorgan chase'],
  ['fidelity', 'fidelity investments'],
  ['fidelity international', 'fidelity investments']
]);

function companyMeta(company='') {
  const normalized = normalizeCompanyName(company);
  const canonical = COMPANY_ALIASES.get(normalized) || normalized;
  return COMPANY_META.get(canonical) || COMPANY_META.get(normalized) || { tier: 'C', industry: 'Other' };
}

const TARGET = {
  categories: {
    'Product Management': [
      'associate product manager','assistant product manager','junior product manager','entry level product manager','entry-level product manager','graduate product manager','product manager graduate','product manager intern','product management intern','product management internship','product manager','product management','product analyst','product strategy','product operations','product development','product innovation','digital product','ai product','growth product','technical product manager','platform product manager','product experience','product solutions','product project','product program','product coordinator','product specialist','product associate','product owner','apm program','associate pm','product rotational'
    ],
    'Strategy & Operations': [
      'strategy & operations','strategy and operations','strategic operations','business operations','corporate strategy','strategic initiatives','strategy analyst','business strategy','growth strategy','commercial strategy','digital strategy','technology strategy','business transformation','digital transformation','strategic projects','chief of staff','business planning','strategic planning','operations analyst','commercial excellence'
    ],
    'Consulting': [
      'consulting analyst','technology consultant','business technology analyst','management consulting','strategy consulting','digital consulting','transformation consultant','product consultant','innovation consultant','technology strategy consultant','customer experience consultant','experience strategy consultant','associate consultant','business consultant'
    ],
    'Marketing & GTM': [
      'product marketing','go-to-market','gtm','commercialization','marketing strategy','growth marketing','customer marketing','lifecycle marketing','partner marketing','solutions marketing','brand strategy','digital marketing','integrated marketing','marketing analyst'
    ],
    'Program Management': [
      'associate program manager','program manager','program management analyst','program analyst','project management analyst','associate project manager','project coordinator','technical program','business program manager','pmo analyst','project analyst','program coordinator'
    ],
    'Innovation & AI': [
      'innovation analyst','innovation associate','innovation strategy','emerging technology','technology innovation','digital innovation','new ventures','venture building','venture studio','corporate innovation','ai strategy','ai transformation','generative ai analyst','ai adoption','ai enablement','innovation program'
    ],
    'Customer & Solutions': [
      'customer success','client success','client solutions','solutions consultant','pre-sales consultant','technology sales','digital sales','technical sales','customer experience','customer strategy','implementation consultant','implementation analyst','professional services analyst','client services analyst','solutions analyst'
    ],
    'Research & Insights': [
      'user research','ux research','product research','customer insights','consumer insights','experience researcher','experience strategy','voice of customer','market research','design researcher','design strategy','human-centered design','insights analyst','research analyst'
    ],
    'Partnerships & BD': [
      'business development','strategic partnerships','partnerships analyst','partnership development','ecosystem','partner strategy','strategic alliances','commercial partnerships','platform partnerships','creator partnerships','partnerships associate'
    ],
    'Marketplace & Growth': [
      'marketplace operations','marketplace strategy','category strategy','category management','category manager','e-commerce strategy','ecommerce strategy','e-commerce operations','retail strategy','consumer strategy','growth operations','platform operations','creator operations','creator strategy','content strategy','merchandising strategy'
    ]
  },
  explicitEarlyCareer: [
    'new grad','new graduate','new college grad','university graduate','entry level','entry-level','early career','campus','graduate program','graduate analyst','graduate product','rotational program','rotation program','leadership development program','development program','2027 analyst','2027 graduate','2027 start','class of 2027','university program','university talent','college graduate','recent graduate','trainee program','student program'
  ],
  preferredSkills: [
    'product','strategy','operations','user research','customer','stakeholder','ai','artificial intelligence','prototype','prototyping','usability','innovation','go-to-market','gtm','cross-functional','program','digital transformation','insights','marketplace','testing','research','launch','customer experience','consumer','dashboard','process improvement'
  ],
  experienceSignals: [
    'user research','usability testing','prototype','prototyping','figma','stakeholder','cross-functional','ai','artificial intelligence','product strategy','product operations','digital transformation','go-to-market','gtm','customer experience','consumer insights','market research','testing','quality assurance','program management','project management','process improvement','dashboard','launch','innovation','emerging technology'
  ],
  excludeTitleTerms: [
    'senior ','sr. ','staff ','principal ','director','vice president','vp ','head of ','chief ','lead software','lead engineer','software engineer','data scientist','machine learning engineer','account executive','store associate','retail associate','warehouse associate','product demonstrator','product guide','merchandise product','pharmacist','nurse','physician','technician','mechanic'
  ]
};

const WORKDAY_SEARCH_TERMS = ['product','strategy','analyst','consultant','marketing','program','operations','innovation','customer','business development'];

function cleanHtml(html='') {
  return String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function classify(title, description='') {
  const t = String(title || '').toLowerCase();
  const body = `${title || ''} ${description || ''}`.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [category, terms] of Object.entries(TARGET.categories)) {
    let score = 0;
    for (const term of terms) {
      if (t.includes(term)) score += 6;
      else if (body.includes(term)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = category; }
  }
  return bestScore >= 2 ? best : null;
}

function explicitEarlyCareer(text='') {
  const lower = text.toLowerCase();
  return TARGET.explicitEarlyCareer.some(x => lower.includes(x));
}

function juniorTitle(title='') {
  const t = title.toLowerCase();
  if (/senior|sr\.|principal|director|vice president|\bvp\b|head of|chief/.test(t)) return false;
  return /\banalyst\b|\bassociate\b|\bcoordinator\b|\bspecialist\b|\bintern\b|\binternship\b|\bco-?op\b|\bgraduate\b|entry[- ]level|\bjunior\b|\btrainee\b|\bapm\b|\b2027\b/.test(t);
}

function requiredYears(text='') {
  const lower = text.toLowerCase();
  const patterns = [
    /(?:minimum|min\.?|at least|requires?|required|have)\s+(\d+)\+?\s+(?:years|yrs)/g,
    /(\d+)\+\s+(?:years|yrs)\s+of\s+(?:relevant\s+)?experience/g
  ];
  const nums = [];
  for (const re of patterns) {
    for (const match of lower.matchAll(re)) nums.push(Number(match[1]));
  }
  return nums.length ? Math.min(...nums) : null;
}

function isTarget(job) {
  const title = String(job.title || '').toLowerCase();
  if (!title) return false;
  if (TARGET.excludeTitleTerms.some(x => title.includes(x))) return false;

  const category = classify(job.title, job.description);
  if (!category) return false;

  const all = `${job.title || ''} ${job.description || ''} ${job.employmentType || ''}`.toLowerCase();
  const early = explicitEarlyCareer(all) || juniorTitle(title);
  const years = requiredYears(all);
  if (years !== null && years >= 5 && !explicitEarlyCareer(all)) return false;

  // Generic manager roles are usually too senior; allow PM roles only when the posting itself signals early career.
  if (/\bmanager\b/.test(title) && !/product manager/.test(title) && !explicitEarlyCareer(all)) return false;
  if (/product manager/.test(title) && /senior|lead|principal|group/.test(title)) return false;

  return early;
}

function freshnessScore(postedAt) {
  if (!postedAt) return 35;
  const ageDays = Math.max(0, (Date.now() - new Date(postedAt).getTime()) / 86400000);
  if (!Number.isFinite(ageDays)) return 35;
  if (ageDays <= 1) return 100;
  if (ageDays <= 3) return 90;
  if (ageDays <= 7) return 78;
  if (ageDays <= 14) return 62;
  if (ageDays <= 30) return 48;
  return 35;
}

function scoreJob(job, category) {
  const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  const title = String(job.title || '').toLowerCase();

  let roleFit = {
    'Product Management': 95,
    'Strategy & Operations': 94,
    'Consulting': 92,
    'Innovation & AI': 91,
    'Program Management': 86,
    'Marketing & GTM': 84,
    'Research & Insights': 84,
    'Customer & Solutions': 80,
    'Marketplace & Growth': 82,
    'Partnerships & BD': 78
  }[category] || 72;
  if (/associate product manager|product analyst|product strategy|strategy & operations|strategy and operations|business operations|technology consulting|innovation analyst/.test(title)) roleFit += 4;

  const experienceHits = TARGET.experienceSignals.filter(k => text.includes(k)).length;
  const experienceFit = Math.min(98, 55 + experienceHits * 5);

  const companyFit = job.companyTier === 'A' ? 95 : job.companyTier === 'B' ? 82 : 70;

  let careerFit = 62;
  if (/2027|new grad|new graduate|university graduate|graduate program|early career|entry[- ]level|leadership development program|rotational/.test(text)) careerFit = 100;
  else if (/\banalyst\b|\bassociate\b|\bcoordinator\b|\bspecialist\b|\btrainee\b/.test(title)) careerFit = 88;
  else if (/intern|internship/.test(title)) careerFit = 80;

  const years = requiredYears(text);
  if (years !== null && years >= 3) careerFit -= Math.min(28, (years - 2) * 9);

  roleFit = Math.max(45, Math.min(100, roleFit));
  careerFit = Math.max(40, Math.min(100, careerFit));
  const freshness = freshnessScore(job.postedAt);

  const overall = Math.round(
    roleFit * 0.35 +
    experienceFit * 0.25 +
    companyFit * 0.20 +
    careerFit * 0.10 +
    freshness * 0.10
  );

  return {
    overall: Math.max(45, Math.min(98, overall)),
    breakdown: { roleFit, experienceFit, companyFit, careerFit, freshness }
  };
}

function idFor(company, title, location, url) {
  return crypto.createHash('sha1').update(`${company}|${title}|${location}|${url}`).digest('hex').slice(0, 18);
}

async function fetchJson(url, options={}) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; JaeRecruitingRadar/2.0; +https://github.com/friedporkdumplings/2026_recuriting_dashboard)',
    'accept': 'application/json,text/plain,*/*',
    ...(options.headers || {})
  };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchText(url, options={}) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; JaeRecruitingRadar/3.0; +https://github.com/friedporkdumplings/2026_recuriting_dashboard)',
    'accept': 'text/plain,text/markdown,*/*',
    ...(options.headers || {})
  };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise(r => setTimeout(r, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

function stripMarkdown(value='') {
  return String(value)
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .trim();
}

function markdownLink(value='') {
  const matches = [...String(value).matchAll(/\[[^\]]+\]\((https?:\/\/[^\)]+)\)/g)];
  if (matches.length) return matches[matches.length - 1][1];
  const raw = String(value).match(/https?:\/\/\S+/);
  return raw ? raw[0].replace(/[|)>]+$/g, '') : '';
}

function parseShortDate(value='') {
  const s = stripMarkdown(value).trim();
  if (!s) return null;
  const now = new Date();
  const withYear = new Date(`${s} ${now.getUTCFullYear()} UTC`);
  if (!Number.isNaN(withYear.getTime())) {
    // Avoid accidentally dating a December row into the future when the feed spans year-end.
    if (withYear.getTime() > now.getTime() + 14 * 86400000) withYear.setUTCFullYear(now.getUTCFullYear() - 1);
    return withYear.toISOString();
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function communityMeta(company='') {
  const meta = companyMeta(company);
  return { companyTier: meta.tier || 'C', industry: meta.industry || 'Other' };
}

async function applyGuy(source) {
  const data = await fetchJson(source.url);
  return (data.jobs || [])
    .filter(j => !source.category || String(j.category || '').toLowerCase() === source.category.toLowerCase())
    .map(j => ({
      company: j.company,
      title: j.title,
      location: j.location || 'Location not listed',
      postedAt: j.posted ? new Date(`${j.posted}T12:00:00Z`).toISOString() : null,
      url: j.listingUrl || j.url,
      source: 'ApplyGuy',
      employmentType: 'Internship',
      description: `2027 product management internship feed. ${j.season || ''}`,
      ...communityMeta(j.company)
    }));
}

async function pmHub(source) {
  const md = await fetchText(source.url);
  const rows = [];
  for (const line of md.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(x => x.trim());
    if (cells.length < 6 || /^company$/i.test(cells[0]) || /^---/.test(cells[0])) continue;
    const [companyCell, roleCell, locationCell, startTermCell, statusCell, linkCell] = cells;
    if (/closed/i.test(statusCell)) continue;
    const company = stripMarkdown(companyCell);
    const title = stripMarkdown(roleCell);
    const url = markdownLink(linkCell) || markdownLink(roleCell);
    if (!company || !title || !url) continue;
    rows.push({
      company,
      title,
      location: stripMarkdown(locationCell) || 'Location not listed',
      postedAt: null,
      url,
      source: 'PM Recruiting Hub',
      employmentType: stripMarkdown(startTermCell),
      description: `${source.careerHint || 'Early Career'} community-curated product opportunity. Status: ${stripMarkdown(statusCell)}`,
      ...communityMeta(company)
    });
  }
  return rows;
}

async function jobrightMarkdown(source) {
  const md = await fetchText(source.url);
  const rows = [];
  let lastCompany = '';
  for (const line of md.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(x => x.trim());
    if (cells.length < 5 || /company/i.test(cells[0]) && /job title/i.test(cells[1]) || /^---/.test(cells[0])) continue;
    let company = stripMarkdown(cells[0]);
    if (company === '↳') company = lastCompany;
    else if (company) lastCompany = company;
    const title = stripMarkdown(cells[1]);
    const url = markdownLink(cells[1]);
    if (!company || !title || !url) continue;
    rows.push({
      company,
      title,
      location: stripMarkdown(cells[2]) || 'Location not listed',
      postedAt: parseShortDate(cells[4]),
      url,
      source: source.careerHint === 'New Grad' ? 'Jobright New Grad' : 'Jobright Internships',
      employmentType: source.careerHint || '',
      description: `${source.careerHint || 'Early Career'} product management feed. Work model: ${stripMarkdown(cells[3])}`,
      ...communityMeta(company)
    });
  }
  return rows;
}

function addSourceMeta(job, source) {
  return {
    ...job,
    companyTier: source.tier || 'C',
    industry: source.industry || 'Other'
  };
}

async function greenhouse(source) {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.board)}/jobs?content=true`);
  return (data.jobs || []).map(j => addSourceMeta({
    company: source.company,
    title: j.title,
    location: j.location?.name || 'Location not listed',
    postedAt: j.first_published || j.updated_at || null,
    url: j.absolute_url,
    source: 'Greenhouse',
    employmentType: '',
    description: cleanHtml(j.content || '')
  }, source));
}

async function lever(source) {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(source.site)}?mode=json`);
  return (data || []).map(j => addSourceMeta({
    company: source.company,
    title: j.text,
    location: j.categories?.location || 'Location not listed',
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    url: j.hostedUrl || j.applyUrl,
    source: 'Lever',
    employmentType: j.categories?.commitment || '',
    description: cleanHtml(j.descriptionPlain || j.description || '')
  }, source));
}

async function ashby(source) {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.board)}`);
  return (data.jobs || []).map(j => addSourceMeta({
    company: source.company,
    title: j.title,
    location: j.location || 'Location not listed',
    postedAt: j.publishedAt || j.updatedAt || null,
    url: j.jobUrl || j.applyUrl,
    source: 'Ashby',
    employmentType: j.employmentType || '',
    description: cleanHtml(j.descriptionPlain || j.descriptionHtml || '')
  }, source));
}

function parseWorkdayPostedOn(value) {
  if (!value) return null;
  const s = String(value).trim();
  const now = new Date();
  if (/posted today|today/i.test(s)) return now.toISOString();
  if (/posted yesterday|yesterday/i.test(s)) return new Date(now.getTime() - 86400000).toISOString();
  const days = s.match(/(?:posted\s+)?(\d+)\s+days?\s+ago/i);
  if (days) return new Date(now.getTime() - Number(days[1]) * 86400000).toISOString();
  if (/30\+\s+days?\s+ago/i.test(s)) return new Date(now.getTime() - 31 * 86400000).toISOString();
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function mapLimit(items, limit, mapper) {
  const out = new Array(items.length);
  let index = 0;
  async function worker() {
    while (true) {
      const i = index++;
      if (i >= items.length) return;
      out[i] = await mapper(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function workday(source) {
  const base = `https://${source.host}/wday/cxs/${encodeURIComponent(source.tenant)}/${encodeURIComponent(source.site)}`;
  const terms = source.searchTerms || WORKDAY_SEARCH_TERMS;
  const postings = new Map();

  for (const term of terms) {
    try {
      const data = await fetchJson(`${base}/jobs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: term })
      });
      for (const p of data.jobPostings || []) {
        const key = p.externalPath || `${p.title}|${p.locationsText || ''}`;
        postings.set(key, p);
      }
    } catch (err) {
      console.warn(`Workday ${source.company} search "${term}": ${err.message}`);
    }
  }

  const candidatePostings = [...postings.values()].filter(p => {
    const title = String(p.title || '');
    return classify(title, '') || juniorTitle(title) || explicitEarlyCareer(title);
  });

  const detailed = await mapLimit(candidatePostings, 4, async p => {
    const rawPath = String(p.externalPath || '');
    if (!rawPath) return null;
    const externalPath = rawPath.startsWith('/') ? rawPath : `/job/${rawPath.replace(/^job\//, '')}`;
    let info = {};
    try {
      const detail = await fetchJson(`${base}${externalPath}`);
      info = detail.jobPostingInfo || detail || {};
    } catch (err) {
      console.warn(`Workday ${source.company} detail ${p.title}: ${err.message}`);
    }

    const postedAt = (() => {
      const exact = info.startDate ? new Date(info.startDate) : null;
      if (exact && !Number.isNaN(exact.getTime())) return exact.toISOString();
      return parseWorkdayPostedOn(p.postedOn || info.postedOn);
    })();

    const location = info.location || p.locationsText || 'Location not listed';
    const extra = Array.isArray(info.additionalLocations) ? info.additionalLocations.map(x => x?.location || x).filter(Boolean) : [];
    const fullLocation = [location, ...extra].filter(Boolean).join('; ');
    const description = cleanHtml(info.jobDescription || info.description || '');
    const employmentType = info.timeType || info.employmentType || '';
    const url = info.externalUrl || info.jobPostingApplyUrl || `https://${source.host}/${source.site}${externalPath}`;

    return addSourceMeta({
      company: source.company,
      title: info.title || p.title,
      location: fullLocation,
      postedAt,
      url,
      source: 'Workday',
      employmentType,
      description
    }, source);
  });

  return detailed.filter(Boolean);
}

const sourceTasks = [
  ...(config.greenhouse || []).map(s => ({ source: s, type: 'Greenhouse', run: () => greenhouse(s) })),
  ...(config.lever || []).map(s => ({ source: s, type: 'Lever', run: () => lever(s) })),
  ...(config.ashby || []).map(s => ({ source: s, type: 'Ashby', run: () => ashby(s) })),
  ...(config.workday || []).map(s => ({ source: s, type: 'Workday', run: () => workday(s) })),
  ...(config.community || []).map(s => ({
    source: { company: s.name },
    type: s.type === 'applyguy-json' ? 'Community JSON' : 'Community Feed',
    run: () => s.type === 'applyguy-json' ? applyGuy(s) : s.type === 'pmhub-markdown' ? pmHub(s) : jobrightMarkdown(s)
  }))
];

const sourceHealth = [];
const batches = await mapLimit(sourceTasks, 5, async task => {
  const started = Date.now();
  try {
    const rows = await task.run();
    sourceHealth.push({ company: task.source.company, ats: task.type, status: 'ok', fetched: rows.length, ms: Date.now() - started });
    return rows;
  } catch (err) {
    console.warn(`${task.type} ${task.source.company}: ${err.message}`);
    sourceHealth.push({ company: task.source.company, ats: task.type, status: 'error', fetched: 0, error: err.message, ms: Date.now() - started });
    return [];
  }
});

const raw = batches.flat();
const jobs = raw.filter(isTarget).map(j => {
  const category = classify(j.title, j.description);
  const tags = [];
  const text = `${j.title || ''} ${j.description || ''}`.toLowerCase();
  if (/2027|new grad|new graduate|university graduate|graduate program|class of 2027/.test(text)) tags.push('New Grad');
  if (/entry level|entry-level|early career|trainee/.test(text)) tags.push('Entry Level');
  if (/intern|internship/.test(text)) tags.push('Internship');
  if (/remote/.test(`${j.location || ''} ${j.description || ''}`.toLowerCase())) tags.push('Remote');
  if (j.companyTier === 'A') tags.push('Priority A');

  const scored = scoreJob(j, category);
  return {
    id: idFor(j.company, j.title, j.location, j.url),
    company: j.company,
    companyTier: j.companyTier || 'C',
    industry: j.industry || 'Other',
    title: j.title,
    location: j.location,
    employmentType: j.employmentType,
    postedAt: j.postedAt,
    url: j.url,
    source: j.source,
    category,
    tags,
    matchScore: scored.overall,
    scoreBreakdown: scored.breakdown
  };
});

const SOURCE_PRIORITY = { Workday: 6, Greenhouse: 6, Lever: 6, Ashby: 6, 'PM Recruiting Hub': 5, ApplyGuy: 4, 'Jobright New Grad': 3, 'Jobright Internships': 3 };
function dedupeKey(job) {
  const n = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${n(job.company)}|${n(job.title)}|${n(job.location)}`;
}
const dedupeMap = new Map();
for (const job of jobs) {
  const key = dedupeKey(job);
  const existing = dedupeMap.get(key);
  if (!existing || (SOURCE_PRIORITY[job.source] || 0) > (SOURCE_PRIORITY[existing.source] || 0)) dedupeMap.set(key, job);
}
const deduped = [...dedupeMap.values()]
  .sort((a,b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));

const successfulSources = sourceHealth.filter(x => x.status === 'ok').length;
const failedSources = sourceHealth.filter(x => x.status !== 'ok').length;

await fs.mkdir(new URL('../data/', import.meta.url), { recursive: true });
await fs.writeFile(
  new URL('../data/jobs.json', import.meta.url),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: deduped.length,
    rawCount: raw.length,
    sourceCount: sourceTasks.length,
    directSourceCount: (config.greenhouse || []).length + (config.lever || []).length + (config.ashby || []).length + (config.workday || []).length,
    communityFeedCount: (config.community || []).length,
    successfulSources,
    failedSources,
    sourceHealth: sourceHealth.sort((a,b) => a.company.localeCompare(b.company)),
    jobs: deduped
  }, null, 2)
);

console.log(`Saved ${deduped.length} matching jobs from ${raw.length} fetched postings across ${successfulSources}/${sourceTasks.length} successful sources.`);
if (failedSources) console.log(`${failedSources} source(s) failed; see sourceHealth in data/jobs.json.`);
