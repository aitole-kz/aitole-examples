"""Минимальный клиент Aitole API и проверка подписи вебхука. Только стандартная библиотека, Python 3.8+.

Скопируйте файл в свой проект.
"""
import hashlib
import hmac
import json
import os
import re
import time
import urllib.error
import urllib.request

BASE_URL = os.environ.get("AITOLE_BASE_URL", "https://api.aitole.kz")
TOLERANCE_SEC = 300


class AitoleError(Exception):
    def __init__(self, status, error):
        error = error or {}
        super().__init__(error.get("message") or f"HTTP {status}")
        self.status = status
        self.code = error.get("code")
        # transient — повторить, permanent — не повторять, auth — чинить доступ, rate_limit — подождать.
        self.category = error.get("category")
        self.request_id = error.get("request_id")


def request(method, path, body=None, idempotency_key=None, api_key=None):
    api_key = api_key or os.environ.get("AITOLE_API_KEY")
    if not api_key:
        raise RuntimeError("Нет ключа: задайте AITOLE_API_KEY (sk_test_… для песочницы)")
    if not re.fullmatch(r"sk_(test|live)_[\x21-\x7e]+", api_key):
        raise RuntimeError("AITOLE_API_KEY не похож на ключ Aitole: скопируйте его из кабинета целиком, вместо sk_test_… из примера")
    headers = {"X-API-Key": api_key}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    if idempotency_key:
        # Обязателен для запросов, создающих платёж: повтор вернёт тот же счёт, а не второй.
        headers["Idempotency-Key"] = idempotency_key
    req = urllib.request.Request(BASE_URL + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read() or b"null")
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read())
        except ValueError:
            payload = {}
        raise AitoleError(e.code, payload.get("error")) from None


def verify_webhook(secret, raw_body, timestamp, signature, now=None):
    """Подпись — HMAC-SHA256 от "{timestamp}.{сырое тело}", заголовок X-Webhook-Signature: sha256=<hex>.

    raw_body — байты тела как пришли, до json.loads.
    """
    if not secret or not timestamp or not signature:
        return False
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False
    now = int(time.time()) if now is None else now
    if abs(now - ts) > TOLERANCE_SEC:
        return False
    if isinstance(raw_body, str):
        raw_body = raw_body.encode("utf-8")
    mac = hmac.new(secret.encode("utf-8"), str(ts).encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    # compare_digest — сравнение за постоянное время.
    return hmac.compare_digest("sha256=" + mac, signature)
