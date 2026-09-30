import { t, tr, formatDate, formatDuration } from '../i18n.js';
import { icon, esc, pct, toast, modal } from '../ui.js';
import { summarize, recommendations } from '../analytics.js';
import { modeTitle } from './tests.js';

function level(accuracy) {
  if (accuracy === null) return 'none';
  if (accuracy >= 0.85) return 'good';
  if (accuracy >= 0.7) return 'mid';
  return 'low';
}

export function progressView({ data, store, rerender }) {
  const { questions, topics } = data;
  const { stats, history } = store.state;
  const s = summarize({ questions, topics, stats, history });
  const topicTitle = (id) => tr(data.topicById.get(id)?.title);

  const recs = recommendations(s)
    .map((r) => {
      const params = { ...r.params };
      if (params.topicId) params.t = topicTitle(params.topicId);
      if (params.topicIds) params.t = params.topicIds.map(topicTitle).join(', ');
      const actions = [];
      if (r.action?.href) {
        const labelKey = r.action.href.startsWith('#/rules') ? 'progress.study' : 'mode.start';
        actions.push(`<a class="btn btn-secondary btn-sm" href="${r.action.href}">${t(labelKey)}</a>`);
      }
      if (r.action?.practice) actions.push(`<a class="btn btn-primary btn-sm" href="${r.action.practice}">${t('progress.repeat')}</a>`);
      return `<li class="rec">${icon('info', { size: 20 })}<p>${esc(t(r.key, params))}</p><div class="rec-actions">${actions.join('')}</div></li>`;
    })
    .join('');

  const topicBars = s.byTopic
    .map((r) => {
      const p = r.accuracy === null ? 0 : Math.round(r.accuracy * 100);
      return `<li class="topic-bar">
        <a href="#/rules/${r.topic.id}">${esc(tr(r.topic.title))}</a>
        <span class="bar" role="img" aria-label="${esc(tr(r.topic.title))}: ${r.accuracy === null ? t('topic.notStarted') : p + '%'}">
          <span class="bar-fill lvl-${level(r.accuracy)}" style="width:${p}%"></span></span>
        <span class="topic-bar-val">${r.accuracy === null ? '—' : p + '%'}<small>${r.solved}/${r.total}</small></span>
      </li>`;
    })
    .join('');

  const weak = s.weak.length
    ? `<ul class="weak-list">${s.weak
        .slice(0, 5)
        .map(
          (w) => `<li class="card"><strong>${esc(tr(w.topic.title))}</strong><span class="pill lvl-low">${pct(w.accuracy)}</span>
          <a class="btn btn-secondary btn-sm" href="#/rules/${w.topic.id}">${t('progress.study')}</a>
          <a class="btn btn-primary btn-sm" href="#/quiz/topic/${w.topic.id}">${t('progress.repeat')}</a></li>`,
        )
        .join('')}</ul>`
    : `<p class="muted">${t('progress.weakNone')}</p>`;

  const historyRows = history.length
    ? `<div class="table-wrap"><table class="history">
        <thead><tr><th scope="col">${t('progress.col.date')}</th><th scope="col">${t('progress.col.mode')}</th><th scope="col">${t('progress.col.result')}</th><th scope="col">${t('progress.col.time')}</th></tr></thead>
        <tbody>${history
          .slice(0, 30)
          .map((h) => {
            const mode = h.mode === 'topic' ? `${modeTitle('topic')}: ${topicTitle(h.topicId) ?? ''}` : modeTitle(h.mode);
            const badge = h.passed === true ? `<span class="pill lvl-good">✓</span>` : h.passed === false ? `<span class="pill lvl-low">✗</span>` : '';
            return `<tr><td>${esc(formatDate(h.date))}</td><td>${esc(mode)}</td><td>${h.correct}/${h.total} (${pct(h.total ? h.correct / h.total : 0)}) ${badge}</td><td>${formatDuration(h.durationSec)}</td></tr>`;
          })
          .join('')}</tbody></table></div>`
    : `<p class="muted">${t('progress.historyEmpty')}</p>`;

  return {
    title: t('progress.title'),
    html: `
      <section class="page-head">
        <h1>${t('progress.title')}</h1>
        <p class="lead">${t('progress.lead')}</p>
      </section>
      <div class="stat-grid">
        <div class="stat-card"><span class="stat-value">${s.solved}<small>/${questions.length}</small></span><span class="stat-label">${t('progress.solved')}</span></div>
        <div class="stat-card"><span class="stat-value">${pct(s.accuracy)}</span><span class="stat-label">${t('progress.accuracy')}</span></div>
        <div class="stat-card"><span class="stat-value">${s.attempts}</span><span class="stat-label">${t('progress.attempts')}</span></div>
        <div class="stat-card"><span class="stat-value">${s.bestExam ? `${s.bestExam.correct}/${s.bestExam.total}` : '—'}</span><span class="stat-label">${t('progress.examBest')}</span></div>
      </div>

      <section aria-labelledby="recs-h">
        <h2 id="recs-h">${t('progress.recs')}</h2>
        <ul class="recs">${recs}</ul>
      </section>

      <div class="two-col">
        <section class="card" aria-labelledby="bytopic-h">
          <h2 id="bytopic-h">${t('progress.byTopic')}</h2>
          <ul class="topic-bars">${topicBars}</ul>
        </section>
        <section class="card" aria-labelledby="weak-h">
          <h2 id="weak-h">${t('progress.weak')}</h2>
          ${weak}
        </section>
      </div>

      <section aria-labelledby="hist-h">
        <h2 id="hist-h">${t('progress.history')}</h2>
        ${historyRows}
      </section>

      <section class="data-tools">
        <button type="button" class="btn btn-secondary" data-action="export">${icon('download', { size: 18 })}${t('progress.export')}</button>
        <label class="btn btn-secondary file-btn">${icon('upload', { size: 18 })}${t('progress.import')}<input type="file" accept="application/json,.json" data-action="import" class="visually-hidden"></label>
        <button type="button" class="btn btn-danger" data-action="reset">${icon('trash', { size: 18 })}${t('progress.reset')}</button>
      </section>`,
    mount(root) {
      root.querySelector('[data-action="export"]').addEventListener('click', () => {
        const json = store.exportJson();
        const name = `pdd-kz-progress-${new Date().toISOString().slice(0, 10)}.json`;
        // Показываем копию в окне: скачивание файлов блокируется во встроенных окнах.
        modal({
          title: t('progress.exportTitle'),
          body: t('progress.exportHint'),
          cancelLabel: t('common.close'),
          content: `<label for="export-json" class="visually-hidden">JSON</label>
            <textarea id="export-json" class="export-box" readonly rows="8">${esc(json)}</textarea>
            <div class="modal-tools">
              <button type="button" class="btn btn-primary btn-sm" id="export-copy">${icon('check', { size: 16 })}${t('progress.copy')}</button>
              <button type="button" class="btn btn-secondary btn-sm" id="export-download">${icon('download', { size: 16 })}${t('progress.download')}</button>
            </div>`,
        });
        const box = document.getElementById('export-json');
        document.getElementById('export-copy').addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(json);
            toast(t('progress.copied'));
          } catch {
            box.focus();
            box.select();
          }
        });
        document.getElementById('export-download').addEventListener('click', () => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          a.download = name;
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        });
      });
      root.querySelector('[data-action="import"]').addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          store.importJson(await file.text());
          toast(t('progress.importOk'));
          rerender();
        } catch {
          toast(t('progress.importFail'));
        }
      });
      root.querySelector('[data-action="reset"]').addEventListener('click', async () => {
        const ok = await modal({ title: t('progress.reset'), body: t('progress.resetConfirm'), confirmLabel: t('progress.reset'), cancelLabel: t('common.cancel'), danger: true });
        if (!ok) return;
        store.reset();
        rerender();
      });
    },
  };
}
