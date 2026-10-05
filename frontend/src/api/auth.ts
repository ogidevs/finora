import { apiClient } from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  primary_currency?: string;
  exchange_rate?: number | string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
}

export async function loginApi(username: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', {
    username,
    password,
  });
  return response.data;
}

export async function registerApi(username: string, email: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', {
    username,
    email,
    password,
  });
  return response.data;
}

export async function getMeApi(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function refreshTokenApi(): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/refresh');
  return response.data;
}
