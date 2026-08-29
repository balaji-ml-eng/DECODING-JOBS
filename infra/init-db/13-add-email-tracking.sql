-- ============================================================================
-- DECODING JOBS — Email-based interview round detection
-- Every user gets a random forwarding token; forwarding a company's email to
-- u-{token}@{INBOUND_EMAIL_DOMAIN} lets the backend auto-update their board.
-- email_events is the audit trail — every inbound email is logged here,
-- matched or not, so nothing is silently dropped.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

-- 1. Personal forwarding address token.
ALTER TABLE users ADD COLUMN IF NOT EXISTS forwarding_token VARCHAR(32) UNIQUE;

-- Backfill any pre-existing users (no pgcrypto extension required).
UPDATE users
SET forwarding_token = substr(md5(random()::text || id::text), 1, 16)
WHERE forwarding_token IS NULL;

-- 2. Audit trail of every inbound email the parser has seen.
CREATE TABLE IF NOT EXISTS email_events (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id          BIGINT REFERENCES applications(id) ON DELETE SET NULL,
    from_address            TEXT,
    subject                 TEXT,
    raw_text                TEXT,
    extracted_company       VARCHAR(255),
    extracted_round         SMALLINT,
    extracted_stage_label   VARCHAR(100),
    extracted_status        VARCHAR(20),
    matched                 BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_user_id ON email_events (user_id);
CREATE INDEX IF NOT EXISTS idx_email_events_application_id ON email_events (application_id);
