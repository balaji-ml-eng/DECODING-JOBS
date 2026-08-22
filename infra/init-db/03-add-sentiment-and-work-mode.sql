-- ============================================================================
-- DECODING JOBS — Phase 1 database bootstrap (part 3)
-- Adds AI-synthesized company sentiment (Company Pulse) and per-job work mode
-- so the right-hand slide-over panel can render real, non-mocked data.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

-- 1. Company Pulse fields.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sentiment_summary JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS culture_score NUMERIC(2, 1);

-- 2. Enum backing app.models.domain.WorkMode. Guarded for idempotent re-runs.
DO $$
BEGIN
    CREATE TYPE work_mode AS ENUM ('remote', 'hybrid', 'onsite');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_mode work_mode;

-- 3. Backfill sentiment for the Phase-1 seed companies.
UPDATE companies SET
    sentiment_summary = '{
        "pros": ["Strong engineering culture", "Fast career growth for early engineers"],
        "cons": ["High-pressure sprint cycles", "Limited fully-remote flexibility"]
    }'::jsonb,
    culture_score = 4.3
WHERE name = 'Innovex Technologies' AND sentiment_summary IS NULL;

UPDATE companies SET
    sentiment_summary = '{
        "pros": ["Competitive, above-market compensation", "Clear ownership over payment systems"],
        "cons": ["On-call rotations can be demanding", "Fast-changing compliance requirements"]
    }'::jsonb,
    culture_score = 4.1
WHERE name = 'ByteForge Solutions' AND sentiment_summary IS NULL;

UPDATE companies SET
    sentiment_summary = '{
        "pros": ["Stable enterprise client base", "Strong investment in DevOps tooling"],
        "cons": ["Slower decision-making due to enterprise processes"]
    }'::jsonb,
    culture_score = 3.9
WHERE name = 'Whitefield Cloud Labs' AND sentiment_summary IS NULL;

-- 4. Backfill work_mode on the existing Phase-1 seed jobs. "SDE Intern" is
--    left NULL deliberately so the frontend's fallback rendering has a real
--    row to exercise, rather than only ever seeing fully-populated data.
UPDATE jobs SET work_mode = 'hybrid' WHERE title = 'Backend Engineer (FastAPI)';
UPDATE jobs SET work_mode = 'remote' WHERE title = 'Payments Backend Engineer';
UPDATE jobs SET work_mode = 'hybrid' WHERE title = 'DevOps Engineer';

-- 5. One additional job with no salary and no work_mode set, so the
--    "standardize a fallback if null" UI requirement has real data to prove
--    it against (not just a hypothetical code path).
INSERT INTO jobs (company_id, title, description, employment_type, min_experience_years, salary_min, salary_max, apply_url, work_mode, is_active)
SELECT c.id, 'Product Analyst', 'Partner with product and engineering to analyze payment funnel performance.', 'full_time', 1, NULL, NULL, 'https://byteforge.example.com/careers/product-analyst', NULL, true
FROM companies c
WHERE c.name = 'ByteForge Solutions'
AND NOT EXISTS (
    SELECT 1 FROM jobs j WHERE j.company_id = c.id AND j.title = 'Product Analyst'
);
