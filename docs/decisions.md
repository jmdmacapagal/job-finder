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
| 2026-10-23 | **Invite list instead of a single owner (`ALLOWED_EMAILS`)** | The owner plans to share the app with 5–10 friends. The list is enforced in middleware too, because the public anon key lets anyone create a Supabase account directly. |
| 2026-10-23 | **Only the `GMAIL_USER` account can send applications** | The Gmail credentials belong to one person. Other users' email-apply jobs fail with a clear message until per-user email sending exists. |
| 2026-10-23 | **Each user sends from their own Gmail, saved encrypted in Settings** | Friends can't share one inbox. App passwords are encrypted with AES-256-GCM using `CREDENTIALS_KEY`, so a database leak alone doesn't expose them. The owner's environment account still works for them alone. |
| 2026-10-23 | **Work preferences are per user, in free text** | The owner's "remote, then on-site in Qatar" rule used to be built into the scoring prompt. Now each user writes their own, and the owner's existing profile was given theirs by migration `0004`. |
| 2026-10-27 | **Applications start as Gmail drafts; sending is behind `APPLY_SEND_EMAILS` (off)** | The owner wants to read every email before it goes out. Drafts are saved over IMAP with the same app password, so nothing new to set up, and the switch to sending is one variable once the output is trusted. |
| 2026-10-28 | **Block reposting sites such as JobLeads in JSearch results** | They copy listings from elsewhere, are often out of date, and put a sign-up or paywall in front of the employer. The employer's own link, or LinkedIn or Indeed, is picked from the job's other apply options instead, and a job only they carry is dropped. |
| 2026-10-28 | **Add Himalayas and Jobicy** | Both are free, need no key, and carry employer-posted remote jobs. Himalayas lists which countries can apply, which suits remote work from Qatar. Adzuna has no Qatar or Philippines coverage, and Jooble is itself a reposting aggregator with a partner key, so they were left out. |
| 2026-10-28 | **No web scraping; widen coverage with alert emails and employer job-board APIs instead** | LinkedIn, Indeed and OnlineJobs.ph forbid automated access, and scraping from Vercel is blocked by bot protection and needs a headless browser that's heavy to run there. Job-alert emails reach the same listings within the rules, and Greenhouse, Lever and Ashby publish job boards as public APIs meant for this. |
| 2026-10-28 | **Cache source fetches for an hour, shared by all users** | The cron runs every user in one call. Without a cache each feed was fetched once per user, which breaks Jobicy's once-an-hour ask and spends JSearch quota twice on shared searches. |
| 2026-10-28 | **Skip the same job seen on another board, and listings over 30 days old** | The same job often arrives from Remotive, Himalayas and LinkedIn under different URLs, and each copy cost a Claude call and cluttered Openings. Old listings are usually filled. |

## Planned

- **Step 5:** read Gmail replies to update status and feedback automatically.
