# Jae's Recruiting Radar

A GitHub Pages recruiting dashboard for May 2027 new-grad recruiting. It refreshes public ATS job feeds every six hours with GitHub Actions, classifies relevant early-career roles, and ranks them against Jae's target career lanes and experience profile.

## What changed in this version

- Added **Workday** support alongside Greenhouse, Lever, and Ashby.
- Expanded from 4 initial companies to **36 automated target companies across 37 ATS feeds**.
- Added a **326-company recruiting universe** in `config/company-universe.json` for continued source expansion.
- Added company priority tiers (**A / B / C**) and industry metadata.
- Added filters for **industry** and **company priority**.
- Added quick filters for **🔥 Apply ASAP** and **Priority A**.
- Added source-health tracking so one broken company feed does not kill the entire refresh.
- Added a weighted fit score customized to Jae's resume and career targets.

## Fit score

The score is a heuristic, not a hiring prediction. It is meant to sort a large feed so the best roles are reviewed first.

- Role fit: **35%**
- Experience overlap: **25%**
- Company priority: **20%**
- Early-career fit: **10%**
- Posting freshness: **10%**

The experience-overlap terms emphasize product strategy, user research, usability testing, prototyping, AI, stakeholder work, cross-functional delivery, digital transformation, GTM, customer experience, testing, dashboards, process improvement, and innovation.

## Career categories

- Product Management
- Strategy & Operations
- Consulting
- Marketing & GTM
- Program Management
- Innovation & AI
- Customer & Solutions
- Research & Insights
- Partnerships & BD
- Marketplace & Growth

## Automated companies

The source configuration is in `config/sources.json`. It currently includes a mix of:

- Tech / SaaS / AI
- Consulting
- Financial services / fintech
- Media / entertainment
- Consumer / retail
- Healthcare / pharma
- Information / data

Examples include Databricks, Figma, Notion, Ramp, Disney, Mastercard, BlackRock, Warner Bros. Discovery, Capital One, S&P Global, Thomson Reuters, Target, Nike, PepsiCo, Unilever, Johnson & Johnson, CVS Health, UnitedHealth/Optum, Medtronic, Comcast, West Monroe, Airtable, Datadog, Affirm, and Robinhood.

## How the refresh works

```text
Greenhouse ─┐
Lever ──────┤
Ashby ──────┼──> scripts/fetch-jobs.mjs
Workday ────┘             ↓
                      relevance filter
                            ↓
                       fit scoring
                            ↓
                       data/jobs.json
                            ↓
                       GitHub Pages
```

The scheduled workflow lives at `.github/workflows/refresh-jobs.yml` and requests a run every six hours:

```yaml
cron: "17 */6 * * *"
```

GitHub scheduled workflows can start a little later than the exact cron minute.

## First run after uploading this update

1. Commit/push these files to `main`.
2. Open the repository's **Actions** tab.
3. Select **Refresh job feed**.
4. Click **Run workflow**.
5. When it finishes, open `data/jobs.json` and check `successfulSources`, `failedSources`, and `sourceHealth`.
6. Refresh the GitHub Pages site.

## Source health

Workday career sites occasionally rate-limit or block automated requests. The updater retries requests, limits concurrency, and records failures instead of crashing the whole scan. A source that fails on one run can succeed on the next six-hour refresh.

`data/jobs.json` includes:

```json
{
  "sourceCount": 37,
  "successfulSources": 35,
  "failedSources": 2,
  "sourceHealth": []
}
```

The exact values change on each run.

## Adding another Greenhouse company

Edit `config/sources.json`:

```json
{
  "company": "Example",
  "board": "example",
  "tier": "B",
  "industry": "Tech / SaaS"
}
```

## Adding another Ashby company

```json
{
  "company": "Example",
  "board": "example",
  "tier": "B",
  "industry": "Tech / AI"
}
```

## Adding another Lever company

```json
{
  "company": "Example",
  "site": "example",
  "tier": "B",
  "industry": "Tech / SaaS"
}
```

## Adding another Workday company

A Workday URL generally looks like:

```text
https://COMPANY.wd5.myworkdayjobs.com/SITE
```

Configure it as:

```json
{
  "company": "Example",
  "host": "COMPANY.wd5.myworkdayjobs.com",
  "tenant": "COMPANY",
  "site": "SITE",
  "tier": "B",
  "industry": "Consumer / Retail"
}
```

The script uses Workday's public Candidate Experience Service (CXS) JSON endpoints and searches targeted terms rather than attempting to scrape rendered pages.

## 326-company universe

`config/company-universe.json` is the broader employer list. It contains companies across tech, consulting, finance, media, consumer/retail/beauty, healthcare, travel, and information services.

`automated: true` means a live ATS source is already configured. `automated: false` means the company is a recruiting target but still needs a reliable source adapter/configuration before its postings will automatically appear.

This separation is intentional: it is better to have a smaller set of reliable automated sources than pretend an unsupported career site is being monitored when it is not.

## Local browser state

Saved, Applied, and Hidden job status is stored in browser `localStorage`. It persists on the same browser/device but does not yet sync between devices.

A later phase can add Supabase for:

- cross-device Saved / Applied / Hidden state
- stages: Saved → Applied → OA → Interview → Final → Offer / Rejected
- assessment/interview due dates
- networking CRM and follow-ups
- resume version used
- notes and outcomes

## Source policy

Prefer official/public ATS feeds and company career pages. Do not aggressively scrape LinkedIn or other sites whose terms or anti-bot systems prohibit automated collection.
