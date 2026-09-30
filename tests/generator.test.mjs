import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions, whoGoesFirst, conflicts, relative, movement, SIGN_CATALOG } from '../js/generator.js';
import { loadAllData, validateData } from '../scripts/lib/data.mjs';
import { renderIllustration } from '../js/illustrations.js';

const questions = generateQuestions();

test('сгенерированная база проходит ту же проверку, что и авторская', async () => {
  const data = await loadAllData();
  assert.deepEqual(validateData(data), []);
  assert.ok(questions.length >= 150, `ожидалось ≥150, получено ${questions.length}`);
});

test('генерация детерминирована: одинаковые id и ответы при каждом запуске', () => {
  const again = generateQuestions();
  assert.deepEqual(again.map((q) => [q.id, q.correct]), questions.map((q) => [q.id, q.correct]));
});

test('траектории на перекрёстке', () => {
  assert.deepEqual(movement('s', 'left'), { cells: ['SE', 'NE', 'NW'], exit: 'w' });
  assert.deepEqual(movement('e', 'right'), { cells: ['NE'], exit: 'n' });
  assert.equal(relative({ from: 's' }, { from: 'e' }), 'right');
  assert.equal(relative({ from: 's' }, { from: 'w' }), 'left');
  assert.equal(relative({ from: 's' }, { from: 'n' }), 'opposite');
  // Встречные прямо не пересекаются; правый поворот и прямо слева сходятся на одной полосе.
  assert.equal(conflicts({ from: 's', turn: 'straight' }, { from: 'n', turn: 'straight' }), false);
  assert.equal(conflicts({ from: 's', turn: 'right' }, { from: 'w', turn: 'straight' }), true);
});

test('эталонные ситуации совпадают с авторскими вопросами', () => {
  // q022: равнозначный, B справа → B первый.
  assert.equal(whoGoesFirst({ from: 's', turn: 'straight' }, { from: 'e', turn: 'straight' }, { mode: 'equal' }).first, 'B');
  // q023: зелёный, A налево, встречный прямо → B первый.
  assert.equal(whoGoesFirst({ from: 's', turn: 'left' }, { from: 'n', turn: 'straight' }, { mode: 'green' }).first, 'B');
  // q024: A на второстепенной, B на главной слева → B первый.
  assert.equal(whoGoesFirst({ from: 's', turn: 'straight' }, { from: 'w', turn: 'straight' }, { mode: 'main', main: 'ew' }).first, 'B');
  // A на главной, B справа на второстепенной → A первый (помеха справа не действует).
  assert.equal(whoGoesFirst({ from: 's', turn: 'straight' }, { from: 'e', turn: 'straight' }, { mode: 'main', main: 'ns' }).first, 'A');
  // Встречные левые повороты — неоднозначно, такие вопросы не генерируются.
  assert.equal(whoGoesFirst({ from: 's', turn: 'left' }, { from: 'n', turn: 'left' }, { mode: 'equal' }).first, null);
});

test('варианты ответов уникальны, правильный ответ — один из вариантов', () => {
  for (const q of questions) {
    const texts = q.options.map((o) => o.text.ru);
    assert.equal(new Set(texts).size, texts.length, q.id);
    assert.ok(q.options.some((o) => o.id === q.correct), q.id);
  }
});

test('расстояния и возраст: ответ соответствует порогам правил', () => {
  const get = (id) => questions.find((q) => q.id === id).correct;
  assert.equal(get('g-stop-crosswalk-4'), 'b');
  assert.equal(get('g-stop-crosswalk-6'), 'a');
  assert.equal(get('g-stop-bus-stop-14'), 'b');
  assert.equal(get('g-stop-bus-stop-18'), 'a');
  assert.equal(get('g-triangle-inside-20'), 'a');
  assert.equal(get('g-triangle-outside-20'), 'c');
  assert.equal(get('g-child-front-9'), 'a');
  assert.equal(get('g-child-rear-9'), 'b');
  assert.equal(get('g-child-front-13'), 'c');
});

test('все знаки каталога и все иллюстрации генератора отрисовываются', () => {
  for (const s of SIGN_CATALOG) {
    const svg = renderIllustration({ type: 'sign', sign: s.kind, value: s.value });
    assert.doesNotMatch(svg, /stroke="#999"/, `нет рисунка для знака ${s.kind}`);
  }
  for (const q of questions.filter((x) => x.illustration)) {
    assert.doesNotMatch(renderIllustration(q.illustration, 'x'), /undefined|NaN/, q.id);
  }
});
