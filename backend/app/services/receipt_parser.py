import datetime as dt
from decimal import Decimal
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("receipt_parser")

AMOUNT_REGEX = r"(?:(?:\d{1,3}(?:\.\d{3})+|\d+)[,\.]\d{2})"

CYRILLIC_TO_LATIN = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'dj', 'е': 'e', 'ж': 'z',
    'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n',
    'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'c', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'c', 'џ': 'dz', 'ш': 's',
    'č': 'c', 'ć': 'c', 'ž': 'z', 'š': 's', 'đ': 'dj',
}


def clean_decimal(val_str: str) -> Optional[Decimal]:
    """Cleans European or standard decimal string into Decimal object."""
    cleaned = val_str.strip()
    cleaned = re.sub(r"[^\d,\.]", "", cleaned)
    if not cleaned:
        return None

    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    elif "." in cleaned:
        dots = cleaned.count(".")
        if dots > 1:
            parts = cleaned.rsplit(".", 1)
            cleaned = parts[0].replace(".", "") + "." + parts[1]

    try:
        val = Decimal(cleaned)
        if val > 0:
            return round(val, 2)
    except Exception:
        pass
    return None


def extract_date(lines: List[str]) -> Optional[dt.date]:
    """Finds date in DD.MM.YYYY, YYYY-MM-DD, or DD/MM/YYYY format."""
    patterns = [
        r"\b([0-3]?[0-9])[\.\/]([0-1]?[0-9])[\.\/](20\d{2})\b\.?",
        r"\b(20\d{2})[-\/\.]([0-1]?[0-9])[-\/\.]([0-3]?[0-9])\b",
        r"\b([0-3]?[0-9])-([0-1]?[0-9])-(20\d{2})\b",
    ]

    for line in lines:
        for pat in patterns:
            match = re.search(pat, line)
            if match:
                groups = match.groups()
                try:
                    if len(groups[0]) == 4:
                        year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                    else:
                        day, month, year = int(groups[0]), int(groups[1]), int(groups[2])

                    if 2000 <= year <= 2035 and 1 <= month <= 12 and 1 <= day <= 31:
                        return dt.date(year, month, day)
                except ValueError:
                    continue
    return None


def normalize_text_for_matching(text: str) -> str:
    """Normalizes Cyrillic and OCR artifact characters into standard Latin."""
    s = text.lower()
    out = [CYRILLIC_TO_LATIN.get(ch, ch) for ch in s]
    res = "".join(out)
    res = re.sub(r"\b3a\b", "za", res)
    res = re.sub(r"3a\s*9at[a-z]*", "za uplatu", res)
    res = re.sub(r"3a9at[a-z]*", "za uplatu", res)
    res = re.sub(r"3a\s*[yupn9][a-z0-9]*", "za uplatu", res)
    res = re.sub(r"ykyn[a-z]*", "ukupan", res)
    res = re.sub(r"ykyan[a-z]*", "ukupno", res)
    res = re.sub(r"n?3h[o0][sc]", "iznos", res)
    res = re.sub(r"mshoc", "iznos", res)
    res = re.sub(r"rotobnha|fotobnha|rorosnha", "gotovina", res)
    res = re.sub(r"y[nm]ateho", "uplaceno", res)
    res = re.sub(r"[in]obpataj", "povracaj", res)
    res = re.sub(r"npehoc\s*ha\s*pa[4y]yh", "prenos na racun", res)
    res = re.sub(r"nope3[a-z]*", "porez", res)
    return res


def is_excluded_line(norm_line: str) -> bool:
    """Returns True if the line represents payment method, tender, change, tax, or metadata."""
    if any(k in norm_line for k in ["uplaceno", "povracaj", "kusur"]):
        return True
    if "za uplatu" not in norm_line and any(
        k in norm_line for k in ["gotovina", "prenos na racun", "kartica", "cek"]
    ):
        return True
    if "porez" in norm_line or "stopa" in norm_line:
        return True
    if any(k in norm_line for k in ["pfr vreme", "brojac racuna", "pfr broj", "kasir", "kasa"]):
        return True
    return False


