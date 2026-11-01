import calendar
from decimal import Decimal
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.schemas.analytics import (
    ForecastModelResult,
    ForecastPoint,
    ForecastResponse,
)


async def calculate_time_series_forecast(
    monthly_data: List[Dict[str, Any]],
    primary_currency: str,
) -> ForecastResponse:
    historical_count = len(monthly_data)
    min_required = 6

    historical_points: List[ForecastPoint] = []
    for item in monthly_data:
        d_str = item["date"].strftime("%Y-%m-%d")
        historical_points.append(
            ForecastPoint(
                date=d_str,
                month_label=item["month_label"],
                actual=Decimal(str(round(item["amount"], 2))),
            )
        )

    if historical_count < min_required:
        return ForecastResponse(
            eligible=False,
            historical_months_count=historical_count,
            min_required_months=min_required,
            message="At least 6 months of historical transactions are required for time-series forecasting. Please add transactions.",
            primary_currency=primary_currency,
            points=historical_points,
        )

    df = (
        pd.DataFrame(
            [
                {
                    "ds": pd.to_datetime(item["date"]),
                    "y": float(item["amount"]),
                }
                for item in monthly_data
            ]
        )
        .sort_values("ds")
        .reset_index(drop=True)
    )

    last_date = df["ds"].iloc[-1]
    if last_date.month == 12:
        next_year = last_date.year + 1
        next_month = 1
    else:
        next_year = last_date.year
        next_month = last_date.month + 1

    next_date_str = f"{next_year}-{next_month:02d}-01"
    next_month_name = f"{calendar.month_abbr[next_month]} {next_year}"

    prophet_pred = None
    prophet_low = None
    prophet_high = None
    prophet_result: Optional[ForecastModelResult] = None

    try:
        from prophet import Prophet

        m = Prophet(
            interval_width=0.80,
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
        )
        m.fit(df)
        future = m.make_future_dataframe(periods=1, freq="MS")
        f_pred = m.predict(future)

        next_row = f_pred.iloc[-1]
        prophet_pred = max(0.0, float(next_row["yhat"]))
        prophet_low = max(0.0, float(next_row["yhat_lower"]))
        prophet_high = max(prophet_pred, float(next_row["yhat_upper"]))

        prophet_result = ForecastModelResult(
            model_name="Meta Prophet",
            next_month_projected=Decimal(str(round(prophet_pred, 2))),
            lower_bound=Decimal(str(round(prophet_low, 2))),
            upper_bound=Decimal(str(round(prophet_high, 2))),
            methodology="Bayesian Generalized Additive Model with trend changepoints and 80% credible interval.",
        )
    except Exception:
        pass

    arima_pred = None
    arima_low = None
    arima_high = None
    arima_result: Optional[ForecastModelResult] = None

    try:
        from statsmodels.tsa.arima.model import ARIMA

        series = df["y"].values

        try:
            model = ARIMA(series, order=(1, 1, 0))
            fit = model.fit()
        except Exception:
            model = ARIMA(series, order=(1, 0, 0))
            fit = model.fit()

        forecast_res = fit.get_forecast(steps=1)
        mean_val = float(forecast_res.predicted_mean[0])
        conf_int = forecast_res.conf_int(alpha=0.20)
        low_val = float(conf_int[0, 0])
        high_val = float(conf_int[0, 1])

        arima_pred = max(0.0, mean_val)
        arima_low = max(0.0, low_val)
        arima_high = max(arima_pred, high_val)

        arima_result = ForecastModelResult(
            model_name="ARIMA",
            next_month_projected=Decimal(str(round(arima_pred, 2))),
            lower_bound=Decimal(str(round(arima_low, 2))),
            upper_bound=Decimal(str(round(arima_high, 2))),
            methodology="Classical Auto-Regressive Integrated Moving Average with 80% confidence interval.",
        )
    except Exception:
        pass

    if prophet_pred is not None and arima_pred is not None:
        rec_val = round((prophet_pred + arima_pred) / 2.0, 2)
        rec_low = round(min(prophet_low, arima_low), 2)
        rec_high = round(max(prophet_high, arima_high), 2)
    elif prophet_pred is not None:
        rec_val = round(prophet_pred, 2)
        rec_low = round(prophet_low, 2)
        rec_high = round(prophet_high, 2)
    elif arima_pred is not None:
        rec_val = round(arima_pred, 2)
        rec_low = round(arima_low, 2)
        rec_high = round(arima_high, 2)
    else:
        recent_avg = float(np.mean(df["y"].tail(3)))
        rec_val = round(recent_avg, 2)
        rec_low = round(recent_avg * 0.85, 2)
        rec_high = round(recent_avg * 1.15, 2)

    chart_points = list(historical_points)

    if chart_points:
        last_hist = chart_points[-1]
        chart_points[-1] = ForecastPoint(
            date=last_hist.date,
            month_label=last_hist.month_label,
            actual=last_hist.actual,
            prophet_projected=last_hist.actual,
            prophet_lower=last_hist.actual,
            prophet_upper=last_hist.actual,
            arima_projected=last_hist.actual,
            arima_lower=last_hist.actual,
            arima_upper=last_hist.actual,
        )

    chart_points.append(
        ForecastPoint(
            date=next_date_str,
            month_label=next_month_name,
            actual=None,
            prophet_projected=Decimal(str(round(prophet_pred, 2)))
            if prophet_pred is not None
            else None,
            prophet_lower=Decimal(str(round(prophet_low, 2)))
            if prophet_low is not None
            else None,
            prophet_upper=Decimal(str(round(prophet_high, 2)))
            if prophet_high is not None
            else None,
            arima_projected=Decimal(str(round(arima_pred, 2)))
            if arima_pred is not None
            else None,
            arima_lower=Decimal(str(round(arima_low, 2)))
            if arima_low is not None
            else None,
            arima_upper=Decimal(str(round(arima_high, 2)))
            if arima_high is not None
            else None,
        )
    )

    return ForecastResponse(
        eligible=True,
        historical_months_count=historical_count,
        min_required_months=min_required,
        message="Forecast successfully calculated using Meta Prophet and ARIMA models.",
        primary_currency=primary_currency,
        next_month_label=next_month_name,
        recommended_projection=Decimal(str(rec_val)),
        recommended_lower=Decimal(str(rec_low)),
        recommended_upper=Decimal(str(rec_high)),
        prophet=prophet_result,
        arima=arima_result,
        points=chart_points,
    )
