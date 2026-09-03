-- ============================================================================
-- DECODING JOBS — AI Assistant: resume storage + ATS analysis
-- Same BYTEA-in-Postgres pattern as logo_cache — durable, no extra storage
-- infra needed. extracted_text is what the resume analyzer and chat
-- assistant actually reason over; the raw bytes are kept for re-analysis.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

CREATE TABLE IF NOT EXISTS resumes (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename            VARCHAR(255) NOT NULL,
    content_type        VARCHAR(100) NOT NULL,
    file_bytes          BYTEA NOT NULL,
    extracted_text      TEXT,
    ats_score           SMALLINT,
    ats_summary         TEXT,
    ats_suggestions     JSONB,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    analyzed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes (user_id);
