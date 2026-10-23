# Operations

## Environment variables

Copy `.env.example` to `.env.local` for local development. Add the same values to Vercel for production.

| Variable | Required | Used by | Where to get it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Everything | Supabase → Project Settings → Data API, or the Connect button |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Everything | Supabase → Project Settings → API Keys → publishable key (or the legacy anon key) |
| `ALLOWED_EMAIL` | Yes | Login | Your email |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Login redirect fallback | `http://localhost:3000` locally, or your deployed URL |
| `ANTHROPIC_API_KEY` | For the agent | Scoring | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | No | Scoring | Defaults to `claude-haiku-5-5` |
| `JSEARCH_API_KEY` | For LinkedIn, Indeed and Qatar jobs | JSearch | RapidAPI → JSearch → code snippet (`x-rapidapi-key`), or My Apps → Authorization |
| `JSEARCH_HOST`, `JSEARCH_PATH` | No | JSearch | Only if RapidAPI changes them. Defaults: `jsearch.p.rapidapi.com`, `/search-v2` |
| `SUPABASE_SERVICE_ROLE_KEY` | For the cron job | Cron | Supabase → API Keys → secret key (or the legacy service_role key). **Never expose it.** |
| `CRON_SECRET` | For the cron job | Cron | Any long random string |

## Local setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql`, then `0002_job_agent.sql`, in the SQL Editor.
3. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/auth/callback` to the redirect URLs.
4. Fill in `.env.local`, then run `npm install` and `npm run dev`.
5. Sign in, paste your CV in **Settings**, and press **Find jobs now** on **Openings**.

## Deploying (Vercel)

1. Import the GitHub repo into Vercel.
2. Add the environment variables, with `NEXT_PUBLIC_SITE_URL` set to the deployed URL.
3. Add `https://<your-app>/auth/callback` to Supabase's redirect URLs.
4. `vercel.json` schedules `/api/cron/find-jobs` daily at 05:00 UTC, which is 08:00 in Doha. Vercel sends `CRON_SECRET` automatically.

To trigger the cron by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/find-jobs
```

## Checks

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run build` | Production build |

GitHub Actions (`.github/workflows/ci.yml`) runs all four on every PR and on every push to `main`.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Could not find the table 'public.applications' in the schema cache" | The migration hasn't been run. Run the SQL files, then `notify pgrst, 'reload schema';`. |
| `JSearch responded 404: Endpoint '/search' does not exist` | JSearch renamed its endpoint. The app now uses `/search-v2`. If it changes again, set `JSEARCH_PATH`. |
| `JSEARCH_API_KEY is not set` | Only Remotive and RemoteOK were searched. Add the key to get LinkedIn, Indeed and Qatar jobs. |
| `ANTHROPIC_API_KEY is not set, so jobs can't be scored.` | Add the key and restart the dev server. |
| "Add your CV in Settings before searching for jobs." | Paste your CV on the Settings page. |
| Same results every run | Already-scored jobs are skipped by design, so new results depend on new listings. Add searches in Settings for more variety. |
| Sign-in link doesn't come back to the app | The callback URL is missing from Supabase's redirect URLs. |
