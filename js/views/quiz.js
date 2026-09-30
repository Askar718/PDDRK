import { t, tr, getLang, formatDuration } from '../i18n.js';
import { icon, esc, toast, modal } from '../ui.js';
import { renderIllustration } from '../illustrations.js';
import {
  buildQuestionSet,
  createSession,
  remainingSeconds,
  isAnswered,
  answeredCount,
  scoreSession,
  nextUnanswered,
} from '../quiz.js';
import { modeTitle } from './tests.js';

const OPTION_KEYS = ['1', '2', '3', '4', '5', '6'];

// ---------------------------------------------------------------------------
// Запуск новой сессии: #/quiz/<mode>[/<topicId>]
// ---------------------------------------------------------------------------

export function quizStartView({ data, store, params, navigate }) {
  const { mode, topicId = null } = params;
  if (mode === 'topic' && !data.topicById.has(topicId)) {
    navigate('#/tests', { replace: true });
    return null;
  }
  const ids = buildQuestionSet(mode, {
    questions: data.questions,
    stats: store.state.stats,
    favorites: store.state.favQuestions,
    topicId,
    examCount: data.meta.exam.questionCount,
  });
  if (!ids.length) {
    navigate('#/tests', { replace: true });
    return null;
  }
  const timeLimitSec = mode === 'exam' ? data.meta.exam.timeLimitMinutes * 60 : null;
  store.setActiveQuiz(createSession({ mode, ids, topicId, timeLimitSec }));
  navigate('#/quiz', { replace: true });
  return null;
}

// ---------------------------------------------------------------------------
// Общие фрагменты
// ---------------------------------------------------------------------------

function sessionTitle(session, data) {
  if (session.mode === 'topic') {
    const topic = data.topicById.get(session.topicId);
    return `${modeTitle('topic')}: ${topic ? tr(topic.title) : ''}`;
  }
  return modeTitle(session.mode);
}

export function refsHtml(q, data) {
  const lang = getLang();
  const links = q.refs
    .map((ref) => data.ruleItemById.get(ref))
    .filter(Boolean)
    .map(({ item, section }) => {
      const source = data.sourceById.get(section.source);
      return `<li>
        <span>${esc(tr(section.reference))}</span>
        <span class="ref-actions">
          <a href="#/rules/${section.id}/${item.id}">${icon('book', { size: 16 })}${t('quiz.openRule')}</a>
          ${source ? `<a href="${esc(source.url[lang])}" target="_blank" rel="noopener">${icon('link', { size: 16 })}${t('rules.official')}</a>` : ''}
        </span></li>`;
    })
    .join('');
  return `<div class="refs"><h3>${t('quiz.ref')}</h3><ul>${links}</ul></div>`;
}

function optionText(q, optId) {
  const opt = q.options.find((o) => o.id === optId);
  return opt ? tr(opt.text) : '';
}

// ---------------------------------------------------------------------------
// Прохождение теста: #/quiz
// ---------------------------------------------------------------------------

