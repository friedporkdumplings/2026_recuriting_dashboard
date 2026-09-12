# Job Recruiting Dashboard — v3

A GitHub Pages dashboard for discovering and tracking early-career roles across product, strategy, operations, analytics, consulting, transformation, programs, GTM, innovation, customer, research, platform, marketplace, and related business functions.

## v3 changes

### Broader coverage
- Expands direct ATS coverage from the prior 36-company setup to roughly 60+ configured direct sources.
- Keeps the existing Workday employers.
- Adds more public Greenhouse, Lever, and Ashby boards.
- Expands broad early-career feeds beyond PM into:
  - business analyst
  - consulting
  - marketing
  - data analysis
- Companies outside A/B/C can now appear as **Other / Unranked** instead of being implicitly treated as Tier C.

### Broader role matching
New or expanded matching includes:
- Business Analyst / Digital Business Analyst / Business Process Analyst
- Product Analyst / Product Enablement / Product Adoption
- Revenue Operations / Commercial Operations / GTM Operations
- Digital Adoption / AI Enablement / Product Excellence
- Change Management / Change & Adoption / Transformation
- Strategic Programs / Special Projects / Enterprise Programs
- Operational Excellence / Process Improvement
- Innovation Programs / Corporate Innovation / Venture roles
- Customer Strategy / Implementation / Client Strategy
- Creator Strategy / Creator Operations / Community Strategy
- Platform Strategy / Platform Operations / Audience Development
- Rotational / leadership-development / Level I / Analyst I style early-career titles

The 5+ years requirement remains an exclusion unless a posting explicitly identifies itself as early career.

### Salary filter
Each fetched posting is scanned for disclosed US base salary language and normalized into:
- `salaryMin`
- `salaryMax`
- `salaryCurrency`
- `salaryPeriod`
- `salaryText`
- `salaryKnown`

The UI supports:
- Any salary
- $80K+ minimum
- $100K+ minimum
- $120K+ minimum

`Include unlisted` is checked by default so employers that do not disclose pay are not accidentally hidden.

The threshold uses the **minimum disclosed base salary**, not the top of the range.

### Compact Action Queue
The Action Queue is now collapsed by default and only shows:

> high-fit or Priority A roles posted in the past 24 hours

Expand it to see the full current queue for saved roles, applying roles, and interview/assessment stages.

### Privacy
The scraper user-agent is now generic and points to the renamed repository:
`JobRecruitingDashboard/3.0`

No personal name is included.

## Upload files

Replace / add:
- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `config/sources.json`
- `scripts/fetch-jobs.mjs`

Do not replace:
- `.github/workflows/`
- `data/` manually (the workflow regenerates it)
- `config/company-universe.json`

After commit, manually run the refresh workflow once so `data/jobs.json` is regenerated with salary fields and the expanded sources.


## v3.1 UI/filter corrections

- The compact Action Queue now reads **High Fit or Priority A Roles**.
- `Apply ASAP` now requires:
  - posting age ≤ 24 hours
  - overall fit score ≥ 85
  - role-fit score ≥ 85
  - early-career fit ≥ 70
- Selecting multiple quick-filter chips now uses **AND** logic. For example, selecting `Apply ASAP` + `Priority A` shows jobs satisfying both conditions.
- Location chips were removed from the quick-filter row. New York, California, Remote, and other locations remain available through the multi-select **All locations** control.
