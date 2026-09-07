# Jae's Recruiting Radar

A static GitHub Pages recruiting dashboard with an automated GitHub Actions job feed.

## What it does

- Pulls public job postings from configured Greenhouse, Lever, and Ashby job boards.
- Filters them against Jae's target job-title taxonomy.
- Classifies roles into Product Management, Strategy & Operations, Consulting, Marketing & GTM, Program Management, Innovation & AI, Customer & Solutions, Research & Insights, Partnerships & BD, and Marketplace & Growth.
- Refreshes `data/jobs.json` every six hours with GitHub Actions.
- Sorts newest roles first.
- Lets you search/filter by freshness, location, category, and career level.
- Saves `Saved`, `Applied`, and `Hidden` states in browser localStorage.
- Exports saved/applied jobs as JSON.

## Deploy on GitHub Pages

1. Create a new GitHub repository, e.g. `recruiting-radar`.
2. Upload the contents of this folder to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose your default branch (`main`) and `/ (root)`.
6. Save.
7. Go to **Actions → Refresh job feed → Run workflow** once to replace demo data with live ATS data.

Your dashboard will then be available at your GitHub Pages URL.

## Add companies

Edit `config/sources.json`.

### Greenhouse

If a career page uses a Greenhouse board token, add:

```json
{ "company": "Databricks", "board": "databricks" }
```

### Lever

Add:

```json
{ "company": "Example", "site": "example" }
```

### Ashby

Add:

```json
{ "company": "Notion", "board": "notion" }
```

The Actions workflow will fetch all postings from those boards and keep only roles matching the taxonomy in `scripts/fetch-jobs.mjs`.

## Refresh cadence

`.github/workflows/refresh-jobs.yml` uses:

```yaml
cron: "17 */6 * * *"
```

That requests a refresh every six hours. GitHub scheduled jobs may not start at the exact minute under load, so this is a freshness target rather than a hard real-time guarantee.

## Important limitation of this MVP

Saved/applied/hidden status is stored in the browser. It will persist on the same browser/device, but it will not sync across devices.

The clean Phase 2 upgrade is Supabase authentication + a small `applications` table so your tracker state syncs between laptop and phone.

## Recommended Phase 2

- Supabase login
- Cross-device Saved / Applied / Hidden state
- Application stages: Saved → Applied → OA → Interview → Final → Offer / Rejected
- Due dates / assessments / interview calendar
- Networking CRM + follow-up dates
- Resume version attached to each application
- Notes
- AI fit explanation instead of title-keyword match only
- Daily email digest of roles posted in the last 24h

## Source policy

Prefer official/public ATS feeds and company career pages. Avoid aggressively scraping LinkedIn or other platforms whose terms or anti-bot systems prohibit automated collection.
