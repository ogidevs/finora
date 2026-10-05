import { apiClient } from './client';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  default_rate: number | string;
  symbol_position?: 'prefix' | 'suffix';
  decimals?: number;
  is_prefix?: boolean;
}

export interface UserSettings {
  id: number;
  username: string;
  email: string;
  primary_currency: string;
  exchange_rate: number | string;
}

export interface UserSettingsUpdatePayload {
  primary_currency?: string;
  exchange_rate?: number;
}

export async function getSettingsApi(): Promise<UserSettings> {
  const response = await apiClient.get<UserSettings>('/settings/');
  return response.data;
}

export async function updateSettingsApi(data: UserSettingsUpdatePayload): Promise<UserSettings> {
  const response = await apiClient.put<UserSettings>('/settings/', data);
  return response.data;
}

export async function listCurrenciesApi(): Promise<CurrencyInfo[]> {
  const response = await apiClient.get<CurrencyInfo[]>('/settings/currencies');
  return response.data;
}
