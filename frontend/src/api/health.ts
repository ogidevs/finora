import { apiClient } from './client';

export interface HealthStatus {
  status: string;
  database: string;
  environment: string;
  version: string;
  timestamp: string;
}

export async function checkBackendHealth(): Promise<HealthStatus> {
  const response = await apiClient.get<HealthStatus>('/health');
  return response.data;
}
