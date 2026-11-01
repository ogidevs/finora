import { apiClient } from './client';

export interface Transaction {
  id: number;
  user_id: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number | string;
  currency: string;
  exchange_rate: number | string;
  amount_base: number | string;
  amount_primary: number | string;
  primary_currency: string;
  account_id: number;
  account_name: string;
  account_type?: 'SPENDING' | 'SAVINGS' | 'SAVING' | 'CARD' | 'CASH';
  to_account_id?: number | null;
  to_account_name?: string | null;
  to_account_type?: 'SPENDING' | 'SAVINGS' | 'SAVING' | 'CARD' | 'CASH' | null;
  is_savings_transfer?: boolean;
  savings_transfer_direction?: 'TO_SAVINGS' | 'FROM_SAVINGS' | null;
  category_id?: number | null;
  category_name?: string | null;
  parent_category_name?: string | null;
  date: string;
  note?: string | null;
  tag?: string | null;
  created_at: string;
}

export function isSavingsTransferTo(tx: Transaction): boolean {
  return (
    tx.type === 'TRANSFER' &&
    Boolean(tx.is_savings_transfer) &&
    tx.savings_transfer_direction === 'TO_SAVINGS'
  );
}

export function isSavingsTransferFrom(tx: Transaction): boolean {
  return (
    tx.type === 'TRANSFER' &&
    Boolean(tx.is_savings_transfer) &&
    tx.savings_transfer_direction === 'FROM_SAVINGS'
  );
}

export function isTransactionExpense(tx: Transaction): boolean {
  const isDirectSavingsTx = tx.account_type === 'SAVINGS' || tx.account_type === 'SAVING';
  return (tx.type === 'EXPENSE' && !isDirectSavingsTx) || isSavingsTransferTo(tx);
}

export function isTransactionIncome(tx: Transaction): boolean {
  const isDirectSavingsTx = tx.account_type === 'SAVINGS' || tx.account_type === 'SAVING';
  return (tx.type === 'INCOME' && !isDirectSavingsTx) || isSavingsTransferFrom(tx);
}

export function getTransactionPrimaryAmount(tx: Transaction, primaryCurrency: string): number {
  return Number(tx.currency === primaryCurrency ? tx.amount : tx.amount_primary);
}

export interface DailyTransactionsGroup {
  date: string;
  day_name: string;
  formatted_date: string;
  primary_currency: string;
  total_income_primary: number | string;
  total_expense_primary: number | string;
  net_primary: number | string;
  transactions: Transaction[];
}

export interface MonthlyTransactionsResponse {
  period?: 'day' | 'month' | 'year';
  day?: number | null;
  month: number;
  year: number;
  month_name: string;
  period_label?: string | null;
  primary_currency: string;
  total_income_primary: number | string;
  total_expense_primary: number | string;
  net_primary: number | string;
  transaction_count: number;
  days: DailyTransactionsGroup[];
}

export interface TransactionCreatePayload {
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  currency: string;
  exchange_rate?: number;
  account_id: number;
  to_account_id?: number;
  category_id?: number;
  date: string;
  note?: string;
  tag?: string;
}

export async function listMonthlyTransactionsApi(params: {
  period?: 'day' | 'month' | 'year';
  day?: number;
  month?: number;
  year?: number;
  account_id?: number;
  type?: string;
  tag?: string;
} = {}): Promise<MonthlyTransactionsResponse> {
  const response = await apiClient.get<MonthlyTransactionsResponse>('/transactions/', { params });
  return response.data;
}

export async function createTransactionApi(data: TransactionCreatePayload): Promise<Transaction> {
  const response = await apiClient.post<Transaction>('/transactions/', data);
  return response.data;
}

export interface TransactionUpdatePayload {
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount?: number;
  currency?: string;
  exchange_rate?: number;
  account_id?: number;
  to_account_id?: number | null;
  category_id?: number | null;
  date?: string;
  note?: string | null;
  tag?: string | null;
}

export async function updateTransactionApi(id: number, data: TransactionUpdatePayload): Promise<Transaction> {
  const response = await apiClient.put<Transaction>(`/transactions/${id}`, data);
  return response.data;
}

export async function deleteTransactionApi(id: number): Promise<void> {
  await apiClient.delete(`/transactions/${id}`);
}

export interface TransactionBatchUpdatePayload {
  transaction_ids: number[];
  account_id?: number;
  category_id?: number;
  clear_category?: boolean;
  date?: string;
  note?: string;
  clear_note?: boolean;
  tag?: string;
  clear_tag?: boolean;
}

export interface TransactionBatchUpdateResponse {
  updated_count: number;
  message: string;
}

export async function batchUpdateTransactionsApi(
  data: TransactionBatchUpdatePayload
): Promise<TransactionBatchUpdateResponse> {
  const response = await apiClient.patch<TransactionBatchUpdateResponse>('/transactions/batch', data);
  return response.data;
}

export interface ImportTransactionsResponse {
  message: string;
  imported_count: number;
  skipped_count: number;
  errors: string[];
}

export async function countTransactionsApi(): Promise<number> {
  const response = await apiClient.get<{ count: number }>('/transactions/count');
  return response.data.count;
}

export async function exportTransactionsApi(
  format: 'csv' | 'json',
  params: {
    year?: number;
    month?: number;
    account_id?: number;
  } = {}
): Promise<Blob> {
  const response = await apiClient.get('/transactions/export', {
    params: { format, ...params },
    responseType: 'blob',
  });
  return response.data;
}

export async function importTransactionsApi(file: File): Promise<ImportTransactionsResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ImportTransactionsResponse>('/transactions/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function clearAllTransactionsApi(): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>('/transactions/clear');
  return response.data;
}

