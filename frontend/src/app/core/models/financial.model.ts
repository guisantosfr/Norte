import { TransactionResponseDTO, TransactionStatus, TransactionType } from './transaction.model';

export interface FinancialSummaryDTO {
  startDate: string | null;
  endDate: string | null;
  realizedIncome: number;
  realizedExpense: number;
  pendingIncome: number;
  pendingExpense: number;
  periodRealizedResult: number;
  periodProjectedResult: number;
  currentBalance: number;
  projectedBalance: number;
}

export interface CategoryFinancialSummaryDTO {
  categoryId: string | null;
  categoryName: string;
  realizedIncome: number;
  realizedExpense: number;
  pendingIncome: number;
  pendingExpense: number;
  netRealizedResult: number;
  netProjectedResult: number;
  transactionCount: number;
}

export interface CategoryTransactionsReportDTO {
  summary: CategoryFinancialSummaryDTO;
  transactions: TransactionResponseDTO[];
}

export interface FinancialCategoryFilters {
  startDate?: string | '';
  endDate?: string | '';
  type?: TransactionType | '';
  status?: TransactionStatus | '';
}
