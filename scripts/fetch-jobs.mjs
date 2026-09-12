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
  ['byte dance', 'bytedance'],
  ['amex', 'american express'],
  ['facebook', 'meta'],
  ['jp morgan', 'jpmorgan chase'],
  ['fidelity', 'fidelity investments'],
  ['fidelity international', 'fidelity investments']
]);

function companyMeta(company='') {
  const normalized = normalizeCompanyName(company);
  const canonical = COMPANY_ALIASES.get(normalized) || normalized;
  return COMPANY_META.get(canonical) || COMPANY_META.get(normalized) || { tier: 'U', industry: 'Other' };
}

const TARGET = {
  categories: {
    'Product': [
      'associate product manager','assistant product manager','junior product manager','entry level product manager',
      'graduate product manager','product manager graduate','product manager intern','product management intern',
      'product manager','product management','product analyst','product strategy','product operations','product development',
      'product innovation','digital product','ai product','growth product','platform product','product experience',
      'product solutions','product project','product program','product coordinator','product specialist','product associate',
      'product owner','apm program','associate pm','product rotational','product enablement','product adoption','product launch'
    ],
    'Strategy & Operations': [
      'strategy & operations','strategy and operations','strategic operations','business operations','bizops','corporate strategy',
      'strategic initiatives','strategy analyst','business strategy','growth strategy','commercial strategy','digital strategy',
      'technology strategy','strategic projects','chief of staff','business planning','strategic planning','operations analyst',
      'commercial excellence','revenue strategy','revenue operations','sales operations','gtm operations','commercial operations'
    ],
    'Business & Analytics': [
      'business analyst','business systems analyst','business process analyst','digital business analyst','product business analyst',
      'business insights analyst','decision analyst','commercial analyst','customer experience analyst','digital analyst',
      'business analytics','business intelligence analyst','data analyst','analytics analyst','insights analyst',
      'process improvement analyst','operational excellence analyst','process excellence analyst','continuous improvement analyst'
    ],
    'Consulting & Transformation': [
      'consulting analyst','technology consultant','business technology analyst','management consulting','strategy consulting',
      'digital consulting','transformation consultant','product consultant','innovation consultant','technology strategy consultant',
      'customer experience consultant','experience strategy consultant','associate consultant','business consultant',
      'implementation consultant','change management analyst','change and adoption','change & adoption','transformation analyst',
      'transformation office','organizational transformation','technology transformation','digital transformation associate',
      'process transformation'
    ],
    'Programs & Projects': [
      'associate program manager','program manager','program management analyst','program analyst','project management analyst',
      'associate project manager','project coordinator','technical program','business program manager','pmo analyst','project analyst',
      'program coordinator','strategic programs analyst','strategic projects analyst','special projects analyst',
      'business program analyst','strategy program analyst','enterprise programs analyst','program strategy analyst'
    ],
    'Innovation & AI': [
      'innovation analyst','innovation associate','innovation strategy','emerging technology','technology innovation','digital innovation',
      'new ventures','venture building','venture studio','corporate innovation','ai strategy','ai transformation','generative ai analyst',
      'ai adoption','ai enablement','innovation program','innovation operations','technology adoption','digital adoption',
      'product excellence','venture associate','venture builder'
    ],
    'GTM & Commercial': [
      'product marketing','go-to-market','go to market','gtm','commercialization','marketing strategy','growth marketing',
      'customer marketing','lifecycle marketing','partner marketing','solutions marketing','brand strategy','digital marketing',
      'integrated marketing','marketing analyst','commercial operations','revenue operations','sales strategy','sales operations',
      'commercial strategy','commercial analyst','revenue strategy','gtm strategy','gtm operations','sales enablement','gtm enablement'
    ],
    'Customer & Solutions': [
      'customer success','client success','client solutions','solutions consultant','pre-sales consultant','presales consultant',
      'technology sales','digital sales','technical sales','customer experience','customer strategy','implementation consultant',
      'implementation analyst','professional services analyst','client services analyst','solutions analyst','customer operations',
      'client strategy','client solutions analyst','customer enablement','customer adoption'
    ],
    'Research & Insights': [
      'user research','ux research','product research','customer insights','consumer insights','experience researcher',
      'experience strategy','voice of customer','market research','design researcher','design strategy','human-centered design',
      'insights analyst','research analyst','audience insights','customer research'
    ],
    'Partnerships & Platforms': [
      'business development','strategic partnerships','partnerships analyst','partnership development','ecosystem',
      'partner strategy','strategic alliances','commercial partnerships','platform partnerships','creator partnerships',
      'partnerships associate','platform strategy','platform operations','creator strategy','creator operations',
      'community strategy','community operations','audience development'
    ],
    'Growth & Marketplace': [
      'marketplace operations','marketplace strategy','category strategy','category management','category manager',
      'e-commerce strategy','ecommerce strategy','e-commerce operations','retail strategy','consumer strategy','growth operations',
      'growth analyst','growth strategy','platform growth','creator growth','content strategy','merchandising strategy'
    ]
  },
  explicitEarlyCareer: [
    'new grad','new graduate','new college grad','university graduate','entry level','entry-level','early career','campus',
    'graduate program','graduate analyst','graduate product','rotational program','rotation program','leadership development program',
    'development program','2027 analyst','2027 graduate','2027 start','class of 2027','university program','university talent',
    'college graduate','recent graduate','trainee program','student program','management development','management associate',
    'rotational analyst','rotation associate','university associate'
  ],
  experienceSignals: [
    'user research','usability testing','stakeholder','cross-functional','ai','artificial intelligence','product strategy',
    'product operations','digital transformation','go-to-market','gtm','customer experience','consumer insights','market research',
    'testing','quality assurance','program management','project management','process improvement','dashboard','launch','innovation',
    'emerging technology','adoption','enablement','change management','business operations','commercial operations','analytics',
    'content strategy','creator','community','implementation','operational excellence'
  ],
  excludeTitleTerms: [
    'senior ','sr. ','staff ','principal ','director','vice president','vp ','head of ','chief ',
    'lead software','lead engineer','software engineer','data scientist','machine learning engineer',
    'account executive','store associate','retail associate','warehouse associate','product demonstrator','product guide',
    'merchandise product','pharmacist','nurse','physician','technician','mechanic'
  ]
};

