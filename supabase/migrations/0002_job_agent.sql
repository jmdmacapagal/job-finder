-- Job-finding agent: a profile with the master CV and search settings,
-- plus extra details on each opening the agent finds.

create table profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  cv_markdown text not null default '',
  search_queries text[] not null default array[
    'full stack engineer',
    'full stack developer vue nuxt',
    'react typescript developer',
    'full stack developer Doha Qatar'
  ],
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;
create policy "own profile" on profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table job_openings
  add column external_id text,
  add column salary text,
  add column apply_email text,
  add column posted_at timestamptz,
  add column selected boolean not null default false;
