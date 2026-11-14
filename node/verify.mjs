// Проверка подписи вебхука Aitole.
//
// Подпись — HMAC-SHA256 от строки "{timestamp}.{сырое тело}" секретом
// эндпоинта, в заголовке X-Webhook-Signature: sha256=<hex>.
// Проверяйте по сырому телу ДО JSON.parse: после разбора и повторной
// сериализации байты могут не совпасть.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const TOLERANCE_SEC = 300;

/**
 * @param {string} secret     секрет эндпоинта из кабинета
 * @param {string} rawBody    тело запроса как пришло, строкой
 * @param {string} timestamp  заголовок X-Webhook-Timestamp
 * @param {string} signature  заголовок X-Webhook-Signature
 * @param {number} [nowSec]   текущее время, для тестов
 * @returns {boolean}
 */
export function verifyWebhook(secret, rawBody, timestamp, signature, nowSec = Math.floor(Date.now() / 1000)) {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(nowSec - ts) > TOLERANCE_SEC) return false;

  const expected = 'sha256=' + createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // Сравнение за постоянное время: побайтовое с ранним выходом выдаёт подпись по времени ответа.
  return a.length === b.length && timingSafeEqual(a, b);
}
