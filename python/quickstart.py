"""Весь путь оплаты в песочнице: QR → «клиент оплатил» → статус paid.

    AITOLE_API_KEY=sk_test_… python3 python/quickstart.py
"""
import os
import sys
import time

from aitole import request

order_id = f"demo-{int(time.time() * 1000)}"
op = request(
    "POST",
    "/v2/qr",
    body={"amount": 4990, "comment": f"Заказ {order_id}", "metadata": {"order_id": order_id}},
    idempotency_key=order_id,
)
print(f"1. Создан QR: {op['id']}, статус {op['status']}, ссылка для покупателя: {op['qr_token']}")

if not os.environ["AITOLE_API_KEY"].startswith("sk_test_"):
    print("Ключ боевой: дальше оплачивает настоящий покупатель. Пример останавливается здесь.")
    sys.exit(0)

request("POST", f"/v2/sandbox/operations/{op['id']}/pay")
print("2. Песочница: покупатель оплатил")

for _ in range(20):
    time.sleep(2)
    cur = request("GET", f"/v2/operations/{op['id']}")
    if cur["status"] not in ("pending", "created"):
        print(f"3. Статус: {cur['status']}, оплачено {cur['paid_at']}, заказ {(cur.get('metadata') or {}).get('order_id')}")
        sys.exit(0 if cur["status"] == "paid" else 1)

print("Статус не изменился за 40 секунд", file=sys.stderr)
sys.exit(1)
