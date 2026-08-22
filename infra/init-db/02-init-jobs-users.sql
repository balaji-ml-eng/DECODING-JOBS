-- ============================================================================
-- DECODING JOBS — Phase 1 database bootstrap (part 2)
-- Adds "jobs" (one-to-many with companies) and "users" tables.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

-- 1. Enum backing app.models.domain.EmploymentType. Guarded for idempotent re-runs.
DO $$
BEGIN
    CREATE TYPE employment_type AS ENUM ('full_time', 'internship', 'contract', 'part_time');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Jobs — many-to-one against companies, cascades on company deletion.
CREATE TABLE IF NOT EXISTS jobs (
    id                      BIGSERIAL PRIMARY KEY,
    company_id              BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT NOT NULL,
    employment_type         employment_type NOT NULL DEFAULT 'full_time',
    min_experience_years    SMALLINT NOT NULL DEFAULT 0,
    salary_min              NUMERIC(12, 2),
    salary_max              NUMERIC(12, 2),
    apply_url               TEXT,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs (is_active);

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 3. Users — student/job-seeker accounts. No relationships yet in Phase 1.
CREATE TABLE IF NOT EXISTS users (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(320) NOT NULL UNIQUE,
    full_name           VARCHAR(255) NOT NULL,
    hashed_password     VARCHAR(255) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 4. Seed a handful of active jobs against the Phase-1 seed companies so the
--    /companies/search and /jobs endpoints have real data to return.
INSERT INTO jobs (company_id, title, description, employment_type, min_experience_years, salary_min, salary_max, apply_url, is_active)
SELECT c.id, v.title, v.description, v.employment_type::employment_type, v.min_experience_years, v.salary_min, v.salary_max, v.apply_url, true
FROM (
    VALUES
        ('Innovex Technologies', 'Backend Engineer (FastAPI)', 'Build and scale our async Python services powering the developer tools platform.', 'full_time', 1, 800000, 1400000, 'https://innovextech.example.com/careers/backend-engineer'),
        ('Innovex Technologies', 'SDE Intern', 'Six-month internship working on our core API and internal tooling.', 'internship', 0, 25000, 40000, 'https://innovextech.example.com/careers/sde-intern'),
        ('ByteForge Solutions', 'Payments Backend Engineer', 'Design and operate high-throughput payment processing pipelines.', 'full_time', 2, 1200000, 2000000, 'https://byteforge.example.com/careers/payments-engineer'),
        ('Whitefield Cloud Labs', 'DevOps Engineer', 'Own our Kubernetes and CI/CD infrastructure across multiple regions.', 'full_time', 3, 1500000, 2400000, 'https://whitefieldcloud.example.com/careers/devops-engineer')
) AS v(company_name, title, description, employment_type, min_experience_years, salary_min, salary_max, apply_url)
JOIN companies c ON c.name = v.company_name
WHERE NOT EXISTS (
    SELECT 1 FROM jobs j WHERE j.company_id = c.id AND j.title = v.title
);
