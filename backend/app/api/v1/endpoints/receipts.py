import os
import tempfile
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.api.deps import CurrentUserDep
from app.schemas.receipt import ReceiptScanResponse
from app.services.ocr_service import extract_text_from_receipt
from app.services.receipt_parser import parse_receipt

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


@router.post(
    "/scan",
    response_model=ReceiptScanResponse,
    summary="Scan receipt image with OCR",
    description="Uploads a receipt image, extracts text using PaddleOCR, and parses total amount, date, currency, and line items.",
)
async def scan_receipt(
    current_user: CurrentUserDep,
    file: UploadFile = File(...),
) -> ReceiptScanResponse:
    filename = file.filename or "receipt.jpg"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(raw_bytes)
            tmp_path = tmp.name

        ocr_lines = extract_text_from_receipt(tmp_path)
        parsed = parse_receipt(ocr_lines)

        return ReceiptScanResponse(
            amount=parsed["amount"],
            date=parsed["date"],
            currency=parsed["currency"],
            items_note=parsed["items_note"],
            raw_text=parsed["raw_text"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process receipt image: {str(e)}",
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
