ALTER TABLE transactions
    ADD CONSTRAINT uk_transactions_id_user
    UNIQUE (id, user_id);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,

    user_id UUID NOT NULL,
    transaction_id UUID,

    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,

    type VARCHAR(30) NOT NULL,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),

    CONSTRAINT fk_notifications_transaction_user
        FOREIGN KEY (transaction_id, user_id)
        REFERENCES transactions (id, user_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_notifications_type
        CHECK (type IN ('TRANSACTION_REMINDER', 'TRANSACTION_DUE_TODAY', 'TRANSACTION_OVERDUE'))
);

CREATE UNIQUE INDEX uk_notification_transaction_type
ON notifications (transaction_id, type)
WHERE transaction_id IS NOT NULL;
