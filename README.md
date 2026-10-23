# Job Finder

A personal, mobile-friendly dashboard for tracking job applications. It's built to grow into an AI agent that finds matching openings and tailors a CV for each one.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS 4 and Supabase (Postgres + auth).

## What works now

- Sign in with an emailed sign-in link (only `ALLOWED_EMAIL` can sign in)
- Applications dashboard: totals, active count, response rate, filters by status
- Add, edit and delete applications: company, role, link, source, work mode, type, location, salary, status, date, feedback, notes
- **Job-finding agent**: every morning (and on "Find jobs now") it pulls listings from Remotive, RemoteOK and JSearch (Google for Jobs, which includes LinkedIn and Indeed), skips ones you've already seen, scores each against your CV with Claude, and saves matches scoring 40+ to Openings
- Openings page: fit score and reason, work mode, salary, whether the listing has an email to apply to, and a Dismiss button
- Settings page: your master CV and the job searches the agent runs

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run each file in [`supabase/migrations/`](supabase/migrations) in order (`0001_init.sql`, then `0002_job_agent.sql`).
3. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/auth/callback` (and your deployed URL's `/auth/callback`) to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the values from Supabase → Project Settings → API.
5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build |

## Deploying

Import the repo into [Vercel](https://vercel.com), add the environment variables from `.env.example` (with `NEXT_PUBLIC_SITE_URL` set to the deployed URL), and add the deployed `/auth/callback` URL to Supabase's redirect URLs.

`vercel.json` schedules `/api/cron/find-jobs` daily at 05:00 UTC (08:00 in Doha). Vercel sends `CRON_SECRET` with each call. You can trigger it by hand with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/find-jobs
```

Each run scores at most 30 new listings, so Claude costs stay small and predictable.

## Roadmap

1. ~~Master CV~~
2. ~~Tracker web app~~
3. **Job-finding agent** (this)
4. Toggle the openings you want, then the agent emails a tailored CV and cover letter from Gmail and logs the application
5. Read Gmail replies to update status and feedback
