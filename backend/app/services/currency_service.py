from decimal import Decimal
from typing import Dict, List, Optional


CURRENCY_REGISTRY: Dict[str, dict] = {
    "EUR": {
        "code": "EUR",
        "name": "Euro",
        "symbol": "€",
        "default_rate": Decimal("1.0000"),
        "symbol_position": "prefix",
        "decimals": 2,
    },
    "USD": {
        "code": "USD",
        "name": "US Dollar",
        "symbol": "$",
        "default_rate": Decimal("1.0800"),
        "symbol_position": "prefix",
        "decimals": 2,
    },
    "RSD": {
        "code": "RSD",
        "name": "Serbian Dinar",
        "symbol": "din",
        "default_rate": Decimal("117.2000"),
        "symbol_position": "suffix",
        "decimals": 2,
    },
    "GBP": {
        "code": "GBP",
        "name": "British Pound",
        "symbol": "£",
        "default_rate": Decimal("0.8600"),
        "symbol_position": "prefix",
        "decimals": 2,
    },
    "CHF": {
        "code": "CHF",
        "name": "Swiss Franc",
        "symbol": "CHF",
        "default_rate": Decimal("0.9600"),
        "symbol_position": "prefix",
        "decimals": 2,
    },
    "CAD": {
        "code": "CAD",
        "name": "Canadian Dollar",
        "symbol": "CA$",
        "default_rate": Decimal("1.4800"),
        "symbol_position": "prefix",
        "decimals": 2,
    },
    "AUD": {
        "code": "AUD",
        "name": "Australian Dollar",
        "symbol": "A$",
        "default_rate": Decimal("1.6500"),
        "symbol_position": "prefix",
        "decimals": 2,
    },
    "JPY": {
        "code": "JPY",
        "name": "Japanese Yen",
        "symbol": "¥",
        "default_rate": Decimal("165.0000"),
        "symbol_position": "prefix",
        "decimals": 0,
    },
}


def get_supported_currencies() -> List[dict]:
    return list(CURRENCY_REGISTRY.values())


def get_currency_info(code: str) -> dict:
    upper_code = (code or "").upper().strip()
    if upper_code in CURRENCY_REGISTRY:
        return CURRENCY_REGISTRY[upper_code]
    return {
        "code": upper_code,
        "name": upper_code,
        "symbol": upper_code,
        "default_rate": Decimal("1.0000"),
        "symbol_position": "suffix",
        "decimals": 2,
    }


def get_default_rate(code: str) -> Decimal:
    return get_currency_info(code)["default_rate"]


def resolve_rate(code: str, custom_rate: Optional[Decimal] = None) -> Decimal:
    upper_code = (code or "").upper().strip()
    if upper_code == "EUR":
        return Decimal("1.0000")
    if custom_rate is not None and custom_rate > 0:
        return custom_rate
    return get_default_rate(upper_code)


def convert_currency(
    amount: Decimal,
    from_currency: str,
    to_currency: str,
    from_rate: Optional[Decimal] = None,
    to_rate: Optional[Decimal] = None,
) -> Decimal:
    c_from = (from_currency or "").upper().strip()
    c_to = (to_currency or "").upper().strip()

    if not c_from or not c_to or c_from == c_to:
        return amount

    r_from = resolve_rate(c_from, from_rate)
    r_to = resolve_rate(c_to, to_rate)

    if r_from <= 0:
        return amount

    base = amount / r_from
    return round(base * r_to, 2)


def to_primary_currency(
    amount: Decimal,
    currency: str,
    primary_currency: str,
    tx_rate: Optional[Decimal] = None,
    primary_rate: Optional[Decimal] = None,
) -> Decimal:
    c_from = (currency or "").upper().strip()
    c_to = (primary_currency or "").upper().strip()
    if not c_from or not c_to or c_from == c_to:
        return amount
    return convert_currency(
        amount=amount,
        from_currency=c_from,
        to_currency=c_to,
        from_rate=tx_rate,
        to_rate=primary_rate,
    )


def to_base_currency(
    amount: Decimal, currency: str, exchange_rate: Optional[Decimal] = None
) -> Decimal:
    rate_val = resolve_rate(currency, exchange_rate)
    if rate_val <= 0:
        return amount
    return round(amount / rate_val, 4)


def from_base_currency(
    amount_base: Decimal, target_currency: str, exchange_rate: Optional[Decimal] = None
) -> Decimal:
    rate_val = resolve_rate(target_currency, exchange_rate)
    return round(amount_base * rate_val, 2)


primary_to_base = to_base_currency
base_to_primary = from_base_currency

