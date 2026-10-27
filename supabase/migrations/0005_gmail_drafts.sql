-- Applying saves Gmail drafts for review instead of sending. The application
-- remembers when its draft was saved, until the user marks it as sent.

alter table applications
  add column draft_saved_at timestamptz;

notify pgrst, 'reload schema';
