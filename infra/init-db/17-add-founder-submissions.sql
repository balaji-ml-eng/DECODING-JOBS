-- Tracks which companies were self-registered by a founder (vs. scraped or
-- seeded), for provenance and future moderation. Never exposed via the API.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS submitted_by_email VARCHAR(255);
