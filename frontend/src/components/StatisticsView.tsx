import React, { useState, useEffect } from 'react';
import {
  getAnalyticsSummaryApi,
  getAnalyticsTrendsApi,
  getAnalyticsForecastApi,
  type CategoryAnalyticsResponse,
  type AnalyticsTrendsResponse,
  type ForecastResponse,
} from '../api/analytics';
import { BarChart3, TrendingUp, BrainCircuit } from 'lucide-react';
import { StatsSummaryCards } from './statistics/StatsSummaryCards';
import { StatsChart } from './statistics/StatsChart';
import { CategoryPieChart } from './statistics/CategoryPieChart';
import { MonthlyTrendsChart } from './statistics/MonthlyTrendsChart';
import { ForecastingSection } from './statistics/ForecastingSection';
import { CategoryBreakdownList } from './statistics/CategoryBreakdownList';
import { formatCurrencyAmount } from '../utils/currency';

interface StatisticsViewProps {
  primaryCurrency: string;
  exchangeRate: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  primaryCurrency,
  exchangeRate,
}) => {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'forecast'>('overview');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('pie');

  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const [data, setData] = useState<CategoryAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [trendsData, setTrendsData] = useState<AnalyticsTrendsResponse | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);



  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getAnalyticsSummaryApi({
        period,
        day: period === 'day' ? selectedDay : undefined,
        month: period !== 'year' ? selectedMonth : undefined,
        year: selectedYear,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    setLoadingTrends(true);
    try {
      const res = await getAnalyticsTrendsApi(12);
      setTrendsData(res);
    } catch (err) {
      console.error('Failed to load trends:', err);
    } finally {
      setLoadingTrends(false);
    }
  };

  const fetchForecast = async () => {
    setLoadingForecast(true);
    try {
      const res = await getAnalyticsForecastApi();
      setForecastData(res);
    } catch (err) {
      console.error('Failed to load forecast:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period, selectedDay, selectedMonth, selectedYear, primaryCurrency, exchangeRate]);

  useEffect(() => {
    if (activeTab === 'trends') {
      fetchTrends();
    } else if (activeTab === 'forecast') {
      fetchForecast();
    }
  }, [activeTab, primaryCurrency, exchangeRate]);



  const formatPrimary = (val: number | string) => formatCurrencyAmount(val, primaryCurrency);

  const expenseCategories = data?.categories.filter((c) => c.type === 'EXPENSE') || [];
  const chartData = expenseCategories.map((c) => ({
    name: c.category_name,
    amount: typeof c.total_amount_primary === 'string' ? parseFloat(c.total_amount_primary) : c.total_amount_primary,
    color: c.color || '#6366F1',
    percentage: c.percentage,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#11141D] border border-white/[0.07]">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Financial Intelligence & Analytics</h2>
          <p className="text-xs text-slate-400">Cashflow breakdown, trends, and time-series forecasting</p>
        </div>
      </div>

      <div className="flex rounded-xl bg-[#11141D] p-1 border border-white/[0.07] text-xs font-semibold gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-1 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
          <span>Categories</span>
          <span className="hidden sm:inline">Breakdown</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trends')}
          className={`flex-1 py-2 px-1 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'trends'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span>Trends</span>
          <span className="hidden sm:inline">Monthly</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 py-2 px-1 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'forecast'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5 shrink-0" />
          <span>Forecast</span>
          <span className="hidden md:inline">(Prophet/ARIMA)</span>
        </button>
      </div>



      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#11141D] border border-white/[0.06]">
            <div className="flex rounded-xl bg-[#161A26] p-0.5 border border-white/[0.08] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPeriod('day')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  period === 'day'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  period === 'month'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setPeriod('year')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  period === 'year'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Year
              </button>
            </div>

            <div className="flex items-center gap-2">
              {period === 'day' && (
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className="px-3 py-1.5 bg-[#161A26] border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {Array.from(
                    { length: new Date(selectedYear, selectedMonth, 0).getDate() },
                    (_, i) => i + 1
                  ).map((d) => (
                    <option key={d} value={d}>
                      {d}.
                    </option>
                  ))}
                </select>
              )}

              {(period === 'day' || period === 'month') && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1.5 bg-[#161A26] border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-[#161A26] border border-white/[0.08] rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>

              <div className="flex rounded-lg bg-[#161A26] p-0.5 border border-white/[0.08] text-xs ml-2">
                <button
                  type="button"
                  onClick={() => setChartType('pie')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    chartType === 'pie'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Donut
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    chartType === 'bar'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bars
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span>Loading analytics...</span>
            </div>
          ) : !data || data.categories.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-[#11141D] border border-white/[0.07] p-8 space-y-3">
              <h3 className="text-sm font-bold text-white">No Transactions Recorded</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are no recorded expenses or incomes for{' '}
                {period === 'day'
                  ? `${selectedDay}. ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                  : period === 'month'
                  ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                  : `${selectedYear}`}.
              </p>
            </div>
          ) : (
            <>
              <StatsSummaryCards data={data} formatPrimary={formatPrimary} />
              {chartType === 'pie' ? (
                <CategoryPieChart categories={data.categories} formatPrimary={formatPrimary} />
              ) : (
                <StatsChart chartData={chartData} formatPrimary={formatPrimary} />
              )}
              <CategoryBreakdownList categories={data.categories} formatPrimary={formatPrimary} />
            </>
          )}
        </div>
      )}

      {activeTab === 'trends' && (
        <MonthlyTrendsChart
          trendsData={trendsData}
          loading={loadingTrends}
          formatPrimary={formatPrimary}
        />
      )}

      {activeTab === 'forecast' && (
        <ForecastingSection
          forecastData={forecastData}
          loading={loadingForecast}
          formatPrimary={formatPrimary}
        />
      )}
    </div>
  );
};
