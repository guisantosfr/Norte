export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELED';

export interface TransactionRequestDTO {
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  realizedAmount?: number | null;
  realizedAt?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface TypedTransactionRequestDTO {
  description: string;
  amount: number;
  date: string;
  status?: TransactionStatus | null;
  realizedAmount?: number | null;
  realizedAt?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface CompleteTransactionRequestDTO {
  realizedAmount?: number | null;
  realizedAt?: string | null;
}

export interface TransactionResponseDTO {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string | null;
  recurringTransactionId: string | null;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  realizedAt: string | null;
  realizedAmount: number | null;
  occurrenceNumber: number | null;
  totalOccurrences: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  type?: TransactionType | '';
  status?: TransactionStatus | '';
  categoryId?: string | '';
  recurringTransactionId?: string | '';
  startDate?: string | '';
  endDate?: string | '';
}
