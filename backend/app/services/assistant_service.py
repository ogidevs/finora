import calendar
import datetime as dt
from collections import defaultdict
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.account import Account
from app.models.category import Category
from app.models.enums import AccountType, TransactionType
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.assistant import (
    AssistantChatResponse,
    AssistantInsightResponse,
    CategoryMoMItem,
    FinancialFacts,
)
from app.services.currency_service import from_base_currency, to_primary_currency
from app.services.forecasting import calculate_time_series_forecast
from app.services.ledger_service import (
    calculate_account_balance_base,
    get_monthly_expense_series,
)


async def calculate_financial_facts(
    db: AsyncSession,
    user: User,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> FinancialFacts:
    today = dt.date.today()
    target_year = year or today.year
    target_month = month or today.month

    curr_max_days = calendar.monthrange(target_year, target_month)[1]
    curr_start = dt.date(target_year, target_month, 1)
    curr_end = dt.date(target_year, target_month, curr_max_days)
    curr_label = f"{calendar.month_name[target_month]} {target_year}"

    if target_month == 1:
        prev_year = target_year - 1
        prev_month = 12
    else:
        prev_year = target_year
        prev_month = target_month - 1

    prev_max_days = calendar.monthrange(prev_year, prev_month)[1]
    prev_start = dt.date(prev_year, prev_month, 1)
    prev_end = dt.date(prev_year, prev_month, prev_max_days)
    prev_label = f"{calendar.month_name[prev_month]} {prev_year}"

    primary_cur = user.primary_currency
    rate = user.exchange_rate

    async def fetch_txs(start_d: dt.date, end_d: dt.date) -> List[Transaction]:
        q = (
            select(Transaction)
            .options(
                selectinload(Transaction.account),
                selectinload(Transaction.to_account),
                selectinload(Transaction.category).selectinload(Category.parent),
            )
            .where(
                Transaction.user_id == user.id,
                Transaction.date >= start_d,
                Transaction.date <= end_d,
            )
        )
        res = await db.execute(q)
        return list(res.scalars().all())

    curr_txs = await fetch_txs(curr_start, curr_end)
    prev_txs = await fetch_txs(prev_start, prev_end)

    def summarize_txs(
        tx_list: List[Transaction],
    ) -> Tuple[Decimal, Decimal, Decimal, Dict[str, Decimal]]:
        inc = Decimal("0.00")
        exp = Decimal("0.00")
        sav_net = Decimal("0.00")
        cat_exp: Dict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))

        for tx in tx_list:
            amt = to_primary_currency(
                tx.amount, tx.currency, primary_cur, tx.exchange_rate, rate
            )
            acc_type = tx.account.type if tx.account else AccountType.SPENDING
            to_acc_type = tx.to_account.type if tx.to_account else None

            if tx.type == TransactionType.INCOME:
                inc += amt
            elif tx.type == TransactionType.EXPENSE:
                exp += amt
                cat_name = (
                    tx.category.parent.name
                    if tx.category and tx.category.parent
                    else (tx.category.name if tx.category else "General")
                )
                cat_exp[cat_name] += amt
            elif tx.type == TransactionType.TRANSFER:
                if acc_type != AccountType.SAVINGS and to_acc_type == AccountType.SAVINGS:
                    exp += amt
                    sav_net += amt
                    cat_exp["Savings Transfers"] += amt
                elif acc_type == AccountType.SAVINGS and to_acc_type != AccountType.SAVINGS:
                    inc += amt
                    sav_net -= amt

        return round(inc, 2), round(exp, 2), round(sav_net, 2), cat_exp

    curr_inc, curr_exp, curr_sav_net, curr_cat_exp = summarize_txs(curr_txs)
    prev_inc, prev_exp, _, prev_cat_exp = summarize_txs(prev_txs)

    curr_diff = round(curr_inc - curr_exp, 2)
    prev_diff = round(prev_inc - prev_exp, 2)

    mom_exp_pct = (
        round(float((curr_exp - prev_exp) / prev_exp * 100), 1)
        if prev_exp > Decimal("0.00")
        else 0.0
    )
    mom_inc_pct = (
        round(float((curr_inc - prev_inc) / prev_inc * 100), 1)
        if prev_inc > Decimal("0.00")
        else 0.0
    )

    acc_res = await db.execute(
        select(Account).where(
            Account.user_id == user.id,
            Account.type == AccountType.SAVINGS,
        )
    )
    savings_accounts = acc_res.scalars().all()
    total_savings_base = Decimal("0.00")

    for s_acc in savings_accounts:
        total_savings_base += await calculate_account_balance_base(
            db, user.id, s_acc
        )

    savings_balance_primary = from_base_currency(total_savings_base, primary_cur, rate)

    all_cats = set(curr_cat_exp.keys()) | set(prev_cat_exp.keys())
    top_categories: List[CategoryMoMItem] = []
    category_spikes: List[CategoryMoMItem] = []

    for c_name in all_cats:
        c_curr = round(curr_cat_exp.get(c_name, Decimal("0.00")), 2)
        c_prev = round(prev_cat_exp.get(c_name, Decimal("0.00")), 2)
        if c_curr <= Decimal("0.00") and c_prev <= Decimal("0.00"):
            continue

        change_pct = (
            round(float((c_curr - c_prev) / c_prev * 100), 1)
            if c_prev > Decimal("0.00")
            else (100.0 if c_curr > Decimal("0.00") else 0.0)
        )
        share_pct = (
            round(float(c_curr / curr_exp * 100), 1)
            if curr_exp > Decimal("0.00")
            else 0.0
        )

        item = CategoryMoMItem(
            category_name=c_name,
            current_amount=c_curr,
            previous_amount=c_prev,
            change_pct=change_pct,
            share_pct=share_pct,
        )
        if c_curr > Decimal("0.00"):
            top_categories.append(item)
        if c_prev > Decimal("0.00") and change_pct >= 20.0 and c_curr > Decimal("10.00"):
            category_spikes.append(item)

    top_categories.sort(key=lambda x: x.current_amount, reverse=True)
    category_spikes.sort(key=lambda x: x.change_pct, reverse=True)

    forecast_val: Optional[Decimal] = None
    try:
        monthly_data = await get_monthly_expense_series(db, user)
        fc = await calculate_time_series_forecast(
            monthly_data=monthly_data,
            primary_currency=primary_cur,
        )
        if fc.eligible and fc.recommended_projection is not None:
            forecast_val = fc.recommended_projection
    except Exception:
        forecast_val = None

    return FinancialFacts(
        period=curr_label,
        previous_period=prev_label,
        primary_currency=primary_cur,
        income=curr_inc,
        expenses=curr_exp,
        difference=curr_diff,
        prev_income=prev_inc,
        prev_expenses=prev_exp,
        prev_difference=prev_diff,
        mom_expense_change_pct=mom_exp_pct,
        mom_income_change_pct=mom_inc_pct,
        savings_account_balance=savings_balance_primary,
        savings_net_transfers=curr_sav_net,
        top_categories=top_categories[:5],
        category_spikes=category_spikes[:3],
        forecast_next_month=forecast_val,
    )


