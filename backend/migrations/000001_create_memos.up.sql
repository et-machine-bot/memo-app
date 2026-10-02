-- memos: memo persistence for the MVP (EAS-88 / EAS-92).
-- gen_random_uuid() is built into PostgreSQL 13+ (this project targets 16).
-- updated_at defaults on INSERT only. The API (EAS-93) must set it on UPDATE.
-- Non-blank content is enforced here; max length stays in the API.

CREATE TABLE memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT memos_content_not_blank CHECK (btrim(content) <> '')
);

CREATE INDEX memos_updated_at_desc_idx ON memos (updated_at DESC);