const WORKDAY_SEARCH_TERMS = [
  'product','strategy','analyst','consultant','marketing','program','operations','innovation','customer',
  'business development','transformation','commercial','business','digital','enablement','implementation',
  'insights','research','partnerships','growth','process','experience','planning','project','technology'
];

function cleanHtml(html='') {
  return String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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
  if (/senior|sr\.|staff|principal|director|vice president|\bvp\b|head of|chief/.test(t)) return false;
  return /\banalyst\b|\bassociate\b|\bcoordinator\b|\bspecialist\b|\bassistant\b|\badvisor\b|\bconsultant(?: i| 1)?\b|\bintern\b|\binternship\b|\bco-?op\b|\bgraduate\b|entry[- ]level|\bjunior\b|\btrainee\b|\bapm\b|\b2027\b|\blevel i\b|\blevel 1\b|\banalyst i\b|\banalyst 1\b|\bassociate i\b|\bproduct manager i\b|\bproduct manager 1\b|\bprogram manager i\b|\brotational\b/.test(t);
}

function requiredYears(text='') {
  const lower = text.toLowerCase();
  const patterns = [
    /(?:minimum|min\.?|at least|requires?|required|have)\s+(\d+)\+?\s+(?:years|yrs)/g,
    /(\d+)\+\s+(?:years|yrs)\s+of\s+(?:relevant\s+)?experience/g,
    /(?:minimum of\s+)?(\d+)\s*(?:-|to)\s*(\d+)\s+(?:years|yrs)/g
  ];
  const nums = [];
  for (const re of patterns) {
    for (const match of lower.matchAll(re)) nums.push(Number(match[1]));
  }
  return nums.length ? Math.min(...nums) : null;
}

