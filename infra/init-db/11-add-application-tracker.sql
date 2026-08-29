-- ============================================================================
-- DECODING JOBS — Application Tracker (Kanban) migration
-- Adds a "saved" status (bookmark a job before applying), relaxes columns
-- that don't apply to a password-less, email-identified user, and indexes
-- the FK the board query filters on.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

-- 1. New status: a job the user bookmarked but hasn't applied to yet.
--    Must be its own statement/transaction — Postgres won't let a new enum
--    value be used in the same transaction that added it.
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'saved';

-- 2. A "saved" application has no resume attached yet.
ALTER TABLE applications ALTER COLUMN resume_filename DROP NOT NULL;

-- 3. Phase 1 identity is email-only, no password.
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;

-- 4. The board query filters by user_id.
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications (user_id);
