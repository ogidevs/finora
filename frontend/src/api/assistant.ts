import { apiClient } from './client';

export interface CategoryMoMItem {
  category_name: string;
  current_amount: number;
  previous_amount: number;
  change_pct: number;
  share_pct: number;
}

export interface FinancialFacts {
  period: string;
  previous_period: string;
  primary_currency: string;
  income: number;
  expenses: number;
  difference: number;
  prev_income: number;
  prev_expenses: number;
  prev_difference: number;
  mom_expense_change_pct: number;
  mom_income_change_pct: number;
  savings_account_balance: number;
  savings_net_transfers: number;
  top_categories: CategoryMoMItem[];
  category_spikes: CategoryMoMItem[];
  forecast_next_month: number | null;
}

export interface AssistantInsightResponse {
  facts: FinancialFacts;
  summary: string;
  provider: string;
  model: string;
  recommendations: string[];
}

export interface AssistantChatRequest {
  message: string;
  month?: number;
  year?: number;
}

export interface AssistantChatResponse {
  reply: string;
  provider: string;
  model: string;
}

export async function getAssistantInsightsApi(
  month?: number,
  year?: number
): Promise<AssistantInsightResponse> {
  const params: Record<string, number> = {};
  if (month !== undefined) params.month = month;
  if (year !== undefined) params.year = year;

  const response = await apiClient.get<AssistantInsightResponse>('/assistant/insights', {
    params,
    timeout: 60000,
  });
  return response.data;
}

export async function chatWithAssistantApi(
  payload: AssistantChatRequest
): Promise<AssistantChatResponse> {
  const response = await apiClient.post<AssistantChatResponse>('/assistant/chat', payload, {
    timeout: 60000,
  });
  return response.data;
}
