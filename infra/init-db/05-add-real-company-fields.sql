-- ============================================================================
-- DECODING JOBS — Phase 2 database migration
-- Adds fields for real company data (sector, area, city) and job source tracking.
-- ============================================================================

-- 1. Company enrichment fields (mirrors Bangalore Startup Map data model).
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sector VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stage VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS area VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Bengaluru';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year SMALLINT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS team_size VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_funding VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS jobs_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 2. Indexes for the new filter columns.
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies (sector);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies (city);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies (status);

-- 3. Job source tracking — so we know where a posting came from and when.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;
