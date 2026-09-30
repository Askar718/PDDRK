import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIllustration, _internal } from '../js/illustrations.js';
import { loadData } from '../scripts/lib/data.mjs';

const { questions } = await loadData();

test('каждая иллюстрация из базы отрисовывается в корректный SVG', () => {
  for (const q of questions.filter((x) => x.illustration)) {
    const svg = renderIllustration(q.illustration, 'label');
    assert.match(svg, /^<svg [^>]*role="img"/, q.id);
    assert.ok(svg.endsWith('</svg>'), q.id);
    assert.doesNotMatch(svg, /undefined|NaN/, q.id);
  }
});

test('схема перекрёстка поворачивается для всех направлений', () => {
  assert.equal(_internal.turnPath('straight', 0), 'M175 222 L175 40');
  assert.deepEqual(_internal.rotatePoint([175, 250], 90), [50, 175]);
});

test('неизвестный тип иллюстрации даёт пустую строку', () => {
  assert.equal(renderIllustration({ type: 'nope' }), '');
  assert.equal(renderIllustration(null), '');
});
