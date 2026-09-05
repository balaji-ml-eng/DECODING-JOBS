-- ============================================================================
-- DECODING JOBS — AI Assistant chat history
-- Every chat product in this category (ChatGPT, Claude) has a conversation
-- sidebar — this backs one: conversations are auto-created on a user's first
-- message (titled from it) and every turn (chat replies and resume-upload
-- turns alike) is persisted so a conversation can be reopened later exactly
-- as it looked, including its job/company/resume result cards.
-- Runs once, automatically, on first container start (docker-entrypoint-initdb.d).
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations (user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id               BIGSERIAL PRIMARY KEY,
    conversation_id  BIGINT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role             VARCHAR(20) NOT NULL,
    content          TEXT NOT NULL,
    jobs_json        JSONB,
    companies_json   JSONB,
    resume_id        BIGINT REFERENCES resumes(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages (conversation_id);