def _generate_rule_based_insights(facts: FinancialFacts) -> Tuple[str, List[str]]:
    cur = facts.primary_currency
    lines = [
        f"## Financial Overview ({facts.period})",
        f"- **Income:** {facts.income} {cur} (prev: {facts.prev_income} {cur})",
        f"- **Expenses:** {facts.expenses} {cur} (prev: {facts.prev_expenses} {cur}, {facts.mom_expense_change_pct:+.1f}% MoM)",
        f"- **Net Cash Flow:** {facts.difference:+} {cur}",
        f"- **Savings Balance:** {facts.savings_account_balance} {cur}",
    ]

    if facts.top_categories:
        top = facts.top_categories[0]
        lines.append(
            f"\nYour highest spending category is **{top.category_name}** at **{top.current_amount} {cur}** ({top.share_pct:.1f}% of total expenses)."
        )

    if facts.forecast_next_month is not None:
        lines.append(
            f"\n**Projected Next Month Spending:** ~{facts.forecast_next_month} {cur} (Prophet/ARIMA ensemble)."
        )

    recs: List[str] = []
    if facts.difference < Decimal("0.00"):
        recs.append(
            f"Expenses exceeded income by {abs(facts.difference)} {cur} in {facts.period}. Consider reviewing discretionary categories."
        )
    elif facts.income > Decimal("0.00"):
        sav_rate = float(facts.difference / facts.income * 100)
        recs.append(
            f"Positive net cash flow achieved ({sav_rate:.1f}% surplus rate). Consider allocating a portion of the {facts.difference} {cur} surplus to your Savings account."
        )

    if facts.category_spikes:
        sp = facts.category_spikes[0]
        recs.append(
            f"Spending in '{sp.category_name}' rose by {sp.change_pct:.0f}% compared to {facts.previous_period} ({sp.previous_amount} -> {sp.current_amount} {cur})."
        )

    if facts.top_categories:
        top = facts.top_categories[0]
        recs.append(
            f"Monitor '{top.category_name}', which accounts for {top.share_pct:.0f}% of your monthly outflow."
        )

    if not recs:
        recs.append(
            "Continue logging daily transactions and receipts to build deeper historical baselines."
        )

    return "\n".join(lines), recs[:4]


