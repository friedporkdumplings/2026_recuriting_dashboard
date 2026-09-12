# Job Recruiting Dashboard

A GitHub Pages dashboard for discovering and tracking early-career roles across product, strategy, operations, consulting, and related business functions.

The job feed refreshes public ATS sources every six hours with GitHub Actions, classifies relevant early-career roles, and ranks them with a heuristic fit score to make a large job feed easier to review.

## v2 workflow update

This release focuses on turning the site from a job feed into a lightweight recruiting workflow:

- Generic public branding with no individual name, initials, graduation date, contact information, or private recruiting notes.
- **New Today** view grouped into:
  - under 6 hours
  - 6–12 hours
  - 12–24 hours
- Clear **Save**, **Hide**, and **View role** actions.
- **Hide + Undo** and a dedicated **Hidden jobs** view with Restore.
- Application pipeline:
  - Saved
  - Applying
  - Applied
  - OA / Assessment
  - Interview
  - Final Round
  - Offer
  - Rejected
  - Withdrawn
- Homepage **Action Queue** for:
  - strong-fit / Priority A roles posted in the past 24 hours
  - saved roles that have not moved into an application
  - roles currently marked Applying
  - roles at OA / Interview / Final Round
- Browser-local **Export / Import** for saved, hidden, and application-stage state.
- Existing multi-select role, location, industry, and company-tier filters remain available.

## Privacy model

The repository and GitHub Pages site can be public without exposing a visitor's personal recruiting state.

Personal state is stored only in the browser with `localStorage`:

- saved job IDs
- hidden job IDs
- application stages

Nothing in the v2 frontend requires personal names, email addresses, LinkedIn profiles, networking contacts, resume files, coffee-chat notes, or private application notes to be committed to the repository.

A different visitor opening the same GitHub Pages URL gets their own separate browser-local state.

Use **Export local data** periodically if you want a backup. Use **Import local data** to restore that state in another browser.

## Fit score

The score is a heuristic sorting aid, not a hiring prediction.

Current weighting:

- Role fit: **35%**
- Experience overlap: **25%**
- Company priority: **20%**
- Early-career fit: **10%**
- Posting freshness: **10%**

The experience-overlap component uses broad product, technology, research, operations, transformation, GTM, customer, testing, analytics, process-improvement, and innovation signals.

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

## Data sources

The source configuration is in `config/sources.json`.

The project supports a mix of:

- Greenhouse
- Lever
- Ashby
- Workday
- broad early-career feeds where configured

Source-health information is recorded so one failing feed does not stop the entire refresh.

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

The scheduled workflow lives at `.github/workflows/refresh-jobs.yml`.

## Local browser state

The v2 frontend uses these `localStorage` keys:

```text
savedJobs
hiddenJobs
jobApplicationStages
```

For backward compatibility, an existing `appliedJobs` list is migrated into the `Applied` application stage the first time v2 loads.

## Deploying the v2 frontend

Replace the existing root-level frontend files with the v2 versions:

```text
index.html
styles.css
app.js
README.md
```

No changes are required to the ATS fetchers, workflow, source configuration, company universe, or generated `data/jobs.json` format for this frontend update.

After committing the files to `main`, GitHub Pages should deploy the new frontend automatically according to the repository's existing Pages configuration.

## Source policy

Prefer official/public ATS feeds and company career pages. Do not aggressively scrape LinkedIn or other sites whose terms or anti-bot systems prohibit automated collection.
