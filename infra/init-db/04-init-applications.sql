-- ============================================================================
-- DECODING JOBS — Phase 1 database bootstrap (part 4)
-- Adds "applications" — the record created by the Document Vault's
-- 1-Click Apply / SUBMIT APPLICATION flow.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

-- 1. Enum backing app.models.domain.ApplicationStatus. Guarded for idempotent
--    re-runs. Only 'applied' is used by Phase 1's submit flow; the rest are
--    reserved for the Phase 2 Kanban tracker.
DO $$
BEGIN
    CREATE TYPE application_status AS ENUM ('applied', 'viewed', 'interview', 'rejected', 'offer');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Applications — one row per submit. `user_id` is nullable: Phase 1 has
--    no auth/session system yet, so submissions are currently anonymous.
CREATE TABLE IF NOT EXISTS applications (
    id                  BIGSERIAL PRIMARY KEY,
    job_id              BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id             BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resume_filename     VARCHAR(255) NOT NULL,
    status              application_status NOT NULL DEFAULT 'applied',
    applied_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications (job_id);

DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
