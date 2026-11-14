// Минимальный клиент Aitole API на встроенном fetch (Node.js 18+).
// Зависимостей нет: скопируйте файл в свой проект.

const BASE_URL = process.env.AITOLE_BASE_URL ?? 'https://api.aitole.kz';

export class AitoleError extends Error {
  constructor(status, error) {
    super(error?.message ?? `HTTP ${status}`);
    this.status = status;
    this.code = error?.code;
    // temporary — повторить позже, permanent и validation — не повторять, auth — чинить доступ, rate_limit — подождать.
    this.category = error?.category;
    this.requestId = error?.request_id;
  }
}

/**
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, idempotencyKey?: string, apiKey?: string }} [opts]
 */
export async function aitole(method, path, { body, idempotencyKey, apiKey = process.env.AITOLE_API_KEY } = {}) {
  if (!apiKey) throw new Error('Нет ключа: задайте AITOLE_API_KEY (sk_test_… для песочницы)');
  if (!/^sk_(test|live)_[\x21-\x7e]+$/.test(apiKey)) {
    throw new Error('AITOLE_API_KEY не похож на ключ Aitole: скопируйте его из кабинета целиком, вместо sk_test_… из примера');
  }
  const headers = { 'X-API-Key': apiKey };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Обязателен для всех запросов, создающих платёж: повтор с тем же ключом
  // вернёт тот же счёт, а не выставит второй.
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new AitoleError(res.status, json?.error);
  return json;
}
