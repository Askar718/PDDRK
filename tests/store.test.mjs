import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY } from '../js/store.js';
import { summarize, recommendations } from '../js/analytics.js';

function fakeStorage(initial = null) {
  const map = new Map(initial ? [[STORAGE_KEY, initial]] : []);
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k), map };
}

test('прогресс сохраняется и восстанавливается', () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  store.recordAnswer('q1', false, 1);
  store.recordAnswer('q1', true, 2);
  store.toggleFavQuestion('q7');
  store.toggleFavRule('speed');
  store.addHistory({ id: 's1', mode: 'exam', total: 40, correct: 36, passed: true, date: 3, durationSec: 100 });
  const restored = createStore(storage).state;
  assert.deepEqual(restored.stats.q1, { a: 2, c: 1, last: true, t: 2 });
  assert.deepEqual(restored.favQuestions, ['q7']);
  assert.deepEqual(restored.favRules, ['speed']);
  assert.equal(restored.history.length, 1);
});

test('повреждённые данные в хранилище не ломают приложение', () => {
  const store = createStore(fakeStorage('{not json'));
  assert.deepEqual(store.state.stats, {});
});

test('экспорт/импорт и сброс сохраняют язык и тему', () => {
  const a = createStore(fakeStorage());
  a.setLang('kk');
  a.recordAnswer('q2', true);
  const json = a.exportJson();
  const b = createStore(fakeStorage());
  b.setTheme('dark');
  b.importJson(json);
  assert.equal(b.state.stats.q2.c, 1);
  assert.equal(b.state.theme, 'dark');
  b.reset();
  assert.deepEqual(b.state.stats, {});
  assert.equal(b.state.theme, 'dark');
  assert.throws(() => b.importJson('{"version":99}'));
});

test('аналитика: точность, слабые темы и рекомендации', () => {
  const topics = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const questions = [
    { id: 'q1', topic: 'a' },
    { id: 'q2', topic: 'a' },
    { id: 'q3', topic: 'b' },
    { id: 'q4', topic: 'c' },
  ];
  const stats = {
    q1: { a: 2, c: 0, last: false },
    q2: { a: 1, c: 1, last: true },
    q3: { a: 2, c: 2, last: true },
  };
  const s = summarize({ questions, topics, stats, history: [] });
  assert.equal(s.solved, 3);
  assert.equal(s.attempts, 5);
  assert.equal(s.correct, 3);
  assert.deepEqual(s.mistakes, ['q1']);
  assert.deepEqual(s.weak.map((w) => w.topic.id), ['a']);
  const keys = recommendations(s).map((r) => r.key);
  assert.ok(keys.includes('progress.rec.mistakes'));
  assert.ok(keys.includes('progress.rec.weak'));
  assert.ok(keys.includes('progress.rec.untouched'));
  assert.deepEqual(recommendations(summarize({ questions, topics, stats: {}, history: [] })).map((r) => r.key), ['progress.rec.start']);
});
