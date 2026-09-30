import { t, tr, getLang } from '../i18n.js';
import { icon, esc } from '../ui.js';

export function aboutView({ data }) {
  const lang = getLang();
  return {
    title: t('about.title'),
    html: `
      <section class="page-head">
        <h1>${t('about.title')}</h1>
        <p class="lead">${t('app.name')}</p>
      </section>
      <aside class="notice" role="note">${icon('alert')}<div><strong>${t('disclaimer.title')}.</strong> ${t('disclaimer.full')}</div></aside>
      <section class="card prose" aria-labelledby="src-h">
        <h2 id="src-h">${t('about.sources')}</h2>
        <ul>
          ${data.meta.legalSources
            .map((s) => `<li><a href="${esc(s.url[lang])}" target="_blank" rel="noopener">${esc(tr(s.title))}</a></li>`)
            .join('')}
        </ul>
        <p>${t('rules.verifyNote')}</p>
        <p>${t('about.translation')}</p>
      </section>
      <section class="card prose" aria-labelledby="data-h">
        <h2 id="data-h">${t('about.data')}</h2>
        <p>${t('about.dataText')}</p>
        <p>${t('about.images')}</p>
        <p>${t('about.privacy')}</p>
        <p class="muted small">v${esc(data.meta.contentVersion)}</p>
      </section>`,
  };
}
