import datetime as dt
from decimal import Decimal
import io
import uuid
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.services.receipt_parser import (
    clean_decimal,
    extract_date,
    extract_total_amount,
    parse_receipt,
)

client = TestClient(app)


def create_sample_receipt_image() -> bytes:
    img = Image.new("RGB", (400, 500), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "FISKALNI RACUN", fill=(0, 0, 0))
    draw.text((20, 50), "Datum: 28.09.2026.", fill=(0, 0, 0))
    draw.text((20, 90), "Mleko 1L 150,00", fill=(0, 0, 0))
    draw.text((20, 120), "Hleb Beli 100,00", fill=(0, 0, 0))
    draw.text((20, 160), "UKUPNO: 1.250,50", fill=(0, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_receipt_parser_helpers():
    assert clean_decimal("1.250,50") == Decimal("1250.50")
    assert clean_decimal("250,00") == Decimal("250.00")
    assert clean_decimal("2283,87") == Decimal("2283.87")

    lines = ["RACUN BR 123", "Datum: 28.09.2026.", "Vreme 14:00"]
    assert extract_date(lines) == dt.date(2026, 9, 28)

    total_lines = ["Hleb 100,00", "UKUPNO: 1.250,50 RSD"]
    amt, cur = extract_total_amount(total_lines)
    assert amt == Decimal("1250.50")
    assert cur == "RSD"


def test_yettel_receipt_format():
    lines = [
        "ФИСКАЛНИ РАЧУН",
        "104318304",
        "Yettel d.o.o.",
        "ПРОМЕТ ПРОДАЈА",
        "Артикли",
        "Назив Цена Кол. Укупно",
        "IPHONE 17 PRO MAX 1TB SILVER (Ђ)",
        "231.576,00 1 231.576,00",
        "Eco Bag (Ђ)",
        "20,00 1 20,00",
        "Укупан износ: 231.596,00",
        "Пренос на рачун: 208.438,40",
        "Готовина: 23.157,60",
        "ПФР време: 18.07.2026. 11:23:47"
    ]
    parsed = parse_receipt(lines)
    assert parsed["amount"] == Decimal("231596.00")
    assert parsed["date"] == dt.date(2026, 7, 18)
    assert "IPHONE 17 PRO MAX 1TB SILVER: 231.576,00" in parsed["items_note"]
    assert "Eco Bag: 20,00" in parsed["items_note"]


def test_home_center_receipt_format():
    lines = [
        "Home Center d.o.o.",
        "Hvala na poseti!",
        "Br pazara: 195557",
        "0186558 SK-3350 NOZIC ZA VOCE 6",
        "1x 99,00 99,00 Б",
        "0186969 GQ0949-0905 KERAMICKA CI",
        "1x 199,00 199,00 Б",
        "ЗА УПЛАТУ: 298,00",
        "ГОТОВИНА: 508,00",
        "ПОВРАЋАЈ: 210,00",
        "27.10.2010-19:30"
    ]
    parsed = parse_receipt(lines)
    assert parsed["amount"] == Decimal("298.00")
    assert parsed["date"] == dt.date(2010, 10, 27)
    assert "SK-3350 NOZIC ZA VOCE 6: 99,00" in parsed["items_note"]
    assert "GQ0949-0905 KERAMICKA CI: 199,00" in parsed["items_note"]


def test_dis_receipt_format():
    lines = [
        "350864 Dis velika potrosacka kesa bela (D)",
        "(КОМ) 1 * 15,99= 15,99",
        "354846 Pink smrznuti sarajevski cevap (D)",
        "(КОМ) 1 * 587,99= 587,99",
        "054673 Balans+ jogurt 1,5 kg",
        "(КОМ) 1 * 199,99= 199,99",
        "Ukupan iznos za uplatu: 2283,87",
        "Kartica: 2283,87",
        "PFR vreme: 20.01.2023. 16:18:11"
    ]
    parsed = parse_receipt(lines)
    assert parsed["amount"] == Decimal("2283.87")
    assert parsed["date"] == dt.date(2023, 1, 20)
    assert "Dis velika potrosacka kesa bela: 15,99" in parsed["items_note"]
    assert "Pink smrznuti sarajevski cevap: 587,99" in parsed["items_note"]
    assert "Balans+ jogurt 1,5 kg: 199,99" in parsed["items_note"]


def test_real_home_center_ocr_output():
    # Exact OCR lines from actual Home Center receipt
    lines = [
        "Home Center d.0.0.",
        "Sa10n 0120Kasa4",
        "Bulevar vojvode Misica 12",
        "Beograd,SavskiVenac",
        "Tel.:011)2067500",
        "n6:104794081",
        "M6MA111930",
        "Hvala na poseti",
        "Br pazara: 195557",
        "0186558SK-3350NOZIC ZAVOCE6",
        "1x 99,00 99,00",
        "0186969GQ0949-0905 KERAMICKA CI",
        "1x 199,00 199,00h",
        "Ch18.00%",
        "nb: 45,46",
        "NT: 45,46",
        "Eh: 298,00",
        "ET: 298,00",
        "3A9ATY: 298,00",
        "rOTOBNHA: 508,00",
        "yMATEHO: 508,00",
        "NOBPATAJ: 210,00",
        "27.10.2010-19:30",
        "60195557",
        "00001 snezanat #1i",
    ]
    parsed = parse_receipt(lines)
    assert parsed["amount"] == Decimal("298.00")
    assert parsed["date"] == dt.date(2010, 10, 27)
    assert "SK-3350NOZIC ZAVOCE6: 99,00" in parsed["items_note"]
    assert "GQ0949-0905 KERAMICKA CI: 199,00" in parsed["items_note"]
    # Ensure payment/tender lines are not in note
    assert "508,00" not in parsed["items_note"]
    assert "210,00" not in parsed["items_note"]


def test_real_yettel_ocr_output():
    # Exact OCR lines from actual Yettel receipt
    lines = [
        "OMCKAH PANYH",
        "104318304",
        "Yettel d.o.o.",
        "EYnEHAP BYPOA BCOHA 12 1127398.PR0DAVNICA TC GALERIJA 601",
        "Seorpan-Cascn BeHau najevtic",
        "Kacup: 24/1.0",
        "ECHP 6poj: -POMET nPONAJA-",
        "ApTuknn",
        "Ha3nB Yena Kon. ykynHo",
        "IPHONE 17 PRO MAX 1TB SILVER 5 231.576.00 1 231.576.00",
        "Eco Bag (h)",
        "20,00 1 20,00",
        "ykynaH n3HOC: 231.596,00",
        "Npehoc Ha pa4yH: 208.438.40",
        "rorosnHa: 23.157,60",
        "03HaKa MMe Crona Nlope3",
        "0-nAB 20.08% 38.599,33",
        "ykynaH n3Hoc nope3a 38.599,33",
        "noP speme: 18.07.2026.11:23:47",
        "nP 6poj pa4yHa: AZV8L95Z-372A5W00-1121",
        "Bpoja4 pa4yHa: 1113/112100",
    ]
    parsed = parse_receipt(lines)
    assert parsed["amount"] == Decimal("231596.00")
    assert parsed["date"] == dt.date(2026, 7, 18)
    assert "IPHONE 17 PRO MAX 1TB SILVER" in parsed["items_note"]
    assert "231.576.00" in parsed["items_note"]
    assert "Eco Bag: 20,00" in parsed["items_note"]
    # Ensure tax total and card/cash lines are not in note
    assert "38.599,33" not in parsed["items_note"]
    assert "208.438.40" not in parsed["items_note"]



def test_scan_receipt_api():
    uid = uuid.uuid4().hex[:8]
    user_payload = {
        "username": f"scan_{uid}",
        "email": f"scan_{uid}@example.com",
        "password": "Password123!"
    }
    reg_res = client.post("/api/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    authed = TestClient(app, cookies={"access_token": reg_res.cookies["access_token"]})

    img_bytes = create_sample_receipt_image()
    files = {"file": ("receipt.jpg", img_bytes, "image/jpeg")}
    res = authed.post("/api/receipts/scan", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "amount" in data
    assert "date" in data
    assert "items_note" in data

