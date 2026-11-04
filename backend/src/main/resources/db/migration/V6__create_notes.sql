CREATE TABLE notes (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    title VARCHAR(150),
    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notes_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT chk_notes_content
        CHECK (LENGTH(TRIM(content)) > 0)
);