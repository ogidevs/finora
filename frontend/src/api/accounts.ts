import { apiClient } from './client';

export type AccountType = 'SPENDING' | 'SAVINGS' | 'SAVING' | 'CARD' | 'CASH';

export function isSavingsAccountType(type?: string | null): boolean {
  return type === 'SAVINGS' || type === 'SAVING';
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: AccountType;
  initial_balance: number | string;
  current_balance: number | string;
  currency: string;
  color?: string | null;
  icon?: string | null;
  created_at: string;
}

export interface AccountCreatePayload {
  name: string;
  type?: AccountType;
  initial_balance?: number;
  color?: string;
  icon?: string;
}

export interface AccountUpdatePayload {
  name?: string;
  type?: AccountType;
  initial_balance?: number;
  current_balance?: number;
  create_correction_transaction?: boolean;
  color?: string;
  icon?: string;
}

export async function listAccountsApi(): Promise<Account[]> {
  const response = await apiClient.get<Account[]>('/accounts/');
  return response.data;
}

export async function createAccountApi(data: AccountCreatePayload): Promise<Account> {
  const response = await apiClient.post<Account>('/accounts/', data);
  return response.data;
}

export async function updateAccountApi(id: number, data: AccountUpdatePayload): Promise<Account> {
  const response = await apiClient.put<Account>(`/accounts/${id}`, data);
  return response.data;
}

export async function deleteAccountApi(id: number): Promise<void> {
  await apiClient.delete(`/accounts/${id}`);
}