export function quizView({ data, store, navigate }) {
  const session = store.state.activeQuiz;
  if (!session) {
    navigate('#/tests', { replace: true });
    return null;
  }
  if (session.finishedAt) {
    navigate('#/result', { replace: true });
    return null;
  }
  // Вопросы могли быть удалены из базы после начала сессии.
  session.ids = session.ids.filter((id) => data.questionById.has(id));
  if (!session.ids.length) {
    store.setActiveQuiz(null);
    navigate('#/tests', { replace: true });
    return null;
  }
  session.current = Math.min(session.current, session.ids.length - 1);

  const save = () => store.setActiveQuiz(session);
  const questionAt = (i) => data.questionById.get(session.ids[i]);

  function finish({ timeout = false } = {}) {
    const now = Date.now();
    const score = scoreSession(session, data.questionById, data.meta.exam.passThreshold);
    session.finishedAt = now;
    session.timedOut = timeout;
    save();
    store.addHistory({
      id: session.id,
      mode: session.mode,
      topicId: session.topicId,
      date: now,
      total: score.total,
      correct: score.correct,
      durationSec: Math.round((now - session.startedAt) / 1000),
      passed: score.passed,
    });
    navigate('#/result');
  }

  function navHtml() {
    return session.ids
      .map((id, i) => {
        const q = data.questionById.get(id);
        let state = '';
        if (isAnswered(session, id)) {
          state = session.instantFeedback ? (session.answers[id] === q.correct ? 'is-correct' : 'is-wrong') : 'is-answered';
        }
        const current = i === session.current;
        return `<button type="button" class="qnav-btn ${state} ${current ? 'is-current' : ''}" data-goto="${i}" ${current ? 'aria-current="step"' : ''} aria-label="${esc(t('quiz.question', { i: i + 1, n: session.ids.length }))}">${i + 1}</button>`;
      })
      .join('');
  }

  function cardHtml() {
    const q = questionAt(session.current);
    const answer = session.answers[q.id];
    const answered = answer !== undefined;
    const reveal = answered && session.instantFeedback;
    const isFav = store.state.favQuestions.includes(q.id);
    const favLabel = t(isFav ? 'quiz.fav.remove' : 'quiz.fav.add');
    const total = session.ids.length;
    const allAnswered = answeredCount(session) === total;
    const isLast = session.current === total - 1;

    const options = q.options
      .map((o, idx) => {
        let cls = '';
        if (answered && o.id === answer) cls = 'is-selected';
        if (reveal && o.id === q.correct) cls = 'is-correct';
        else if (reveal && o.id === answer) cls = 'is-wrong';
        const mark = reveal && o.id === q.correct ? icon('check', { size: 20 }) : reveal && o.id === answer ? icon('close', { size: 20 }) : '';
        return `<li><button type="button" class="option ${cls}" data-option="${o.id}" ${answered ? 'aria-disabled="true"' : ''} aria-pressed="${o.id === answer}">
          <span class="option-key" aria-hidden="true">${idx + 1}</span><span class="option-text">${esc(tr(o.text))}</span>${mark}</button></li>`;
      })
      .join('');

    const correct = answer === q.correct;
    const feedback = reveal
      ? `<div class="feedback ${correct ? 'is-correct' : 'is-wrong'}" tabindex="-1" id="feedback">
          <p class="feedback-verdict">${icon(correct ? 'check' : 'alert')}<strong>${t(correct ? 'quiz.correct' : 'quiz.wrong')}</strong>
          ${correct ? '' : `<span>${t('quiz.correctAnswer')}: ${esc(optionText(q, q.correct))}</span>`}</p>
          <h3>${t('quiz.explanation')}</h3>
          <p>${esc(tr(q.explanation))}</p>
          ${refsHtml(q, data)}
        </div>`
      : '';

    const nextBtn =
      allAnswered || (isLast && !session.instantFeedback)
        ? `<button type="button" class="btn btn-accent" data-action="finish">${icon('flag', { size: 18 })}${t('quiz.finish')}</button>`
        : `<button type="button" class="btn btn-primary" data-action="next">${t('quiz.next')}${icon('right', { size: 18 })}</button>`;

    return `
      <div class="question-head">
        <p class="question-count">${t('quiz.question', { i: session.current + 1, n: total })}${q.generated ? ` <span class="gen-badge" title="${esc(t('quiz.generatedHint'))}">${t('quiz.generated')}</span>` : ''}</p>
        <button type="button" class="icon-btn fav-btn" data-action="fav" aria-pressed="${isFav}" aria-label="${esc(favLabel)}" title="${esc(favLabel)}">${icon('star', { filled: isFav })}</button>
      </div>
      ${q.illustration ? `<figure class="question-figure">${renderIllustration(q.illustration, t('quiz.illustration'))}</figure>` : ''}
      <h2 class="question-text" id="question-text">${esc(tr(q.text))}</h2>
      <ol class="options" aria-labelledby="question-text">${options}</ol>
      <div aria-live="polite">${feedback}</div>
      <div class="question-actions">
        <button type="button" class="btn btn-ghost" data-action="prev" ${session.current === 0 ? 'disabled' : ''}>${icon('left', { size: 18 })}${t('quiz.prev')}</button>
        ${nextBtn}
      </div>
      <p class="kbd-hint muted">${t('quiz.keys')}</p>`;
  }

  function timerHtml() {
    const left = remainingSeconds(session);
    if (left === null) return '';
    return `<p class="timer ${left < 300 ? 'is-low' : ''}" id="timer">${icon('clock', { size: 20 })}<span class="visually-hidden">${t('quiz.timeLeft')}:</span><span id="timer-value">${formatDuration(left)}</span></p>`;
  }

  return {
    title: sessionTitle(session, data),
    html: `
      <div class="quiz">
        <div class="quiz-top">
          <div>
            <h1 class="quiz-title">${esc(sessionTitle(session, data))}</h1>
            <p class="muted" id="answered-count">${t('quiz.answered', { a: answeredCount(session), n: session.ids.length })}</p>
          </div>
          <div class="quiz-top-tools">
            ${timerHtml()}
            <button type="button" class="btn btn-ghost btn-sm" data-action="exit">${icon('close', { size: 18 })}${t('quiz.exit')}</button>
          </div>
        </div>
        <nav class="qnav" aria-label="${esc(t('quiz.nav'))}" id="qnav">${navHtml()}</nav>
        <article class="question card" id="q-card">${cardHtml()}</article>
      </div>`,
    mount(root) {
      const card = root.querySelector('#q-card');
      const nav = root.querySelector('#qnav');

      const refresh = (focus) => {
        card.innerHTML = cardHtml();
        nav.innerHTML = navHtml();
        root.querySelector('#answered-count').textContent = t('quiz.answered', { a: answeredCount(session), n: session.ids.length });
        nav.querySelector('.is-current')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        if (focus === 'question') {
          const heading = card.querySelector('#question-text');
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        } else if (focus) {
          card.querySelector(focus)?.focus({ preventScroll: true });
        }
      };

      const goTo = (i) => {
        if (i < 0 || i >= session.ids.length) return;
        session.current = i;
        save();
        refresh('question');
        const top = root.querySelector('.quiz');
        if (top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
      };

      const answer = (optId) => {
        const q = questionAt(session.current);
        if (isAnswered(session, q.id) || !q.options.some((o) => o.id === optId)) return;
        session.answers[q.id] = optId;
        store.recordAnswer(q.id, optId === q.correct);
        save();
        refresh(session.instantFeedback ? '#feedback' : '[data-action="next"], [data-action="finish"]');
      };

      const next = () => {
        if (!session.instantFeedback) {
          const idx = nextUnanswered(session);
          goTo(idx === -1 ? Math.min(session.current + 1, session.ids.length - 1) : idx);
        } else {
          goTo(session.current + 1);
        }
      };

      const tryFinish = async () => {
        const left = session.ids.length - answeredCount(session);
        if (left > 0) {
          const ok = await modal({ title: t('quiz.finish'), body: t('quiz.finishConfirm'), confirmLabel: t('quiz.finish'), cancelLabel: t('common.cancel') });
          if (!ok) return;
        }
        finish();
      };

      const onClick = (e) => {
        const opt = e.target.closest('[data-option]');
        if (opt) return answer(opt.dataset.option);
        const go = e.target.closest('[data-goto]');
        if (go) return goTo(Number(go.dataset.goto));
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'next') next();
        else if (action === 'prev') goTo(session.current - 1);
        else if (action === 'finish') tryFinish();
        else if (action === 'fav') {
          const q = questionAt(session.current);
          const nowFav = store.toggleFavQuestion(q.id);
          toast(t(nowFav ? 'quiz.fav.add' : 'quiz.fav.remove') + ' ✓');
          refresh('[data-action="fav"]');
        } else if (action === 'exit') {
          const leave = () => {
            store.setActiveQuiz(null);
            navigate('#/tests');
          };
          if (answeredCount(session) === 0) leave();
          else
            modal({ title: t('quiz.exit'), body: t('quiz.exitConfirm'), confirmLabel: t('quiz.exit'), cancelLabel: t('common.cancel'), danger: true }).then(
              (ok) => ok && leave(),
            );
        }
      };
      root.addEventListener('click', onClick);

      const onKey = (e) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.target.closest('input, textarea, select')) return;
        const q = questionAt(session.current);
        const idx = OPTION_KEYS.indexOf(e.key);
        if (idx !== -1 && q.options[idx]) {
          e.preventDefault();
          answer(q.options[idx].id);
        } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.target.closest('button, a'))) {
          if (isAnswered(session, q.id)) {
            e.preventDefault();
            if (answeredCount(session) === session.ids.length) tryFinish();
            else next();
          }
        } else if (e.key === 'ArrowLeft') {
          goTo(session.current - 1);
        }
      };
      document.addEventListener('keydown', onKey);

      let interval = null;
      if (session.timeLimitSec) {
        const valueEl = root.querySelector('#timer-value');
        const timerEl = root.querySelector('#timer');
        const tick = () => {
          const left = remainingSeconds(session);
          valueEl.textContent = formatDuration(left);
          timerEl.classList.toggle('is-low', left < 300);
          if (left <= 0) {
            clearInterval(interval);
            toast(t('result.timeout'));
            finish({ timeout: true });
          }
        };
        interval = setInterval(tick, 1000);
        tick();
      }

      return () => {
        root.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey);
        if (interval) clearInterval(interval);
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Результат: #/result
// ---------------------------------------------------------------------------

