CREATE TABLE recurring_transactions (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,
    category_id UUID,

    type VARCHAR(20) NOT NULL,
    description VARCHAR(255) NOT NULL,

    amount NUMERIC(19, 2) NOT NULL,

    frequency VARCHAR(20) NOT NULL,

    start_date DATE NOT NULL,
    day_of_month SMALLINT NOT NULL,

    occurrences INTEGER,

    active BOOLEAN NOT NULL DEFAULT TRUE,
    generated_until DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_recurring_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT fk_recurring_category_user
        FOREIGN KEY (category_id, user_id)
        REFERENCES categories (id, user_id),

    CONSTRAINT uk_recurring_id_user
        UNIQUE (id, user_id),

    CONSTRAINT chk_recurring_type
        CHECK (type IN ('INCOME', 'EXPENSE')),

    CONSTRAINT chk_recurring_frequency
        CHECK (frequency IN ('MONTHLY')),

    CONSTRAINT chk_recurring_amount
        CHECK (amount > 0),

    CONSTRAINT chk_recurring_day
        CHECK (day_of_month BETWEEN 1 AND 31),

    CONSTRAINT chk_recurring_occurrences
        CHECK (occurrences IS NULL OR occurrences > 0)
);