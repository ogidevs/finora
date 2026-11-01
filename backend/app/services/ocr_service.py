import logging
from typing import Any, Dict, List, Optional
from paddleocr import PaddleOCR
from app.services.receipt_preprocessor import load_image_as_cv2, preprocess_receipt_image

logger = logging.getLogger("ocr_service")

_ocr_instance: Optional[PaddleOCR] = None


def get_ocr_engine(force_cpu: bool = False) -> PaddleOCR:
    """
    Returns a singleton PaddleOCR engine instance.
    Automatically enables GPU acceleration when PaddlePaddle has CUDA support and a GPU is present,
    falling back gracefully to CPU otherwise.
    """
    global _ocr_instance
    if force_cpu:
        logger.info("Initializing PaddleOCR on CPU (fallback)...")
        _ocr_instance = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            use_gpu=False,
            show_log=False,
        )
        return _ocr_instance

    if _ocr_instance is None:
        use_gpu = False
        try:
            import paddle

            use_gpu = bool(
                paddle.device.is_compiled_with_cuda()
                and paddle.device.cuda.device_count() > 0
            )
        except Exception:
            use_gpu = False

        device_label = "GPU" if use_gpu else "CPU"
        logger.info(f"Initializing PaddleOCR on {device_label}...")
        try:
            _ocr_instance = PaddleOCR(
                use_angle_cls=True,
                lang="en",
                use_gpu=use_gpu,
                show_log=False,
            )
            logger.info(f"PaddleOCR {device_label} engine initialized.")
        except Exception as exc:
            if use_gpu:
                logger.warning(
                    f"PaddleOCR GPU initialization failed ({exc}); falling back to CPU..."
                )
                _ocr_instance = PaddleOCR(
                    use_angle_cls=True,
                    lang="en",
                    use_gpu=False,
                    show_log=False,
                )
                logger.info("PaddleOCR CPU engine initialized.")
            else:
                raise
    return _ocr_instance


def group_boxes_into_lines(ocr_page_results: List[Any]) -> List[str]:
    """
    Groups OCR bounding boxes into horizontal receipt lines sorted top-to-bottom and left-to-right.
    """
    if not ocr_page_results:
        return []

    items = []
    for item in ocr_page_results:
        box = item[0]
        text, conf = item[1]
        text = text.strip()
        if not text:
            continue
        xs = [pt[0] for pt in box]
        ys = [pt[1] for pt in box]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        center_y = (min_y + max_y) / 2.0
        height = max_y - min_y
        items.append(
            {
                "box": box,
                "text": text,
                "conf": float(conf),
                "min_x": min_x,
                "max_x": max_x,
                "min_y": min_y,
                "max_y": max_y,
                "center_y": center_y,
                "height": height,
            }
        )

    items.sort(key=lambda it: it["center_y"])

    lines: List[List[Dict[str, Any]]] = []
    for item in items:
        placed = False
        for line in lines:
            line_avg_y = sum(it["center_y"] for it in line) / len(line)
            line_avg_h = sum(it["height"] for it in line) / len(line)
            if abs(item["center_y"] - line_avg_y) < max(line_avg_h * 0.65, 12.0):
                line.append(item)
                placed = True
                break
        if not placed:
            lines.append([item])

    lines.sort(key=lambda line: sum(it["center_y"] for it in line) / len(line))

    merged_lines: List[str] = []
    for line in lines:
        line.sort(key=lambda it: it["min_x"])
        merged_lines.append(" ".join(it["text"] for it in line))

    return merged_lines


def extract_text_from_receipt(image_path: str) -> List[str]:
    """
    Loads receipt image, applies preprocessing, runs PaddleOCR,
    and clusters horizontally adjacent bounding boxes into unified receipt lines.
    """
    raw_img = load_image_as_cv2(image_path)
    processed_img = preprocess_receipt_image(raw_img)

    ocr = get_ocr_engine()
    try:
        results = ocr.ocr(processed_img, cls=True)
    except Exception as exc:
        logger.warning(
            f"PaddleOCR inference failed ({exc}); falling back to CPU engine..."
        )
        ocr = get_ocr_engine(force_cpu=True)
        results = ocr.ocr(processed_img, cls=True)

    extracted_lines: List[str] = []
    if results and len(results) > 0 and results[0]:
        extracted_lines = group_boxes_into_lines(results[0])

    logger.info(f"PaddleOCR extracted {len(extracted_lines)} lines from {image_path}")
    return extracted_lines
