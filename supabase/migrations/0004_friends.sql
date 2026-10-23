-- Sharing the app with friends: each user has their own work preferences
-- and sends applications from their own Gmail.

alter table profiles
  add column work_preferences text not null default '',
  add column gmail_address text,
  -- AES-256-GCM, encrypted by the app with CREDENTIALS_KEY. Never stored in plain text.
  add column gmail_app_password_encrypted text;

-- Profiles that exist now belong to the owner, whose preferences used to be
-- built into the scoring prompt.
update profiles
set work_preferences = 'Remote (any country) first, then hybrid, then on-site in Qatar only. I live in Doha and won''t relocate for an on-site role.'
where work_preferences = '';

notify pgrst, 'reload schema';
