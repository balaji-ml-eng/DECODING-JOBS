-- ============================================================================
-- DECODING JOBS — Application Tracker: interview round tracking
-- The Interviewing column needs to show progress within itself (Round 1,
-- Round 2, ...), not just that the card is "in interviews".
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_round SMALLINT;
