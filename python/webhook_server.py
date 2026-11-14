"""Приём вебхуков Aitole на http.server: проверка подписи и отметка заказа.

    AITOLE_WEBHOOK_SECRET=… python3 python/webhook_server.py

На Flask или Django то же самое: берите сырое тело (request.get_data() /
request.body) и заголовки X-Webhook-Timestamp, X-Webhook-Signature.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from aitole import verify_webhook

SECRET = os.environ["AITOLE_WEBHOOK_SECRET"]
PORT = int(os.environ.get("PORT", "3000"))

# Доставка повторяется, пока вы не ответите 2xx: одно событие может прийти дважды.
# В проде храните обработанные id в базе.
seen = set()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/webhooks/aitole":
            self.send_response(404)
            self.end_headers()
            return
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if not verify_webhook(SECRET, raw, self.headers.get("X-Webhook-Timestamp"), self.headers.get("X-Webhook-Signature")):
            self.send_response(400)
            self.end_headers()
            return

        event = json.loads(raw)
        if event["id"] not in seen:
            seen.add(event["id"])
            if event["type"] == "payment.paid":
                # data.id — id операции из ответа на создание счёта. По нему находите заказ.
                print(f"Оплачено: операция {event['data']['id']}, {event['data']['amount']} ₸")
            elif event["type"] in ("payment.expired", "payment.cancelled"):
                print(f"Не оплачено ({event['type']}): {event['data']['id']}")
            else:
                print(f"Событие {event['type']}")

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


print(f"Жду вебхуки на http://localhost:{PORT}/webhooks/aitole")
HTTPServer(("", PORT), Handler).serve_forever()
