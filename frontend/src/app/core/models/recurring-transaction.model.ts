import { TransactionType } from './transaction.model';

export type RecurrenceFrequency = 'MONTHLY';

export type RecurrenceScope = 'FUTURE' | 'ALL';

export interface RecurringTransactionRequestDTO {
  type: TransactionType;
  description: string;
  amount: number;
  frequency?: RecurrenceFrequency;
  startDate?: string | null;
  dayOfMonth: number;
  occurrences?: number | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface RecurringTransactionUpdateDTO {
  type: TransactionType;
  description: string;
  amount: number;
  dayOfMonth: number;
  occurrences?: number | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface RecurringTransactionResponseDTO {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string | null;
  type: TransactionType;
  description: string;
  amount: number;
  frequency: RecurrenceFrequency;
  startDate: string;
  dayOfMonth: number;
  occurrences: number | null;
  active: boolean;
  generatedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransactionFilters {
  active?: boolean | null;
  type?: TransactionType | '';
  categoryId?: string | '';
}