function experienceBand(job) {
  const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  const years = requiredYears(text);
  if (explicitEarlyCareer(text) || years === null || years <= 2) return 'Early Career';
  if (years === 3) return 'Stretch';
  if (years === 4) return 'Experienced';
  return '5+ Years';
}

function isTarget(job) {
  const title = String(job.title || '').toLowerCase();
  if (!title) return false;
  if (TARGET.excludeTitleTerms.some(x => title.includes(x))) return false;

  const category = classify(job.title, job.description);
  if (!category) return false;

  const all = `${job.title || ''} ${job.description || ''} ${job.employmentType || ''}`.toLowerCase();
  const years = requiredYears(all);
  if (years !== null && years >= 5 && !explicitEarlyCareer(all)) return false;

  // Expand beyond literal Analyst/Associate titles while keeping obvious management roles out.
  const early = explicitEarlyCareer(all) || juniorTitle(title) || years === null || years <= 4;
  if (/\bmanager\b/.test(title) && !/product manager/.test(title) && !explicitEarlyCareer(all) && !/\bmanager i\b|\bmanager 1\b/.test(title)) return false;
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
    'Product': 95,
    'Strategy & Operations': 95,
    'Business & Analytics': 91,
    'Consulting & Transformation': 92,
    'Innovation & AI': 92,
    'Programs & Projects': 87,
    'GTM & Commercial': 86,
    'Research & Insights': 85,
    'Customer & Solutions': 82,
    'Growth & Marketplace': 84,
    'Partnerships & Platforms': 82
  }[category] || 72;

  if (/associate product manager|product analyst|product strategy|strategy & operations|strategy and operations|business operations|business analyst|transformation analyst|innovation analyst|product enablement/.test(title)) roleFit += 4;

  const experienceHits = TARGET.experienceSignals.filter(k => text.includes(k)).length;
  const experienceFit = Math.min(98, 55 + experienceHits * 5);

  const companyFit = job.companyTier === 'A' ? 95 : job.companyTier === 'B' ? 82 : job.companyTier === 'C' ? 70 : 74;

  let careerFit = 62;
  if (/2027|new grad|new graduate|university graduate|graduate program|early career|entry[- ]level|leadership development program|rotational/.test(text)) careerFit = 100;
  else if (juniorTitle(title)) careerFit = 88;

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

function parseSalary(text='') {
  const raw = String(text || '');
  const normalized = raw.replace(/,/g, '');
  const candidates = [];

  // $80K - $110K / $80,000 to $110,000
  const moneyRange = /\$\s*(\d{2,3}(?:\.\d+)?)\s*(k)?\s*(?:-|–|—|to)\s*\$?\s*(\d{2,3}(?:\.\d+)?)\s*(k)?(?:\s*(?:per|\/)\s*(year|yr|hour|hr))?/gi;
  for (const m of normalized.matchAll(moneyRange)) {
    let min = Number(m[1]) * (m[2] ? 1000 : 1);
    let max = Number(m[3]) * (m[4] ? 1000 : 1);
    const period = (m[5] || '').toLowerCase();
    if (!m[2] && min < 1000) min *= 1000;
    if (!m[4] && max < 1000) max *= 1000;
    if (/hour|hr/.test(period) || (min < 500 && max < 500)) { min *= 2080; max *= 2080; }
    if (min >= 30000 && max >= min && max <= 1000000) candidates.push({ min, max, text: m[0] });
  }

  // "base salary ... $95000" single floor
  const single = /(?:base salary|salary range|compensation|annual salary)[^$]{0,80}\$\s*(\d{2,3}(?:\.\d+)?)\s*(k)?/gi;
  for (const m of normalized.matchAll(single)) {
    let min = Number(m[1]) * (m[2] ? 1000 : 1);
    if (!m[2] && min < 1000) min *= 1000;
    if (min >= 30000 && min <= 1000000) candidates.push({ min, max: null, text: m[0] });
  }

  if (!candidates.length) return { salaryKnown: false, salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null, salaryText: null };
  candidates.sort((a,b) => b.min - a.min);
  const best = candidates[0];
  return {
    salaryKnown: true,
    salaryMin: Math.round(best.min),
    salaryMax: best.max ? Math.round(best.max) : null,
    salaryCurrency: 'USD',
    salaryPeriod: 'annual',
    salaryText: best.text
  };
}

