-- Job applications I've sent, and job openings the agent finds (step 3).
-- Every row belongs to the signed-in user; RLS keeps each user to their own rows.

create type application_status as enum (
  'saved', 'applied', 'interviewing', 'offer', 'rejected', 'ghosted', 'withdrawn'
);
create type work_mode as enum ('remote', 'hybrid', 'onsite');
create type employment_type as enum ('full_time', 'part_time', 'contract', 'freelance');

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  url text,
  source text,
  location text,
  work_mode work_mode,
  employment_type employment_type,
  salary text,
  status application_status not null default 'applied',
  applied_on date,
  feedback text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table job_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  company text not null,
  url text not null,
  source text not null,
  location text,
  work_mode work_mode,
  employment_type employment_type,
  description text,
  fit_score smallint check (fit_score between 0 and 100),
  fit_reason text,
  dismissed boolean not null default false,
  discovered_at timestamptz not null default now(),
  unique (user_id, url)
);

create index applications_user_status_idx on applications (user_id, status);
create index job_openings_user_score_idx on job_openings (user_id, fit_score desc);

create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

alter table applications enable row level security;
alter table job_openings enable row level security;

create policy "own applications" on applications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own job openings" on job_openings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
