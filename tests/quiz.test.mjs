import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shuffle,
  buildQuestionSet,
  createSession,
  scoreSession,
  remainingSeconds,
  nextUnanswered,
  mistakeIds,
} from '../js/quiz.js';

const questions = Array.from({ length: 50 }, (_, i) => ({
  id: `q${i}`,
  topic: i % 2 ? 'odd' : 'even',
  correct: 'a',
  options: [{ id: 'a' }, { id: 'b' }],
}));
const byId = new Map(questions.map((q) => [q.id, q]));

function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

test('shuffle сохраняет состав и не мутирует исходный массив', () => {
  const src = [1, 2, 3, 4, 5];
  const out = shuffle(src, seeded(7));
  assert.deepEqual([...out].sort(), src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
});

test('экзамен: 40 уникальных случайных вопросов', () => {
  const ids = buildQuestionSet('exam', { questions, examCount: 40, rng: seeded(3) });
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, 40);
});

test('экзамен при малой базе берёт все вопросы', () => {
  const ids = buildQuestionSet('exam', { questions: questions.slice(0, 10), examCount: 40 });
  assert.equal(ids.length, 10);
});

test('тема, марафон, ошибки и избранное', () => {
  assert.ok(buildQuestionSet('topic', { questions, topicId: 'odd' }).every((id) => byId.get(id).topic === 'odd'));
  assert.equal(buildQuestionSet('marathon', { questions }).length, 50);
  const stats = { q1: { a: 2, c: 1, last: false }, q2: { a: 1, c: 1, last: true } };
  assert.deepEqual(buildQuestionSet('mistakes', { questions, stats }), ['q1']);
  assert.deepEqual(mistakeIds(questions, stats), ['q1']);
  assert.deepEqual(buildQuestionSet('favorites', { questions, favorites: ['q5', 'deleted'] }), ['q5']);
  assert.throws(() => buildQuestionSet('unknown', { questions }));
});

test('подсчёт результата и критерий сдачи экзамена', () => {
  const ids = questions.slice(0, 40).map((q) => q.id);
  const session = createSession({ mode: 'exam', ids, timeLimitSec: 2400, now: 0 });
  assert.equal(session.instantFeedback, false);
  ids.slice(0, 34).forEach((id) => (session.answers[id] = 'a'));
  ids.slice(34, 38).forEach((id) => (session.answers[id] = 'b'));
  const score = scoreSession(session, byId, 0.85);
  assert.equal(score.correct, 34);
  assert.equal(score.wrong.length, 4);
  assert.equal(score.unanswered.length, 2);
  assert.equal(score.passed, true);
  session.answers[ids[0]] = 'b';
  assert.equal(scoreSession(session, byId, 0.85).passed, false);
});

test('режим обучения не имеет критерия сдачи', () => {
  const session = createSession({ mode: 'marathon', ids: ['q0'] });
  session.answers.q0 = 'a';
  assert.equal(session.instantFeedback, true);
  assert.equal(scoreSession(session, byId).passed, null);
});

test('таймер и поиск следующего неотвеченного вопроса', () => {
  const session = createSession({ mode: 'exam', ids: ['q0', 'q1', 'q2'], timeLimitSec: 60, now: 1000 });
  assert.equal(remainingSeconds(session, 1000), 60);
  assert.equal(remainingSeconds(session, 31_000), 30);
  assert.equal(remainingSeconds(session, 999_999), 0);
  session.answers.q1 = 'a';
  assert.equal(nextUnanswered(session), 2);
  session.current = 2;
  assert.equal(nextUnanswered(session), 0);
  session.answers.q0 = 'a';
  session.answers.q2 = 'a';
  assert.equal(nextUnanswered(session), -1);
});

test('экзамен набирает вопросы равномерно по темам', () => {
  const many = [
    ...Array.from({ length: 100 }, (_, i) => ({ id: `big${i}`, topic: 'big' })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `s1-${i}`, topic: 's1' })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `s2-${i}`, topic: 's2' })),
  ];
  const ids = buildQuestionSet('exam', { questions: many, examCount: 30, rng: seeded(5) });
  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
  assert.equal(ids.filter((id) => id.startsWith('s1')).length, 10);
  assert.equal(ids.filter((id) => id.startsWith('big')).length, 10);
});
