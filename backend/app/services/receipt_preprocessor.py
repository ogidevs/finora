import logging
import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("receipt_preprocessor")


def load_image_as_cv2(image_path: str) -> np.ndarray:
    """Loads an image from path safely handling Unicode filepaths on Windows."""
    try:
        img_array = np.fromfile(image_path, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Could not decode image at {image_path}")
        return img
    except Exception as e:
        logger.error(f"Error loading image {image_path}: {e}")
        pil_img = Image.open(image_path).convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def preprocess_receipt_image(image_input) -> np.ndarray:
    """
    Receipt image preprocessing:
    - Preserves font sharpness and stroke width.
    - Upscales low-resolution images (width < 800) with bicubic interpolation.
    - Avoids destructive blurring or binarization that damages thermal receipt text.
    """
    if isinstance(image_input, str):
        img = load_image_as_cv2(image_input)
    elif isinstance(image_input, np.ndarray):
        img = image_input.copy()
    else:
        raise ValueError("Unsupported image input type for preprocessing")

    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    h, w = img.shape[:2]
    if w < 800:
        scale = 900 / w
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    return img
