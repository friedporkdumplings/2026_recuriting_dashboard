import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const config = JSON.parse(await fs.readFile(new URL('../config/sources.json', import.meta.url), 'utf8'));

const TARGET = {
  categories: {
    'Product Management': [
      'associate product manager','product manager','product analyst','product strategy','product operations','product development','product innovation','digital product','ai product','growth product','product experience','product specialist'
    ],
    'Strategy & Operations': [
      'strategy & operations','strategy and operations','strategic operations','business operations','corporate strategy','strategic initiatives','strategy analyst','business strategy','growth strategy','commercial strategy','digital strategy','technology strategy','business transformation','digital transformation','strategic projects','chief of staff','business planning','strategic planning'
    ],
    'Consulting': [
      'consulting analyst','technology consultant','business technology analyst','management consulting','strategy consulting','digital consulting','transformation consultant','product consultant','innovation consultant','technology strategy consultant','customer experience consultant','experience strategy consultant'
    ],
    'Marketing & GTM': [
      'product marketing','go-to-market','gtm','commercialization','marketing strategy','growth marketing','customer marketing','lifecycle marketing','partner marketing','solutions marketing'
    ],
    'Program Management': [
      'associate program manager','program manager','program management analyst','program analyst','project management analyst','associate project manager','project coordinator','technical program','business program manager','pmo analyst'
    ],
    'Innovation & AI': [
      'innovation analyst','innovation associate','innovation strategy','emerging technology','technology innovation','digital innovation','new ventures','venture building','venture studio','corporate innovation','ai strategy','ai transformation','generative ai analyst','ai adoption','ai enablement'
    ],
    'Customer & Solutions': [
      'customer success','client success','client solutions','solutions consultant','pre-sales consultant','technology sales','digital sales','technical sales','customer experience','customer strategy','implementation consultant','implementation analyst','professional services analyst'
    ],
    'Research & Insights': [
      'user research','ux research','product research','customer insights','consumer insights','experience researcher','experience strategy','voice of customer','market research','design researcher','design strategy','human-centered design'
    ],
    'Partnerships & BD': [
      'business development','strategic partnerships','partnerships analyst','partnership development','ecosystem','partner strategy','strategic alliances','commercial partnerships','platform partnerships','creator partnerships'
    ],
    'Marketplace & Growth': [
      'marketplace operations','marketplace strategy','category strategy','category management','category manager','e-commerce strategy','ecommerce strategy','e-commerce operations','retail strategy','consumer strategy','growth operations','platform operations','creator operations','creator strategy','content strategy'
    ]
  },
  earlyCareer: [
    'new grad','new graduate','university graduate','entry level','entry-level','early career','campus','associate','analyst','graduate program','rotational','rotation program','intern','internship'
  ],
  preferredSkills: [
    'product','strategy','operations','user research','customer','stakeholder','ai','artificial intelligence','prototype','prototyping','usability','innovation','go-to-market','gtm','cross-functional','program','digital transformation','insights','marketplace'
  ],
  excludeTitleTerms: [
    'senior ','sr. ','staff ','principal ','director','vice president','vp ','head of ','lead product manager','software engineer','data scientist','machine learning engineer','account executive'
  ]
};

