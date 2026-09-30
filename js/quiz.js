// Логика тестирования без привязки к DOM (покрыта тестами в tests/).

export const MODES = ['exam', 'topic', 'marathon', 'mistakes', 'favorites'];

/** Перемешивание Фишера — Йейтса. rng можно подменить в тестах. */
export function shuffle(list, rng = Math.random) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Идентификаторы вопросов, на которые пользователь в последний раз ответил неверно. */
export function mistakeIds(questions, stats) {
  return questions.filter((q) => stats[q.id] && stats[q.id].last === false).map((q) => q.id);
}

/**
 * Формирует набор вопросов для режима.
 * @returns {string[]} идентификаторы вопросов в порядке показа
 */
export function buildQuestionSet(mode, { questions, stats = {}, favorites = [], topicId = null, examCount = 40, rng = Math.random }) {
  switch (mode) {
    case 'exam':
      return shuffle(questions.map((q) => q.id), rng).slice(0, examCount);
    case 'topic':
      return shuffle(questions.filter((q) => q.topic === topicId).map((q) => q.id), rng);
    case 'marathon':
      return shuffle(questions.map((q) => q.id), rng);
    case 'mistakes':
      return shuffle(mistakeIds(questions, stats), rng);
    case 'favorites': {
      const known = new Set(questions.map((q) => q.id));
      return shuffle(favorites.filter((id) => known.has(id)), rng);
    }
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

export function createSession({ mode, ids, topicId = null, timeLimitSec = null, now = Date.now() }) {
  return {
    id: `s${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    mode,
    topicId,
    ids,
    answers: {}, // questionId -> optionId
    current: 0,
    startedAt: now,
    timeLimitSec,
    // В экзамене пояснения показываются только после завершения.
    instantFeedback: mode !== 'exam',
    finishedAt: null,
  };
}

export function remainingSeconds(session, now = Date.now()) {
  if (!session.timeLimitSec) return null;
  return Math.max(0, Math.ceil(session.timeLimitSec - (now - session.startedAt) / 1000));
}

export function isAnswered(session, questionId) {
  return Object.prototype.hasOwnProperty.call(session.answers, questionId);
}

export function answeredCount(session) {
  return session.ids.filter((id) => isAnswered(session, id)).length;
}

/** Итог сессии. passThreshold — доля верных ответов для «сдан» (только для экзамена). */
export function scoreSession(session, questionsById, passThreshold = 0.85) {
  let correct = 0;
  const wrong = [];
  const unanswered = [];
  for (const id of session.ids) {
    const q = questionsById.get(id);
    if (!q) continue;
    if (!isAnswered(session, id)) unanswered.push(id);
    else if (session.answers[id] === q.correct) correct++;
    else wrong.push(id);
  }
  const total = session.ids.length;
  return {
    total,
    correct,
    wrong,
    unanswered,
    ratio: total ? correct / total : 0,
    passed: session.mode === 'exam' ? total > 0 && correct / total >= passThreshold : null,
  };
}

/** Следующий неотвеченный вопрос после текущего (по кругу) или -1. */
export function nextUnanswered(session) {
  const n = session.ids.length;
  for (let step = 1; step <= n; step++) {
    const idx = (session.current + step) % n;
    if (!isAnswered(session, session.ids[idx])) return idx;
  }
  return -1;
}