function idFor(company, title, location, url) {
  return crypto.createHash('sha1').update(`${company}|${title}|${location}|${url}`).digest('hex').slice(0, 18);
}

async function fetchJson(url, options={}) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; JobRecruitingDashboard/3.0; +https://github.com/friedporkdumplings/2026_recruiting_dashboard)',
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
    'user-agent': 'Mozilla/5.0 (compatible; JobRecruitingDashboard/3.0; +https://github.com/friedporkdumplings/2026_recruiting_dashboard)',
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
    if (withYear.getTime() > now.getTime() + 14 * 86400000) withYear.setUTCFullYear(now.getUTCFullYear() - 1);
    return withYear.toISOString();
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function communityMeta(company='') {
  const meta = companyMeta(company);
  return { companyTier: meta.tier || 'U', industry: meta.industry || 'Other' };
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
      description: `2027 early-career opportunity. ${j.season || ''}`,
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
      description: `${source.careerHint || 'Early Career'} community-curated opportunity. Status: ${stripMarkdown(statusCell)}`,
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
    if (cells.length < 5 || (/company/i.test(cells[0]) && /job title/i.test(cells[1])) || /^---/.test(cells[0])) continue;
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
      source: source.name || 'Jobright',
      employmentType: source.careerHint || '',
      description: `${source.careerHint || 'Early Career'} community job feed. Work model: ${stripMarkdown(cells[3])}`,
      ...communityMeta(company)
    });
  }
  return rows;
}

function addSourceMeta(job, source) {
  return {
    ...job,
    companyTier: source.tier || 'U',
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
    description: cleanHtml(`${j.descriptionPlain || j.descriptionHtml || ''} ${j.compensation || ''}`)
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
  if (j.companyTier === 'U') tags.push('Other Company');

  const band = experienceBand(j);
  if (band === 'Stretch') tags.push('3 YOE Stretch');
  if (band === 'Experienced') tags.push('4 YOE Stretch');

  const scored = scoreJob(j, category);
  const salary = parseSalary(`${j.description || ''}`);

  return {
    id: idFor(j.company, j.title, j.location, j.url),
    company: j.company,
    companyTier: j.companyTier || 'U',
    industry: j.industry || 'Other',
    title: j.title,
    location: j.location,
    employmentType: j.employmentType,
    postedAt: j.postedAt,
    url: j.url,
    source: j.source,
    category,
    experienceBand: band,
    tags,
    matchScore: scored.overall,
    scoreBreakdown: scored.breakdown,
    ...salary
  };
});

const SOURCE_PRIORITY = {
  Workday: 6, Greenhouse: 6, Lever: 6, Ashby: 6,
  'PM Recruiting Hub': 5, ApplyGuy: 4
};

function dedupeKey(job) {
  const n = x => String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${n(job.company)}|${n(job.title)}|${n(job.location)}`;
}

const dedupeMap = new Map();
for (const job of jobs) {
  const key = dedupeKey(job);
  const existing = dedupeMap.get(key);
  if (!existing || (SOURCE_PRIORITY[job.source] || 3) > (SOURCE_PRIORITY[existing.source] || 3)) dedupeMap.set(key, job);
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
    salaryKnownCount: deduped.filter(j => j.salaryKnown).length,
    sourceHealth: sourceHealth.sort((a,b) => a.company.localeCompare(b.company)),
    jobs: deduped
  }, null, 2)
);

console.log(`Saved ${deduped.length} matching jobs from ${raw.length} fetched postings across ${successfulSources}/${sourceTasks.length} successful sources.`);
console.log(`Direct ATS sources: ${(config.greenhouse || []).length + (config.lever || []).length + (config.ashby || []).length + (config.workday || []).length}; community feeds: ${(config.community || []).length}.`);
console.log(`Salary parsed for ${deduped.filter(j => j.salaryKnown).length} matching jobs.`);
if (failedSources) console.log(`${failedSources} source(s) failed; see sourceHealth in data/jobs.json.`);
