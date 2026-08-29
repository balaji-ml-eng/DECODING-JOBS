-- ============================================================================
-- DECODING JOBS — durable, shared company-logo cache
-- The old cache lived only in the Next.js process's memory (apps/web/app/api/logo)
-- — lost on every restart/redeploy and not shared across instances. Moving the
-- durable copy into Postgres means it survives both and is shared by any
-- number of frontend instances.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

CREATE TABLE IF NOT EXISTS logo_cache (
    domain          VARCHAR(255) PRIMARY KEY,
    content_type    VARCHAR(100) NOT NULL,
    image_bytes     BYTEA NOT NULL,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
