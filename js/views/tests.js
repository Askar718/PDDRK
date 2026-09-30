import { t, tr } from '../i18n.js';
import { icon, esc, pct } from '../ui.js';
import { mistakeIds, answeredCount } from '../quiz.js';
import { summarize } from '../analytics.js';

export function modeTitle(mode) {
  return t(`mode.${mode}`);
}

export function testsView({ data, store }) {
  const { meta, questions, topics } = data;
  const { stats, favQuestions, history, activeQuiz } = store.state;
  const summary = summarize({ questions, topics, stats, history });
  const examCount = Math.min(meta.exam.questionCount, questions.length);
  const mistakes = mistakeIds(questions, stats).length;
  const favs = favQuestions.filter((id) => data.questionById.has(id)).length;

  const modeCard = (mode, ic, desc, count, { emptyKey = null, accent = false } = {}) => {
    const disabled = count === 0;
    return `<li class="mode-card card ${accent ? 'mode-accent' : ''}">
      <div class="mode-icon">${icon(ic, { size: 28 })}</div>
      <h2>${modeTitle(mode)}</h2>
      <p>${desc}</p>
      <p class="muted">${disabled && emptyKey ? t(emptyKey) : t('mode.count', { n: count })}</p>
      ${disabled ? `<button class="btn btn-secondary" disabled>${t('mode.start')}</button>` : `<a class="btn ${accent ? 'btn-accent' : 'btn-primary'}" href="#/quiz/${mode}">${t('mode.start')}</a>`}
    </li>`;
  };

  const resume =
    activeQuiz && !activeQuiz.finishedAt
      ? `<div class="notice notice-info" role="status">${icon('clock')}<div>
          <strong>${modeTitle(activeQuiz.mode)}</strong> — ${t('quiz.answered', { a: answeredCount(activeQuiz), n: activeQuiz.ids.length })}
          <a class="btn btn-primary btn-sm" href="#/quiz">${t('quiz.next')}</a></div></div>`
      : '';

  const topicRows = topics
    .map((tp) => {
      const row = summary.byTopic.find((r) => r.topic.id === tp.id);
      const status = row.attempts ? t('topic.progress', { p: Math.round(row.accuracy * 100) }) : t('topic.notStarted');
      const level = row.attempts ? (row.accuracy >= 0.85 ? 'good' : row.accuracy >= 0.7 ? 'mid' : 'low') : 'none';
      return `<li><a class="topic-row card" href="#/quiz/topic/${tp.id}">
        <span class="rule-icon">${icon(tp.icon, { size: 22 })}</span>
        <span class="topic-row-main"><strong>${esc(tr(tp.title))}</strong><small>${row.total} ${t('common.questions')} · ${status}</small>
          <span class="bar" aria-hidden="true"><span class="bar-fill lvl-${level}" style="width:${row.total ? Math.round((row.solved / row.total) * 100) : 0}%"></span></span></span>
        ${icon('right', { size: 20 })}</a></li>`;
    })
    .join('');

  return {
    title: t('tests.title'),
    html: `
      <section class="page-head">
        <h1>${t('tests.title')}</h1>
        <p class="lead">${t('tests.lead')}</p>
      </section>
      ${resume}
      <ul class="mode-grid">
        ${modeCard('exam', 'timer', t('mode.exam.desc', { n: meta.exam.questionCount, m: meta.exam.timeLimitMinutes }) + (questions.length < meta.exam.questionCount ? ' ' + t('mode.exam.short', { n: questions.length }) : ''), examCount, { accent: true })}
        ${modeCard('marathon', 'route', t('mode.marathon.desc'), questions.length)}
        ${modeCard('mistakes', 'repeat', t('mode.mistakes.desc'), mistakes, { emptyKey: 'mode.empty.mistakes' })}
        ${modeCard('favorites', 'star', t('mode.favorites.desc'), favs, { emptyKey: 'mode.empty.favorites' })}
      </ul>
      <section aria-labelledby="by-topic-h">
        <h2 id="by-topic-h">${modeTitle('topic')}</h2>
        <p class="muted">${t('mode.topic.desc')} ${summary.accuracy !== null ? '· ' + t('progress.accuracy') + ': ' + pct(summary.accuracy) : ''}</p>
        <ul class="topic-list">${topicRows}</ul>
      </section>`,
  };
}
