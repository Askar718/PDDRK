import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadData, validateData } from '../scripts/lib/data.mjs';
import { _strings } from '../js/i18n.js';

const data = await loadData();

test('учебная база проходит проверку целостности', () => {
  assert.deepEqual(validateData(data), []);
});

test('каждый вопрос переведён на оба языка и ссылается на пункт правил', () => {
  for (const q of data.questions) {
    assert.ok(q.text.ru && q.text.kk, q.id);
    assert.ok(q.explanation.ru && q.explanation.kk, q.id);
    assert.ok(q.refs.length > 0, q.id);
  }
});

test('в базе достаточно вопросов для экзамена из 40 вопросов', () => {
  assert.ok(data.questions.length >= data.meta.exam.questionCount);
});

test('валидатор находит битые ссылки и пропущенные переводы', () => {
  const broken = structuredClone(data);
  broken.questions[0].refs = ['no-such-item'];
  delete broken.questions[1].text.kk;
  broken.questions[2].correct = 'z';
  const errors = validateData(broken);
  assert.ok(errors.some((e) => e.includes('no-such-item')));
  assert.ok(errors.some((e) => e.includes('«kk»')));
  assert.ok(errors.some((e) => e.includes('«z»')));
});

test('строки интерфейса RU и ҚАЗ содержат одинаковый набор ключей', () => {
  const ru = Object.keys(_strings.ru).sort();
  const kk = Object.keys(_strings.kk).sort();
  assert.deepEqual(kk, ru);
});

test('все плейсхолдеры {x} совпадают в переводах интерфейса', () => {
  const vars = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  for (const key of Object.keys(_strings.ru)) {
    assert.equal(vars(_strings.kk[key]), vars(_strings.ru[key]), key);
  }
});
