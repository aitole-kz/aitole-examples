<?php
/**
 * Проверка подписи вебхука Aitole. PHP 7.4+, без зависимостей.
 *
 * Подпись — HMAC-SHA256 от "{timestamp}.{сырое тело}" секретом эндпоинта,
 * заголовок X-Webhook-Signature: sha256=<hex>. Тело берите из php://input
 * до json_decode.
 */

const AITOLE_TOLERANCE_SEC = 300;

function aitole_verify_webhook(string $secret, string $rawBody, ?string $timestamp, ?string $signature, ?int $now = null): bool
{
    if ($secret === '' || $timestamp === null || $signature === null || !ctype_digit($timestamp)) {
        return false;
    }
    $now = $now ?? time();
    if (abs($now - (int) $timestamp) > AITOLE_TOLERANCE_SEC) {
        return false;
    }
    $expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);
    // hash_equals — сравнение за постоянное время.
    return hash_equals($expected, $signature);
}
