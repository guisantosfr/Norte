CREATE TABLE categories (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT uk_categories_id_user
        UNIQUE (id, user_id),

    CONSTRAINT uk_categories_user_name
        UNIQUE (user_id, name)
);