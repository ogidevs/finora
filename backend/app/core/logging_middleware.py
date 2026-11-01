import json
import logging
import time
import uuid
from typing import Any, Callable, Set
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("api.access")

SENSITIVE_KEYS: Set[str] = {
    "password",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "authorization",
    "cookie",
    "old_password",
    "new_password",
    "client_secret",
}


def mask_sensitive_data(data: Any) -> Any:
    """Recursively masks sensitive keys (passwords, tokens, secrets) in dictionaries and lists."""
    if isinstance(data, dict):
        return {
            k: "***" if str(k).lower() in SENSITIVE_KEYS else mask_sensitive_data(v)
            for k, v in data.items()
        }
    elif isinstance(data, list):
        return [mask_sensitive_data(item) for item in data]
    return data


def format_body_for_logging(
    body_bytes: bytes, content_type: str, max_chars: int = 4000
) -> str:
    """Safely decodes and formats request/response bodies for logging without blowing up logs."""
    if not body_bytes:
        return "(empty)"

    ct_lower = (content_type or "").lower()
    if any(m in ct_lower for m in ["multipart/form-data", "image/", "octet-stream", "pdf"]):
        return f"[binary or multipart content, {len(body_bytes)} bytes]"

    try:
        text = body_bytes.decode("utf-8")
        if "application/json" in ct_lower or text.strip().startswith(("{", "[")):
            try:
                parsed = json.loads(text)
                masked = mask_sensitive_data(parsed)
                text = json.dumps(masked, ensure_ascii=False)
            except Exception:
                pass
        if len(text) > max_chars:
            return text[:max_chars] + f"... [truncated, total {len(text)} chars]"
        return text
    except UnicodeDecodeError:
        return f"[binary data, {len(body_bytes)} bytes]"


class RequestResponseLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that captures and logs detailed request and response information,
    including method, URL, headers, payload, response status, duration, and response body.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or reuse a request ID for end-to-end tracing
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:8]
        start_time = time.perf_counter()

        client_host = request.client.host if request.client else "unknown"
        method = request.method
        url_path = request.url.path
        query_string = request.url.query
        full_path = f"{url_path}?{query_string}" if query_string else url_path

        content_type = request.headers.get("content-type", "")
        req_body_bytes = b""
        if method in ("POST", "PUT", "PATCH", "DELETE"):
            if "multipart/form-data" in content_type.lower():
                formatted_req_body = f"[multipart/form-data upload, content-length={request.headers.get('content-length', 'unknown')}]"
            else:
                try:
                    req_body_bytes = await request.body()
                    formatted_req_body = format_body_for_logging(req_body_bytes, content_type)
                except Exception as exc:
                    formatted_req_body = f"[could not read request body: {exc}]"
        else:
            formatted_req_body = "(none)"

        logger.info(
            f"[{request_id}] ---> {method} {full_path} | Client: {client_host} | Content-Type: {content_type or 'none'}"
        )
        if formatted_req_body not in ("(none)", "(empty)"):
            logger.info(f"[{request_id}] Request Body: {formatted_req_body}")

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"[{request_id}] <--- ERROR 500 in {duration_ms:.2f}ms | {method} {full_path} | Exception: {exc}",
                exc_info=True,
            )
            raise exc

        duration_ms = (time.perf_counter() - start_time) * 1000
        status_code = response.status_code
        resp_content_type = response.headers.get("content-type", "")
        is_attachment = "attachment" in response.headers.get("content-disposition", "").lower()

        if url_path.startswith("/uploads") or is_attachment:
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"
            logger.info(
                f"[{request_id}] <--- {status_code} in {duration_ms:.2f}ms | {method} {full_path} | Content-Type: {resp_content_type or 'none'}"
            )
            return response

        resp_body_bytes = b""
        async for chunk in response.body_iterator:
            resp_body_bytes += chunk

        formatted_resp_body = format_body_for_logging(resp_body_bytes, resp_content_type)

        log_msg = (
            f"[{request_id}] <--- {status_code} in {duration_ms:.2f}ms | {method} {full_path} | Content-Type: {resp_content_type or 'none'}"
        )
        if status_code >= 500:
            logger.error(log_msg)
        elif status_code >= 400:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)

        if formatted_resp_body != "(empty)":
            if status_code >= 400:
                logger.warning(f"[{request_id}] Response Body: {formatted_resp_body}")
            else:
                logger.info(f"[{request_id}] Response Body: {formatted_resp_body}")

        new_response = Response(
            content=resp_body_bytes,
            status_code=status_code,
            media_type=response.media_type,
            background=response.background,
        )
        new_response.raw_headers = [
            (k, v)
            for k, v in response.raw_headers
            if k.lower() != b"content-length"
        ]
        new_response.headers["content-length"] = str(len(resp_body_bytes))
        new_response.headers["X-Request-ID"] = request_id
        new_response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

        return new_response


def setup_logging():
    """Configures structured console logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )
    logging.getLogger().setLevel(logging.INFO)
    logging.getLogger("ocr_service").setLevel(logging.INFO)
    logging.getLogger("receipt_preprocessor").setLevel(logging.INFO)
    logging.getLogger("receipt_parser").setLevel(logging.INFO)
    logger.setLevel(logging.INFO)
