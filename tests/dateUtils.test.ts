import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDate, MIN_YEAR } from '../dist/index.js';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

test('normalizeDate: string vazia vira hoje, sem aviso', () => {
  const result = normalizeDate('');
  assert.equal(result.date, today());
  assert.equal(result.warning, null);
});

test('normalizeDate: data válida no formato YYYY-MM-DD é aceita como está', () => {
  const result = normalizeDate('2024-01-01');
  assert.equal(result.date, '2024-01-01');
  assert.equal(result.warning, null);
});

test('normalizeDate: sem "-" no formato cai para hoje, com aviso', () => {
  const result = normalizeDate('20240101');
  assert.equal(result.date, today());
  assert.match(result.warning ?? '', /formato esperado/);
});

test('normalizeDate: número errado de segmentos cai para hoje, com aviso', () => {
  const result = normalizeDate('2024-01');
  assert.equal(result.date, today());
  assert.match(result.warning ?? '', /YYYY-MM-DD/);
});

test('normalizeDate: ano abaixo do mínimo é corrigido para o ano atual', () => {
  const result = normalizeDate(`${MIN_YEAR - 1}-01-01`);
  assert.equal(result.date.startsWith(String(new Date().getFullYear())), true);
  assert.match(result.warning ?? '', new RegExp(String(MIN_YEAR)));
});

test('normalizeDate: data futura é corrigida para hoje', () => {
  const future = new Date();
  future.setFullYear(future.getFullYear() + 5);
  const result = normalizeDate(future.toISOString().split('T')[0]);
  assert.equal(result.date, today());
});

test('normalizeDate: dia inexistente no mês (30 de fevereiro) é corrigido para o último dia real', () => {
  const result = normalizeDate('2024-02-30');
  // E.g: 2024 é bissexto: fevereiro tem 29 dias
  assert.equal(result.date, '2024-02-29');
  assert.match(result.warning ?? '', /Dia inválido/);
});

test('normalizeDate: fevereiro em ano não-bissexto limita a 28 dias', () => {
  const result = normalizeDate('2023-02-30');
  assert.equal(result.date, '2023-02-28');
});

test('normalizeDate: mês inválido (13) cai para o mês atual, com aviso', () => {
  const result = normalizeDate('2024-13-01');
  assert.match(result.warning ?? '', /Mês inválido/);
});

test('normalizeDate: entrada com texto no lugar de números cai para hoje', () => {
  const result = normalizeDate('abcd-ef-gh');
  assert.equal(result.date, today());
  assert.notEqual(result.warning, null);
});
