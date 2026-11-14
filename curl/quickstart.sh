#!/usr/bin/env bash
# Весь путь оплаты в песочнице на curl: QR → «клиент оплатил» → статус paid.
#
#   AITOLE_API_KEY=sk_test_… ./curl/quickstart.sh
#
# Нужны curl и jq.
set -euo pipefail

: "${AITOLE_API_KEY:?Задайте AITOLE_API_KEY (sk_test_… для песочницы)}"
if ! LC_ALL=C grep -Eq '^sk_(test|live)_[!-~]+$' <<<"$AITOLE_API_KEY"; then
  echo "AITOLE_API_KEY не похож на ключ Aitole: скопируйте его из кабинета целиком, вместо sk_test_… из примера" >&2
  exit 2
fi
BASE="${AITOLE_BASE_URL:-https://api.aitole.kz}"
ORDER="demo-$(date +%s)"

op=$(curl -sS --fail-with-body -X POST "$BASE/v2/qr" \
  -H "X-API-Key: $AITOLE_API_KEY" \
  -H "Idempotency-Key: $ORDER" \
  -H "Content-Type: application/json" \
  -d "{\"amount\": 4990, \"comment\": \"Заказ $ORDER\", \"metadata\": {\"order_id\": \"$ORDER\"}}")
id=$(jq -r .id <<<"$op")
echo "1. Создан QR: $id, статус $(jq -r .status <<<"$op")"

if [[ "$AITOLE_API_KEY" != sk_test_* ]]; then
  echo "Ключ боевой: дальше оплачивает настоящий покупатель. Пример останавливается здесь."
  exit 0
fi

curl -sS --fail-with-body -X POST "$BASE/v2/sandbox/operations/$id/pay" -H "X-API-Key: $AITOLE_API_KEY" >/dev/null
echo "2. Песочница: покупатель оплатил"

for _ in $(seq 1 20); do
  sleep 2
  status=$(curl -sS --fail-with-body "$BASE/v2/operations/$id" -H "X-API-Key: $AITOLE_API_KEY" | jq -r .status)
  if [[ "$status" != "pending" && "$status" != "created" ]]; then
    echo "3. Статус: $status"
    [[ "$status" == "paid" ]] && exit 0 || exit 1
  fi
done
echo "Статус не изменился за 40 секунд" >&2
exit 1
