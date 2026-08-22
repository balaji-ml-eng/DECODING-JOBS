-- ============================================================================
-- DECODING JOBS — Phase 1 database bootstrap
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

-- 1. Enable the PostGIS extension for spatial types/functions/operators.
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Core "companies" table.
--    location uses SRID 4326 (WGS 84 — standard lon/lat used by GPS and web maps).
CREATE TABLE IF NOT EXISTS companies (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT,
    logo_url        TEXT,
    website_url     TEXT,
    address         VARCHAR(500) NOT NULL,
    location        GEOMETRY(Point, 4326) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Spatial GiST index — required for sub-10ms bounding-box / radius queries
--    (ST_Within, ST_DWithin, the && operator) at any meaningful scale.
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies USING GIST (location);

-- 4. Keep updated_at accurate on every row change.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 5. Seed data — 3 sample tech companies across Bengaluru tech corridors.
--    ST_MakePoint(longitude, latitude) — PostGIS expects (X, Y) i.e. (lon, lat).
INSERT INTO companies (name, description, logo_url, website_url, address, location)
VALUES
    (
        'Innovex Technologies',
        'Seed-stage SaaS startup building developer productivity tools.',
        NULL,
        'https://innovextech.example.com',
        '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
        ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326)
    ),
    (
        'ByteForge Solutions',
        'Series A fintech company building payment infrastructure for SMBs.',
        NULL,
        'https://byteforge.example.com',
        '80 Feet Road, Koramangala 4th Block, Bengaluru, Karnataka 560034',
        ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326)
    ),
    (
        'Whitefield Cloud Labs',
        'Enterprise cloud infrastructure and DevOps tooling provider.',
        NULL,
        'https://whitefieldcloud.example.com',
        'ITPL Main Road, Whitefield, Bengaluru, Karnataka 560066',
        ST_SetSRID(ST_MakePoint(77.7500, 12.9698), 4326)
    )
ON CONFLICT (name) DO NOTHING;
