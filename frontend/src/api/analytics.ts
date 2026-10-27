import { apiClient } from './client';

export interface SubcategoryStat {
  id: number;
  name: string;
  total_amount_primary: number | string;
  percentage: number;
  transaction_count: number;
}

export interface CategoryStat {
  category_id: number;
  category_name: string;
  type: 'EXPENSE' | 'INCOME';
  color?: string | null;
  icon?: string | null;
  total_amount_primary: number | string;
  percentage: number;
  transaction_count: number;
  subcategories: SubcategoryStat[];
}

export interface CategoryAnalyticsResponse {
  period: 'day' | 'month' | 'year';
  day?: number | null;
  month?: number | null;
  year: number;
  period_label?: string | null;
  primary_currency: string;
  total_expense_primary: number | string;
  total_income_primary: number | string;
  net_difference_primary: number | string;
  total_savings_primary: number | string;
  net_savings_primary?: number | string;
  savings_rate?: number;
  categories: CategoryStat[];
}

export interface MonthlyTrendItem {
  year: number;
  month: number;
  month_label: string;
  income_primary: number | string;
  expense_primary: number | string;
  difference_primary: number | string;
  net_primary?: number | string;
  savings_rate?: number;
}

export interface AnalyticsTrendsResponse {
  primary_currency: string;
  trends: MonthlyTrendItem[];
  average_monthly_expense: number | string;
  average_monthly_income: number | string;
  highest_expense_month?: string | null;
  lowest_expense_month?: string | null;
}

export interface ForecastModelResult {
  model_name: string;
  next_month_projected: number | string;
  lower_bound: number | string;
  upper_bound: number | string;
  methodology: string;
}

export interface ForecastPoint {
  date: string;
  month_label: string;
  actual?: number | string | null;
  prophet_projected?: number | string | null;
  prophet_lower?: number | string | null;
  prophet_upper?: number | string | null;
  arima_projected?: number | string | null;
  arima_lower?: number | string | null;
  arima_upper?: number | string | null;
}

export interface ForecastResponse {
  eligible: boolean;
  historical_months_count: number;
  min_required_months: number;
  message: string;
  primary_currency: string;
  next_month_label?: string | null;
  recommended_projection?: number | string | null;
  recommended_lower?: number | string | null;
  recommended_upper?: number | string | null;
  prophet?: ForecastModelResult | null;
  arima?: ForecastModelResult | null;
  points: ForecastPoint[];
}

export async function getAnalyticsSummaryApi(params: {
  period: 'day' | 'month' | 'year';
  day?: number;
  month?: number;
  year?: number;
}): Promise<CategoryAnalyticsResponse> {
  const response = await apiClient.get<CategoryAnalyticsResponse>('/analytics/summary', { params });
  return response.data;
}

export async function getAnalyticsTrendsApi(months_limit: number = 12): Promise<AnalyticsTrendsResponse> {
  const response = await apiClient.get<AnalyticsTrendsResponse>('/analytics/trends', {
    params: { months_limit },
  });
  return response.data;
}

export async function getAnalyticsForecastApi(): Promise<ForecastResponse> {
  const response = await apiClient.get<ForecastResponse>('/analytics/forecast');
  return response.data;
}

