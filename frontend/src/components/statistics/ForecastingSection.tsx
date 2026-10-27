import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  AlertTriangle,
  Cpu,
  BrainCircuit,
  Layers,
} from 'lucide-react';
import { type ForecastResponse } from '../../api/analytics';

interface ForecastingSectionProps {
  forecastData: ForecastResponse | null;
  loading: boolean;
  formatPrimary: (val: number | string) => string;
}

export const ForecastingSection: React.FC<ForecastingSectionProps> = ({
  forecastData,
  loading,
  formatPrimary,
}) => {
  const [selectedModel, setSelectedModel] = useState<'recommended' | 'prophet' | 'arima'>('recommended');

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-[#11141D] border border-white/[0.07] text-center text-xs text-slate-400">
        Fitting time-series forecasting models (Prophet & ARIMA)...
      </div>
    );
  }

  if (!forecastData) return null;

  if (!forecastData.eligible) {
    const progress = Math.min(100, Math.round((forecastData.historical_months_count / forecastData.min_required_months) * 100));

    return (
      <div className="p-6 rounded-2xl bg-[#11141D] border border-white/[0.07] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Time-Series Spending Forecasting</h3>
            <p className="text-xs text-slate-400">Requires at least 6 months of historical data</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161A26] border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Historical Data Sufficiency</span>
            <span className="font-bold text-amber-400 tnum">
              {forecastData.historical_months_count} / {forecastData.min_required_months} Months
            </span>
          </div>

          <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {forecastData.message}
          </p>
        </div>
      </div>
    );
  }

  const chartData = forecastData.points.map((pt) => {
    const act = pt.actual !== null && pt.actual !== undefined ? Number(pt.actual) : null;
    let proj: number | null = null;
    let low: number | null = null;
    let high: number | null = null;

    if (selectedModel === 'prophet' && forecastData.prophet) {
      proj = pt.prophet_projected !== null && pt.prophet_projected !== undefined ? Number(pt.prophet_projected) : null;
      low = pt.prophet_lower !== null && pt.prophet_lower !== undefined ? Number(pt.prophet_lower) : null;
      high = pt.prophet_upper !== null && pt.prophet_upper !== undefined ? Number(pt.prophet_upper) : null;
    } else if (selectedModel === 'arima' && forecastData.arima) {
      proj = pt.arima_projected !== null && pt.arima_projected !== undefined ? Number(pt.arima_projected) : null;
      low = pt.arima_lower !== null && pt.arima_lower !== undefined ? Number(pt.arima_lower) : null;
      high = pt.arima_upper !== null && pt.arima_upper !== undefined ? Number(pt.arima_upper) : null;
    } else {
      const p = pt.prophet_projected !== null && pt.prophet_projected !== undefined ? Number(pt.prophet_projected) : null;
      const a = pt.arima_projected !== null && pt.arima_projected !== undefined ? Number(pt.arima_projected) : null;
      if (p !== null && a !== null) {
        proj = Number(((p + a) / 2).toFixed(2));
      } else {
        proj = p ?? a;
      }
      const pLow = pt.prophet_lower !== null && pt.prophet_lower !== undefined ? Number(pt.prophet_lower) : null;
      const aLow = pt.arima_lower !== null && pt.arima_lower !== undefined ? Number(pt.arima_lower) : null;
      low = pLow !== null && aLow !== null ? Math.min(pLow, aLow) : pLow ?? aLow;

      const pHigh = pt.prophet_upper !== null && pt.prophet_upper !== undefined ? Number(pt.prophet_upper) : null;
      const aHigh = pt.arima_upper !== null && pt.arima_upper !== undefined ? Number(pt.arima_upper) : null;
      high = pHigh !== null && aHigh !== null ? Math.max(pHigh, aHigh) : pHigh ?? aHigh;
    }

    return {
      name: pt.month_label,
      Actual: act,
      Projected: proj,
      LowerBound: low,
      UpperBound: high,
    };
  });

  const activeProj =
    selectedModel === 'prophet' && forecastData.prophet
      ? forecastData.prophet.next_month_projected
      : selectedModel === 'arima' && forecastData.arima
      ? forecastData.arima.next_month_projected
      : forecastData.recommended_projection;

  const activeLow =
    selectedModel === 'prophet' && forecastData.prophet
      ? forecastData.prophet.lower_bound
      : selectedModel === 'arima' && forecastData.arima
      ? forecastData.arima.lower_bound
      : forecastData.recommended_lower;

  const activeHigh =
    selectedModel === 'prophet' && forecastData.prophet
      ? forecastData.prophet.upper_bound
      : selectedModel === 'arima' && forecastData.arima
      ? forecastData.arima.upper_bound
      : forecastData.recommended_upper;

  return (
    <div className="p-5 rounded-2xl bg-[#11141D] border border-white/[0.07] space-y-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <BrainCircuit className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">Time-Series Spending Forecast</h3>
        </div>
        <p className="text-xs text-slate-400">
          Next month expenditure projection based on {forecastData.historical_months_count} historical months
        </p>
      </div>

      <div className="flex items-center justify-center w-full">
        <div className="flex items-center justify-center rounded-xl bg-[#161A26] p-1 border border-white/[0.08] text-xs font-semibold w-full sm:w-auto max-w-md">
          <button
            type="button"
            onClick={() => setSelectedModel('recommended')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
              selectedModel === 'recommended'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ensemble
          </button>
          <button
            type="button"
            onClick={() => setSelectedModel('prophet')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
              selectedModel === 'prophet'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Meta Prophet
          </button>
          <button
            type="button"
            onClick={() => setSelectedModel('arima')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
              selectedModel === 'arima'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ARIMA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#161A26] border border-white/[0.06] flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 mb-1">
            Projected Spending ({forecastData.next_month_label})
          </span>
          <div className="text-xl font-bold text-indigo-400 tnum tracking-tight">
            {formatPrimary(activeProj || 0)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161A26] border border-white/[0.06] flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 mb-1">
            Expected Lower Bound (80% CI)
          </span>
          <div className="text-xl font-bold text-slate-200 tnum tracking-tight">
            {formatPrimary(activeLow || 0)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#161A26] border border-white/[0.06] flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-400 mb-1">
            Expected Upper Bound (80% CI)
          </span>
          <div className="text-xl font-bold text-slate-200 tnum tracking-tight">
            {formatPrimary(activeHigh || 0)}
          </div>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <XAxis
              dataKey="name"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="p-3 bg-[#171B26] border border-white/[0.1] rounded-xl shadow-xl text-xs space-y-1">
                      <div className="font-bold text-white mb-1">{item.name}</div>
                      {item.Actual !== null && (
                        <div className="text-rose-400 flex justify-between gap-3">
                          <span>Actual:</span>
                          <span className="font-semibold">{formatPrimary(item.Actual)}</span>
                        </div>
                      )}
                      {item.Projected !== null && item.Actual === null && (
                        <>
                          <div className="text-indigo-400 flex justify-between gap-3">
                            <span>Projected:</span>
                            <span className="font-semibold">{formatPrimary(item.Projected)}</span>
                          </div>
                          <div className="text-slate-400 pt-1 border-t border-white/[0.06] flex justify-between gap-3">
                            <span>Confidence Interval:</span>
                            <span className="font-semibold">
                              {formatPrimary(item.LowerBound)} &harr; {formatPrimary(item.UpperBound)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="UpperBound"
              fill="#6366F1"
              fillOpacity={0.12}
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="Actual"
              stroke="#F43F5E"
              strokeWidth={2.5}
              dot={{ fill: '#F43F5E', r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="Projected"
              stroke="#6366F1"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ fill: '#6366F1', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {forecastData.prophet && (
          <div className="p-3.5 rounded-xl bg-[#161A26] border border-white/[0.05] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Meta Prophet Model
              </span>
              <span className="text-xs font-bold text-indigo-400 tnum">
                {formatPrimary(forecastData.prophet.next_month_projected)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {forecastData.prophet.methodology}
            </p>
          </div>
        )}

        {forecastData.arima && (
          <div className="p-3.5 rounded-xl bg-[#161A26] border border-white/[0.05] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                ARIMA Time-Series
              </span>
              <span className="text-xs font-bold text-indigo-400 tnum">
                {formatPrimary(forecastData.arima.next_month_projected)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {forecastData.arima.methodology}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
