# Decisions

A running log of decisions and the reasoning behind them. Newest at the bottom.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-23 | **Next.js over Nuxt 4** | The owner works in Nuxt daily and wanted this project to show React experience as well. |
| 2026-10-23 | **Supabase for the database and auth** | Free hosted Postgres with built-in email sign-in and row-level security, so there's no separate auth service to run. |
| 2026-10-23 | **Magic-link sign-in limited to one email** | A personal app with no passwords to manage. `ALLOWED_EMAIL` blocks strangers. |
| 2026-10-23 | **No scraping of LinkedIn or Indeed** | Both forbid it and can ban accounts. JSearch (Google for Jobs) covers their listings legitimately. |
| 2026-10-23 | **The owner chooses every application** | Fully automatic applying breaks job boards' terms and risks bans. The agent only applies to jobs the owner selected, and only when the owner presses Apply. It never submits forms on LinkedIn or Indeed. |
| 2026-10-23 | **No manual data entry** | The agent fills Openings, and applying (step 4) will fill Applications automatically. |
| 2026-10-23 | **Work preference order: remote → hybrid → on-site in Qatar only** | The owner's stated preference, built into the scoring prompt. |
| 2026-10-23 | **Claude Haiku 5.5, scoring up to 150 jobs a run** | About 30x cheaper than Opus, so it gives 5x the coverage for about $0.15 a run. Fit scoring is a simple judgment that Haiku handles well. |
| 2026-10-23 | **Store every scored job, including low scores** | Otherwise each run re-scores the same listings. Low scores show in a "Below 40%" tab. |
| 2026-10-23 | **The CV is stored in the database, not the repo** | Keeps personal details out of source control. Edit it on the Settings page. |
| 2026-10-23 | **JSearch `/search-v2` with a country parameter** | `/search` was removed. JSearch defaults to the US, so local searches set the country. |
| 2026-10-23 | **Send applications through Gmail SMTP with an app password** | Mail comes from the owner's real address and replies land in their inbox. No Google Cloud project is needed. The Gmail API (OAuth) can come in step 5, when replies are read. |
| 2026-10-23 | **Claude Opus 5.5 for tailoring** | A recruiter reads the result, so quality matters more than for scoring. At about 6–7 cents per application the difference from cheaper models is small. |
| 2026-10-23 | **The owner is BCC'd on every application** | Every email the agent sends is visible in the owner's inbox. |
| 2026-10-23 | **The CV is attached as a PDF rendered in the app** | pdf-lib is pure JavaScript, so it runs on Vercel without a headless browser. The same PDF can be downloaded for site-only applications. |
| 2026-10-23 | **Listings are data, except how-to-apply instructions** | Some listings hide tests like "include the word SEAMLESS". Claude follows those, and ignores anything else a listing asks. |
| 2026-10-23 | **Tech-stack pills and salary come from keyword matching, not Claude** | It's free, instant, and works on listings already saved. Pills for tech that's also on your CV are highlighted. Salary falls back to the first pay figure in the description when the source gives none. |
| 2026-10-23 | **Ticking a job updates in the browser first** | Re-rendering the page on every tick took about 2 seconds. The tick, the card outline and the Apply count now update instantly, and the change is saved in the background. |
| 2026-10-23 | **Middleware uses `getClaims()`** | It verifies the session locally with asymmetric signing keys, saving a Supabase Auth round trip on every page load. |

## Planned

- **Step 5:** read Gmail replies to update status and feedback automatically.
