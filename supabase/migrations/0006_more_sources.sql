-- More job sources: company career pages (Greenhouse, Lever, Ashby) and
-- job-alert emails read from the user's Gmail.

alter table profiles
  -- Career page links like https://jobs.lever.co/acme, one per company.
  add column career_boards text[] not null default '{}',
  -- Off until the user turns it on: reading their inbox needs their say-so.
  add column read_job_alerts boolean not null default false;

notify pgrst, 'reload schema';