const resultUi = { onlyWrong: false };

export function resultView({ data, store, navigate }) {
  const session = store.state.activeQuiz;
  if (!session || !session.finishedAt) {
    navigate('#/tests', { replace: true });
    return null;
  }
  const { passThreshold } = data.meta.exam;
  const score = scoreSession(session, data.questionById, passThreshold);
  const duration = Math.round((session.finishedAt - session.startedAt) / 1000);
  const isExam = session.mode === 'exam';
  const verdictKey = isExam ? (score.passed ? 'result.passed' : 'result.failed') : 'result.done';
  const verdictCls = isExam ? (score.passed ? 'is-pass' : 'is-fail') : 'is-done';
  const againHref = session.mode === 'topic' ? `#/quiz/topic/${session.topicId}` : `#/quiz/${session.mode}`;
  const hasWrong = score.wrong.length + score.unanswered.length > 0;

  const reviewHtml = () =>
    session.ids
      .map((id, i) => {
        const q = data.questionById.get(id);
        if (!q) return '';
        const ans = session.answers[id];
        const ok = ans === q.correct;
        if (resultUi.onlyWrong && ok) return '';
        return `<li class="review-item card ${ok ? 'is-correct' : 'is-wrong'}">
          <p class="review-num">${t('quiz.question', { i: i + 1, n: session.ids.length })} · ${icon(ok ? 'check' : 'close', { size: 18, label: t(ok ? 'quiz.correct' : 'quiz.wrong') })}</p>
          ${q.illustration ? `<figure class="question-figure small">${renderIllustration(q.illustration, t('quiz.illustration'))}</figure>` : ''}
          <h3>${esc(tr(q.text))}</h3>
          <dl class="review-answers">
            <div><dt>${t('result.yourAnswer')}</dt><dd class="${ok ? 'ok' : 'bad'}">${ans === undefined ? t('result.noAnswer') : esc(optionText(q, ans))}</dd></div>
            ${ok ? '' : `<div><dt>${t('quiz.correctAnswer')}</dt><dd class="ok">${esc(optionText(q, q.correct))}</dd></div>`}
          </dl>
          <details ${ok ? '' : 'open'}><summary>${t('quiz.explanation')}</summary><p>${esc(tr(q.explanation))}</p>${refsHtml(q, data)}</details>
        </li>`;
      })
      .join('');

  return {
    title: t('result.title'),
    html: `
      <section class="result card ${verdictCls}">
        <h1>${t(verdictKey)}</h1>
        <p class="result-score"><span class="big">${score.correct}</span> / ${score.total}</p>
        <p>${t('result.score', { c: score.correct, n: score.total })} · ${Math.round(score.ratio * 100)}%</p>
        <p class="muted">${t('result.time', { t: formatDuration(duration) })}${session.timedOut ? ' · ' + t('result.timeout') : ''}</p>
        ${isExam ? `<p class="muted small">${t('result.criteria', { p: Math.round(passThreshold * 100) })}</p>` : ''}
        <div class="hero-actions">
          <a class="btn btn-primary" href="${againHref}">${icon('repeat', { size: 18 })}${t('result.again')}</a>
          ${score.wrong.length ? `<a class="btn btn-accent" href="#/quiz/mistakes">${t('result.toMistakes')}</a>` : ''}
          <a class="btn btn-secondary" href="#/tests">${t('result.toTests')}</a>
        </div>
      </section>
      <section aria-labelledby="review-h">
        <div class="review-head">
          <h2 id="review-h">${t('result.review')}</h2>
          ${hasWrong ? `<label class="switch"><input type="checkbox" id="only-wrong" ${resultUi.onlyWrong ? 'checked' : ''}><span>${t('result.onlyWrong')}</span></label>` : ''}
        </div>
        <ol class="review-list" id="review-list">${reviewHtml()}</ol>
      </section>`,
    mount(root) {
      root.querySelector('#only-wrong')?.addEventListener('change', (e) => {
        resultUi.onlyWrong = e.target.checked;
        root.querySelector('#review-list').innerHTML = reviewHtml();
      });
    },
  };
}
