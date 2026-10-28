# Operations

## Environment variables

Copy `.env.example` to `.env.local` for local development. Add the same values to Vercel for production.

| Variable | Required | Used by | Where to get it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Everything | Supabase → Project Settings → Data API, or the Connect button |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Everything | Supabase → Project Settings → API Keys → publishable key (or the legacy anon key) |
| `ALLOWED_EMAILS` | Yes | Login, middleware, cron | Comma-separated emails that can sign in. The older `ALLOWED_EMAIL` still works. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Login redirect fallback | `http://localhost:3000` locally, or your deployed URL |
| `ANTHROPIC_API_KEY` | For the agent | Scoring | console.anthropic.com → API Keys |
| `ANTHROPIC_MODEL` | No | Scoring | Defaults to `claude-haiku-5-5` |
| `JSEARCH_API_KEY` | For LinkedIn, Indeed and Qatar jobs | JSearch | RapidAPI → JSearch → code snippet (`x-rapidapi-key`), or My Apps → Authorization |
| `JSEARCH_HOST`, `JSEARCH_PATH` | No | JSearch | Only if RapidAPI changes them. Defaults: `jsearch.p.rapidapi.com`, `/search-v2` |
| `HIMALAYAS_API_KEY` | No | Himalayas | himalayas.app → API. Free; raises the limit to 10,000 requests a day instead of the shared public allowance. |
| `SUPABASE_SERVICE_ROLE_KEY` | For the cron job | Cron | Supabase → API Keys → secret key (or the legacy service_role key). **Never expose it.** |
| `CRON_SECRET` | For the cron job | Cron | Any long random string |
| `CREDENTIALS_KEY` | To apply by email | Settings, Apply | `openssl rand -base64 32`. Encrypts each user's Gmail app password. **Never expose it, and don't change it** or saved passwords stop working (users would re-enter them). |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | No | Apply | The owner's Gmail from the environment, used only when their sign-in email matches `GMAIL_USER` and they haven't saved one in Settings |
| `GMAIL_FROM_NAME` | No | Apply | Sender name for the environment account. Otherwise the name on the CV is used. |
| `TAILOR_MODEL` | No | Apply | Defaults to `claude-opus-5-5`. `claude-sonnet-5-5` halves the cost. |
| `APPLY_SEND_EMAILS` | No | Apply | Off by default, so email applications are saved as Gmail drafts. Set to `true` to send them directly. |

## Local setup

1. Create a Supabase project.
2. Run the files in `supabase/migrations/` in order (`0001` to `0005`) in the SQL Editor.
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
| Openings from JobLeads or another reposting site saved before they were blocked | New runs skip them. To clear old ones, run `delete from job_openings where source ilike 'JobLeads%' and not selected;` in the Supabase SQL editor. |
| `Himalayas responded 429` | The shared public allowance ran out. Add a free `HIMALAYAS_API_KEY`. |
| `JSEARCH_API_KEY is not set` | Only Remotive, RemoteOK, Jobicy and Himalayas were searched. Add the key to get LinkedIn, Indeed and Qatar jobs. |
| `ANTHROPIC_API_KEY is not set, so jobs can't be scored.` | Add the key and restart the dev server. |
| "Add your CV in Settings before searching for jobs." | Paste your CV on the Settings page. |
| Same results every run | Already-scored jobs are skipped by design, so new results depend on new listings. Add searches in Settings for more variety. |
| Sign-in link doesn't come back to the app | The callback URL is missing from Supabase's redirect URLs. |
| "Could not find the 'applied_at' column" or similar | Run `0003_apply.sql`. |
| "Could not find the 'work_preferences' column" or similar | Run `0004_friends.sql`. |
| "Could not find the 'draft_saved_at' column" | Run `0005_gmail_drafts.sql`. |
| Drafts don't appear in Gmail | Check IMAP is enabled in Gmail → Settings → Forwarding and POP/IMAP. The error under Apply to selected says what Gmail answered. |
| `CREDENTIALS_KEY is not set` when saving Settings | Add the key (see above) and restart or redeploy. |
| Gmail says `Invalid login` | Use an app password, not your Google password, and turn on 2-Step Verification first. |
