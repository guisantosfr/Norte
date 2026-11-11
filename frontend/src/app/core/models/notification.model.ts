export type NotificationType =
  | 'TRANSACTION_REMINDER'
  | 'TRANSACTION_DUE_TODAY'
  | 'TRANSACTION_OVERDUE';

export type NotificationStatus = 'UNREAD' | 'READ';

export interface NotificationResponseDTO {
  id: string;
  transactionId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountResponseDTO {
  unreadCount: number;
}
