CREATE TABLE transactions (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,

    category_id UUID,
    recurring_transaction_id UUID,

    type VARCHAR(20) NOT NULL,
    description VARCHAR(255) NOT NULL,

    amount NUMERIC(19, 2) NOT NULL,
    date DATE NOT NULL,

    status VARCHAR(20) NOT NULL,

    realized_at TIMESTAMPTZ,
    realized_amount NUMERIC(19, 2),

    occurrence_number INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT fk_transactions_category_user
        FOREIGN KEY (category_id, user_id)
        REFERENCES categories (id, user_id),

    CONSTRAINT fk_transactions_recurring_user
        FOREIGN KEY (recurring_transaction_id, user_id)
        REFERENCES recurring_transactions (id, user_id),

    CONSTRAINT chk_transactions_type
        CHECK (type IN ('INCOME', 'EXPENSE')),

    CONSTRAINT chk_transactions_status
        CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),

    CONSTRAINT chk_transactions_amount
        CHECK (amount > 0),

    CONSTRAINT chk_transactions_realized_amount
        CHECK (
            realized_amount IS NULL
            OR realized_amount > 0
        ),

    CONSTRAINT chk_transactions_completed
        CHECK (
            status <> 'COMPLETED'
            OR (
                realized_at IS NOT NULL
                AND realized_amount IS NOT NULL
            )
        ),

    CONSTRAINT chk_transactions_occurrence
        CHECK (
            occurrence_number IS NULL
            OR occurrence_number > 0
        )
);

CREATE UNIQUE INDEX uk_transaction_occurrence
ON transactions (
    recurring_transaction_id,
    occurrence_number
)
WHERE recurring_transaction_id IS NOT NULL;