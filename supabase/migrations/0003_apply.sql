-- Applying from Openings: each application keeps the tailored CV and email
-- that were sent, and the opening it came from is hidden once applied to.

alter table applications
  add column opening_id uuid references job_openings (id) on delete set null,
  add column contact_email text,
  add column email_subject text,
  add column cover_email text,
  add column tailored_cv text,
  add column sent_at timestamptz;

alter table job_openings
  add column applied_at timestamptz;

notify pgrst, 'reload schema';
