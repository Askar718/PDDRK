import { t, tr } from '../i18n.js';
import { icon, esc, pct } from '../ui.js';
import { summarize } from '../analytics.js';
import { renderIllustration } from '../illustrations.js';

export function homeView({ data, store }) {
  const s = summarize({ questions: data.questions, topics: data.topics, stats: store.state.stats, history: store.state.history });
  const itemCount = data.rules.reduce((n, sec) => n + sec.items.length, 0);

  const features = [
    ['globe', 'home.f1'],
    ['info', 'home.f2'],
    ['test', 'home.f3'],
    ['image', 'home.f4'],
    ['chart', 'home.f5'],
    ['phone', 'home.f6'],
  ];

  const stat = (value, labelKey, extra = '') =>
    `<div class="stat-card"><span class="stat-value">${value}</span><span class="stat-label">${t(labelKey)}</span>${extra}</div>`;

  const hero = renderIllustration(
    {
      type: 'intersection',
      main: 'ew',
      signs: [{ at: 's', sign: 'give-way' }],
      cars: [
        { from: 's', turn: 'left', color: 'blue' },
        { from: 'w', turn: 'straight', color: 'red' },
      ],
    },
    t('quiz.illustration'),
  );

  return {
    title: t('nav.home'),
    html: `
      <section class="hero">
        <div class="hero-text">
          <h1>${t('home.title')}</h1>
          <p class="lead">${t('home.lead')}</p>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" href="#/rules">${icon('book')}${t('home.cta.rules')}</a>
            <a class="btn btn-accent btn-lg" href="#/tests">${icon('test')}${t('home.cta.test')}</a>
          </div>
          ${s.mistakes.length ? `<p><a class="link-arrow" href="#/quiz/mistakes">${t('home.continue')} (${s.mistakes.length}) ${icon('right', { size: 18 })}</a></p>` : ''}
        </div>
        <div class="hero-art" aria-hidden="true">${hero}</div>
      </section>

      <aside class="notice" role="note">
        ${icon('alert')}
        <div><strong>${t('disclaimer.title')}.</strong> ${t('disclaimer.full')}</div>
      </aside>

      <section aria-labelledby="stats-h">
        <h2 id="stats-h">${t('home.stats.title')}</h2>
        <div class="stat-grid">
          ${stat(`${s.solved}<small>/${data.questions.length}</small>`, 'home.stats.solved')}
          ${stat(pct(s.accuracy), 'home.stats.accuracy')}
          ${stat(s.testsTaken, 'home.stats.tests')}
          ${stat(s.mistakes.length, 'home.stats.mistakes')}
        </div>
        <p class="muted">${t('home.base.title')}: ${data.topics.length} ${t('home.base.topics')} · ${itemCount} ${t('home.base.rules')} · ${data.questions.length} ${t('home.base.questions')}</p>
      </section>

      <section aria-labelledby="feat-h">
        <h2 id="feat-h">${t('home.features.title')}</h2>
        <ul class="feature-grid">
          ${features
            .map(
              ([ic, key]) => `<li class="feature">
                <span class="feature-icon">${icon(ic, { size: 26 })}</span>
                <h3>${t(key + '.title')}</h3><p>${t(key + '.text')}</p></li>`,
            )
            .join('')}
        </ul>
      </section>

      <section aria-labelledby="topics-h">
        <h2 id="topics-h">${t('rules.toc')}</h2>
        <ul class="topic-chips">
          ${data.topics.map((tp) => `<li><a href="#/rules/${tp.id}">${icon(tp.icon, { size: 18 })}${esc(tr(tp.title))}</a></li>`).join('')}
        </ul>
      </section>`,
  };
}