def extract_total_amount(lines: List[str]) -> Tuple[Optional[Decimal], str]:
    """Finds grand total amount and currency from fiscal receipt lines."""
    currency = "RSD"
    full_text = " ".join(lines).upper()
    if "EUR" in full_text or "€" in full_text or "EURO" in full_text:
        currency = "EUR"

    norm_lines = [normalize_text_for_matching(l) for l in lines]

    for i, (line, norm) in enumerate(zip(lines, norm_lines)):
        if is_excluded_line(norm):
            continue
        if "za uplatu" in norm or ("ukupan iznos" in norm and "porez" not in norm):
            amts = re.findall(AMOUNT_REGEX, line)
            parsed_amts = [clean_decimal(a) for a in amts if clean_decimal(a)]
            if parsed_amts:
                return parsed_amts[-1], currency
            if i + 1 < len(lines) and not is_excluded_line(norm_lines[i + 1]):
                next_amts = re.findall(AMOUNT_REGEX, lines[i + 1])
                parsed_next = [clean_decimal(a) for a in next_amts if clean_decimal(a)]
                if parsed_next:
                    return parsed_next[-1], currency

    for i, (line, norm) in enumerate(zip(lines, norm_lines)):
        if is_excluded_line(norm):
            continue
        if any(re.search(rf"\b{k}\b", norm) for k in ["ukupno", "svega", "total", "suma"]):
            amts = re.findall(AMOUNT_REGEX, line)
            parsed_amts = [clean_decimal(a) for a in amts if clean_decimal(a)]
            if parsed_amts:
                return parsed_amts[-1], currency
            if i + 1 < len(lines) and not is_excluded_line(norm_lines[i + 1]):
                next_amts = re.findall(AMOUNT_REGEX, lines[i + 1])
                parsed_next = [clean_decimal(a) for a in next_amts if clean_decimal(a)]
                if parsed_next:
                    return parsed_next[-1], currency

    for line, norm in zip(lines, norm_lines):
        if re.search(r"\b(?:et|eb|eh)[:\s]", norm):
            amts = re.findall(AMOUNT_REGEX, line)
            parsed_amts = [clean_decimal(a) for a in amts if clean_decimal(a)]
            if parsed_amts:
                return parsed_amts[-1], currency

    tendered_amount: Optional[Decimal] = None
    change_amount: Optional[Decimal] = None
    for line, norm in zip(lines, norm_lines):
        if "uplaceno" in norm:
            amts = [clean_decimal(a) for a in re.findall(AMOUNT_REGEX, line) if clean_decimal(a)]
            if amts:
                tendered_amount = amts[-1]
        elif "povracaj" in norm or "kusur" in norm:
            amts = [clean_decimal(a) for a in re.findall(AMOUNT_REGEX, line) if clean_decimal(a)]
            if amts:
                change_amount = amts[-1]

    if tendered_amount and change_amount and tendered_amount > change_amount:
        calc_total = tendered_amount - change_amount
        return calc_total, currency

    valid_fallback_amts: List[Decimal] = []
    for line, norm in zip(lines, norm_lines):
        if is_excluded_line(norm):
            continue
        for amt_str in re.findall(AMOUNT_REGEX, line):
            val = clean_decimal(amt_str)
            if val and 0.50 <= val <= 10_000_000:
                valid_fallback_amts.append(val)

    if valid_fallback_amts:
        return max(valid_fallback_amts), currency

    return None, currency


def clean_item_name(name_raw: str) -> str:
    """Cleans leading barcode/SKU numbers and trailing tax brackets."""
    cleaned = name_raw.strip()
    cleaned = re.sub(r"^\d{4,12}\s*", "", cleaned)
    cleaned = re.sub(r"\s*\([A-Za-zА-Яа-яЂђБбhH]\)\s*$", "", cleaned)
    cleaned = re.sub(r"\s+[A-Za-zА-Яа-яЂђБбhH]\s*$", "", cleaned)
    return cleaned.strip(" :-\t")


def extract_items_for_notes(lines: List[str]) -> str:
    """
    Extracts itemized purchases and prices into lines for the Note field.
    Handles both two-line receipt items (item name on line 1, price/qty on line 2)
    and single-line receipt items (item name and price on the same line).
    """
    header_end_triggers = [
        "artikli", "aptuk", "артикли", "promet prodaja", "pomet", "промет продаја",
        "naziv", "ha3n", "назив", "cena", "yena", "br pazara", "hvala na poseti",
    ]

    footer_start_triggers = [
        "za uplatu", "ukupan iznos", "укупан износ", "за уплату",
        "ukupno", "укупно", "gotovina", "kartica", "prenos na racun",
        "uplaceno", "povracaj", "porez", "ch18", "nb:", "eb:", "et:", "eh:",
        "stopa", "pfr vreme", "nop bpeme", "kraj fiskalnog", "pfr broj",
    ]

    start_idx = 0
    end_idx = len(lines)
    norm_lines = [normalize_text_for_matching(l) for l in lines]

    for i, norm in enumerate(norm_lines):
        is_col_header = any(k in norm for k in ["naziv", "cena", "kol", "ha3n", "yena", "kon"])
        if is_col_header or any(h in norm for h in header_end_triggers):
            start_idx = max(start_idx, i + 1)
            continue
        if any(f in norm for f in footer_start_triggers):
            end_idx = min(end_idx, i)
            break

    if start_idx >= end_idx:
        start_idx = 0

    target_lines = lines[start_idx:end_idx]

    content_lines: List[str] = []
    for line in target_lines:
        s = line.strip()
        if len(s) < 2:
            continue
        if re.match(r"^[=\-\*_~]+$", s):
            continue
        content_lines.append(s)

    items: List[str] = []
    i = 0
    while i < len(content_lines):
        curr_line = content_lines[i]
        curr_amts = re.findall(AMOUNT_REGEX, curr_line)

        if not curr_amts and i + 1 < len(content_lines):
            next_line = content_lines[i + 1]
            next_amts = re.findall(AMOUNT_REGEX, next_line)
            if next_amts:
                line_total = next_amts[-1]
                name = clean_item_name(curr_line)
                if len(name) >= 2:
                    items.append(f"{name}: {line_total}")
                    i += 2
                    continue

        if curr_amts:
            first_amt = curr_amts[0]
            idx = curr_line.find(first_amt)
            name_part = curr_line[:idx].strip()
            name = clean_item_name(name_part)
            if len(name) >= 2:
                items.append(f"{name}: {curr_amts[-1]}")
                i += 1
                continue

        if len(curr_line) > 2 and not re.match(r"^[\d\s\.,\*\=xX]+$", curr_line):
            name = clean_item_name(curr_line)
            if len(name) >= 3:
                items.append(name)

        i += 1

    return "\n".join(items[:25])


def parse_receipt(lines_or_payload: List[str] | Dict[str, Any]) -> Dict[str, Any]:
    """Parses extracted OCR lines into structured receipt data."""
    if isinstance(lines_or_payload, dict):
        lines: List[str] = list(lines_or_payload.get("lines") or [])
    else:
        lines = list(lines_or_payload)

    date_val = extract_date(lines)
    amount_val, currency_val = extract_total_amount(lines)
    items_note = extract_items_for_notes(lines)

    return {
        "amount": amount_val,
        "date": date_val or dt.date.today(),
        "currency": currency_val,
        "items_note": items_note,
        "raw_text": "\n".join(lines),
    }
