// Расчёт статистики и рекомендаций по локальному прогрессу.
import { mistakeIds } from './quiz.js';

export const WEAK_THRESHOLD = 0.7;
export const MIN_ATTEMPTS_FOR_WEAK = 2;

export function summarize({ questions, topics, stats, history }) {
  let attempts = 0;
  let correct = 0;
  let solved = 0;
  const topicMap = new Map(topics.map((t) => [t.id, { topic: t, total: 0, solved: 0, attempts: 0, correct: 0 }]));

  for (const q of questions) {
    const row = topicMap.get(q.topic);
    if (row) row.total++;
    const s = stats[q.id];
    if (!s || !s.a) continue;
    solved++;
    attempts += s.a;
    correct += s.c;
    if (row) {
      row.solved++;
      row.attempts += s.a;
      row.correct += s.c;
    }
  }

  const byTopic = [...topicMap.values()].map((r) => ({
    ...r,
    accuracy: r.attempts ? r.correct / r.attempts : null,
  }));

  const weak = byTopic
    .filter((r) => r.attempts >= MIN_ATTEMPTS_FOR_WEAK && r.accuracy < WEAK_THRESHOLD)
    .sort((a, b) => a.accuracy - b.accuracy);

  const exams = history.filter((h) => h.mode === 'exam');
  const bestExam = exams.reduce((best, h) => (!best || h.correct / h.total > best.correct / best.total ? h : best), null);

  return {
    solved,
    attempts,
    correct,
    accuracy: attempts ? correct / attempts : null,
    byTopic,
    weak,
    mistakes: mistakeIds(questions, stats),
    testsTaken: history.length,
    bestExam,
    lastExam: exams[0] ?? null,
  };
}

/**
 * Рекомендации в виде структур { key, params, action }, чтобы представление
 * могло локализовать текст и отрисовать кнопку действия.
 */
export function recommendations(summary) {
  const recs = [];
  if (summary.attempts === 0) {
    recs.push({ key: 'progress.rec.start', action: { href: '#/tests' } });
    return recs;
  }
  if (summary.mistakes.length) {
    recs.push({ key: 'progress.rec.mistakes', params: { n: summary.mistakes.length }, action: { href: '#/quiz/mistakes' } });
  }
  for (const w of summary.weak.slice(0, 3)) {
    recs.push({
      key: 'progress.rec.weak',
      params: { topicId: w.topic.id, p: Math.round(w.accuracy * 100) },
      action: { href: `#/rules/${w.topic.id}`, practice: `#/quiz/topic/${w.topic.id}` },
    });
  }
  const untouched = summary.byTopic.filter((r) => r.attempts === 0 && r.total > 0);
  if (untouched.length) {
    recs.push({ key: 'progress.rec.untouched', params: { topicIds: untouched.map((r) => r.topic.id) } });
  }
  if (summary.lastExam && summary.lastExam.passed === false) {
    recs.push({ key: 'progress.rec.examAgain', action: { href: '#/quiz/exam' } });
  } else if (summary.accuracy >= 0.85 && !summary.lastExam) {
    recs.push({ key: 'progress.rec.exam', action: { href: '#/quiz/exam' } });
  }
  return recs;
}