async def _call_ollama(prompt: str, system_prompt: str) -> Optional[str]:
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = (data.get("response") or "").strip()
                if text:
                    return text
    except Exception:
        pass
    return None


def _format_facts_context(facts: FinancialFacts) -> str:
    cur = facts.primary_currency
    top_cats_str = (
        ", ".join(
            f"{c.category_name}: {c.current_amount} {cur} ({c.share_pct:.1f}%)"
            for c in facts.top_categories
        )
        or "None"
    )
    spikes_str = (
        ", ".join(
            f"{s.category_name}: +{s.change_pct:.1f}% ({s.previous_amount} -> {s.current_amount} {cur})"
            for s in facts.category_spikes
        )
        or "None"
    )
    fc_str = (
        f"{facts.forecast_next_month} {cur}"
        if facts.forecast_next_month is not None
        else "Insufficient history (< 6 months)"
    )

    return (
        f"Period: {facts.period} (Compared to {facts.previous_period})\n"
        f"Primary Currency: {cur}\n"
        f"Current Month Income: {facts.income} {cur} (Previous: {facts.prev_income} {cur}, MoM: {facts.mom_income_change_pct:+.1f}%)\n"
        f"Current Month Expenses: {facts.expenses} {cur} (Previous: {facts.prev_expenses} {cur}, MoM: {facts.mom_expense_change_pct:+.1f}%)\n"
        f"Net Cashflow Difference: {facts.difference:+} {cur} (Previous: {facts.prev_difference:+} {cur})\n"
        f"Total Dedicated Savings Account Balance: {facts.savings_account_balance} {cur}\n"
        f"Net Transfers to Savings This Period: {facts.savings_net_transfers} {cur}\n"
        f"Top Expense Categories: {top_cats_str}\n"
        f"Notable Category Spikes: {spikes_str}\n"
        f"Next Month Forecasted Expenses (Prophet/ARIMA): {fc_str}\n"
    )


async def generate_assistant_insights(
    db: AsyncSession,
    user: User,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> AssistantInsightResponse:
    facts = await calculate_financial_facts(db, user, month=month, year=year)
    fallback_summary, fallback_recs = _generate_rule_based_insights(facts)

    system_prompt = (
        "You are Finora AI, a concise, numbers-driven personal financial advisor. "
        "Use ONLY the exact figures provided in the user's financial snapshot. "
        "Never invent numbers or currencies. Format your response in clean Markdown with short bullet points."
    )
    user_prompt = (
        "Analyze the following verified financial snapshot and provide a concise executive summary "
        "(3-5 sentences/bullets) highlighting cashflow performance, notable category trends, and savings health:\n\n"
        f"{_format_facts_context(facts)}"
    )

    llm_reply = await _call_ollama(user_prompt, system_prompt)
    if llm_reply:
        return AssistantInsightResponse(
            facts=facts,
            summary=llm_reply,
            provider="ollama",
            model=settings.OLLAMA_MODEL,
            recommendations=fallback_recs,
        )

    return AssistantInsightResponse(
        facts=facts,
        summary=fallback_summary,
        provider="rule_based_fallback",
        model="deterministic-engine-v1",
        recommendations=fallback_recs,
    )


async def chat_with_assistant(
    db: AsyncSession,
    user: User,
    message: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> AssistantChatResponse:
    facts = await calculate_financial_facts(db, user, month=month, year=year)
    context_str = _format_facts_context(facts)

    system_prompt = (
        "You are Finora AI, an intelligent financial assistant embedded in a personal finance tracker. "
        "Answer the user's question directly and concisely using their verified financial data below. "
        "Do not fabricate transactions or balances.\n\n"
        f"=== VERIFIED USER FINANCIAL SNAPSHOT ===\n{context_str}"
    )

    llm_reply = await _call_ollama(message, system_prompt)
    if llm_reply:
        return AssistantChatResponse(
            reply=llm_reply,
            provider="ollama",
            model=settings.OLLAMA_MODEL,
        )

    summary, recs = _generate_rule_based_insights(facts)
    rec_bullets = "\n".join(f"- {r}" for r in recs)
    fallback_reply = (
        f"{summary}\n\n### Key Recommendations\n{rec_bullets}\n\n"
        "*(Note: Local Ollama LLM is currently unreachable; showing deterministic financial analysis.)*"
    )
    return AssistantChatResponse(
        reply=fallback_reply,
        provider="rule_based_fallback",
        model="deterministic-engine-v1",
    )
