// node --test node/verify.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyWebhook } from './verify.mjs';

const v = JSON.parse(readFileSync(new URL('../test/vector.json', import.meta.url), 'utf8'));

test('правильная подпись принимается', () => {
  assert.equal(verifyWebhook(v.secret, v.body, String(v.timestamp), v.signature, v.timestamp), true);
});

test('изменённое тело отвергается', () => {
  const body = v.body.replace('4990', '1');
  assert.equal(verifyWebhook(v.secret, body, String(v.timestamp), v.signature, v.timestamp), false);
});

test('чужой секрет отвергается', () => {
  assert.equal(verifyWebhook('other', v.body, String(v.timestamp), v.signature, v.timestamp), false);
});

test('старый запрос отвергается: больше 300 секунд', () => {
  assert.equal(verifyWebhook(v.secret, v.body, String(v.timestamp), v.signature, v.timestamp + 301), false);
});