function cleanHtml(html='') {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function classify(title, description='') {
  const t = title.toLowerCase();
  const body = `${title} ${description}`.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [category, terms] of Object.entries(TARGET.categories)) {
    let score = 0;
    for (const term of terms) {
      if (t.includes(term)) score += 5;
      else if (body.includes(term)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = category; }
  }
  return bestScore >= 2 ? best : null;
}

function isTarget(job) {
  const title = job.title.toLowerCase();
  if (TARGET.excludeTitleTerms.some(x => title.includes(x))) return false;
  const category = classify(job.title, job.description);
  if (!category) return false;
  const all = `${job.title} ${job.description} ${job.employmentType || ''}`.toLowerCase();
  const early = TARGET.earlyCareer.some(x => all.includes(x));
  const juniorTitle = /analyst|associate|coordinator|specialist|intern|graduate|entry/.test(title);
  return early || juniorTitle;
}

function matchScore(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  let score = 60;
  if (/new grad|new graduate|entry level|entry-level|early career|university graduate/.test(text)) score += 12;
  if (/associate product manager|product analyst|product strategy|strategy & operations|strategy and operations|business operations|technology consulting/.test(text)) score += 10;
  score += Math.min(16, TARGET.preferredSkills.filter(k => text.includes(k)).length * 2);
  if (/3\+ years|4\+ years|5\+ years|minimum 3 years/.test(text)) score -= 12;
  return Math.max(45, Math.min(97, score));
}

function idFor(company, title, location, url) {
  return crypto.createHash('sha1').update(`${company}|${title}|${location}|${url}`).digest('hex').slice(0, 18);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'JaeRecruitingRadar/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function greenhouse(source) {
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.board)}/jobs?content=true`);
  return (data.jobs || []).map(j => ({
    company: source.company,
    title: j.title,
    location: j.location?.name || 'Location not listed',
    postedAt: j.updated_at || null,
    url: j.absolute_url,
    source: 'Greenhouse',
    employmentType: '',
    description: cleanHtml(j.content || '')
  }));
}

async function lever(source) {
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(source.site)}?mode=json`);
  return (data || []).map(j => ({
    company: source.company,
    title: j.text,
    location: j.categories?.location || 'Location not listed',
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    url: j.hostedUrl || j.applyUrl,
    source: 'Lever',
    employmentType: j.categories?.commitment || '',
    description: cleanHtml(j.descriptionPlain || j.description || '')
  }));
}

async function ashby(source) {
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.board)}`);
  return (data.jobs || []).map(j => ({
    company: source.company,
    title: j.title,
    location: j.location || 'Location not listed',
    postedAt: j.publishedAt || j.updatedAt || null,
    url: j.jobUrl || j.applyUrl,
    source: 'Ashby',
    employmentType: j.employmentType || '',
    description: cleanHtml(j.descriptionPlain || j.descriptionHtml || '')
  }));
}

const tasks = [
  ...(config.greenhouse || []).map(s => greenhouse(s).catch(e => { console.warn(`Greenhouse ${s.company}: ${e.message}`); return []; })),
  ...(config.lever || []).map(s => lever(s).catch(e => { console.warn(`Lever ${s.company}: ${e.message}`); return []; })),
  ...(config.ashby || []).map(s => ashby(s).catch(e => { console.warn(`Ashby ${s.company}: ${e.message}`); return []; }))
];

const raw = (await Promise.all(tasks)).flat();
const jobs = raw.filter(isTarget).map(j => {
  const category = classify(j.title, j.description);
  const tags = [];
  const text = `${j.title} ${j.description}`.toLowerCase();
  if (/new grad|new graduate|university graduate/.test(text)) tags.push('New Grad');
  if (/entry level|entry-level|early career/.test(text)) tags.push('Entry Level');
  if (/intern|internship/.test(text)) tags.push('Internship');
  if (/remote/.test(`${j.location} ${j.description}`.toLowerCase())) tags.push('Remote');
  return {
    id: idFor(j.company, j.title, j.location, j.url),
    company: j.company,
    title: j.title,
    location: j.location,
    employmentType: j.employmentType,
    postedAt: j.postedAt,
    url: j.url,
    source: j.source,
    category,
    tags,
    matchScore: matchScore(j)
  };
});

const deduped = [...new Map(jobs.map(j => [j.id, j])).values()]
  .sort((a,b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));

await fs.mkdir(new URL('../data/', import.meta.url), { recursive: true });
await fs.writeFile(new URL('../data/jobs.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), count: deduped.length, jobs: deduped }, null, 2));
console.log(`Saved ${deduped.length} matching jobs from ${raw.length} total postings.`);
