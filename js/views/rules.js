import { t, tr, getLang } from '../i18n.js';
import { icon, esc, highlight, toast } from '../ui.js';

// Состояние поиска сохраняется между перерисовками (например, при смене языка).
const ui = { query: '', onlyFav: false };

function normalize(s) {
  return s.toLocaleLowerCase().replace(/ё/g, 'е');
}

function filterSections(data, favRules) {
  const q = normalize(ui.query.trim());
  return data.rules
    .filter((s) => !ui.onlyFav || favRules.includes(s.id))
    .map((s) => {
      if (!q) return { section: s, items: s.items };
      const titleHit = normalize(tr(s.title)).includes(q);
      const items = s.items.filter((i) => normalize(tr(i.text)).includes(q));
      return { section: s, items: titleHit && !items.length ? s.items : items };
    })
    .filter((x) => x.items.length);
}

function sectionHtml({ section, items }, data, favRules) {
  const isFav = favRules.includes(section.id);
  const topic = data.topicById.get(section.topic);
  const source = data.sourceById.get(section.source);
  const favLabel = t(isFav ? 'rules.fav.remove' : 'rules.fav.add');
  const count = data.questions.filter((q) => q.topic === section.topic).length;
  return `<section class="rule-section card" id="sec-${section.id}" aria-labelledby="h-${section.id}">
    <header class="rule-head">
      <span class="rule-icon">${icon(topic?.icon ?? 'book', { size: 24 })}</span>
      <div class="rule-titles">
        <h2 id="h-${section.id}">${highlight(tr(section.title), ui.query)}</h2>
        <p class="rule-ref">${esc(tr(section.reference))}</p>
      </div>
      <button type="button" class="icon-btn fav-btn" data-fav-rule="${section.id}" aria-pressed="${isFav}" aria-label="${esc(favLabel)}" title="${esc(favLabel)}">
        ${icon('star', { filled: isFav })}
      </button>
    </header>
    <ol class="rule-items">
      ${items
        .map(
          (i) => `<li id="item-${i.id}" class="rule-item"><span class="rule-num" aria-hidden="true">${esc(i.id.split('-').pop())}</span>
            <p>${highlight(tr(i.text), ui.query)}</p></li>`,
        )
        .join('')}
    </ol>
    <footer class="rule-foot">
      <a class="btn btn-secondary" href="#/quiz/topic/${section.topic}">${icon('test', { size: 18 })}${t('rules.practice')} <span class="badge">${count}</span></a>
      ${source ? `<a class="link-ext" href="${esc(source.url[getLang()])}" target="_blank" rel="noopener">${icon('link', { size: 16 })}${t('rules.official')}</a>` : ''}
    </footer>
  </section>`;
}

function listHtml(data, favRules) {
  const found = filterSections(data, favRules);
  if (!found.length) {
    return `<p class="empty">${t(ui.onlyFav && !ui.query ? 'rules.noFav' : 'rules.nothing')}</p>`;
  }
  const total = found.reduce((n, x) => n + x.items.length, 0);
  const summary = ui.query ? `<p class="muted" role="status">${t('rules.found', { n: total })}</p>` : '';
  return summary + found.map((x) => sectionHtml(x, data, favRules)).join('');
}

function tocHtml(data, favRules) {
  return data.rules
    .map((s) => {
      const fav = favRules.includes(s.id);
      return `<li><a href="#/rules/${s.id}" data-toc="${s.id}">${esc(tr(s.title))}${fav ? `<span class="toc-star" aria-hidden="true">${icon('star', { size: 14, filled: true })}</span>` : ''}</a></li>`;
    })
    .join('');
}

export function rulesView({ data, store, params }) {
  const favRules = store.state.favRules;
  return {
    title: t('rules.title'),
    manageFocus: Boolean(params.section),
    html: `
      <section class="page-head">
        <h1>${t('rules.title')}</h1>
        <p class="lead">${t('rules.lead')}</p>
        <p class="note">${icon('info', { size: 18 })}<span>${t('rules.verifyNote')}</span></p>
      </section>
      <div class="rules-layout">
        <aside class="toc card" aria-labelledby="toc-h">
          <h2 id="toc-h">${t('rules.toc')}</h2>
          <ol id="toc-list">${tocHtml(data, favRules)}</ol>
        </aside>
        <div class="rules-main">
          <div class="rules-tools card">
            <label for="rules-search" class="visually-hidden">${t('rules.search')}</label>
            <div class="search-field">
              ${icon('search', { size: 20 })}
              <input id="rules-search" type="search" autocomplete="off" placeholder="${esc(t('rules.search.placeholder'))}" value="${esc(ui.query)}">
            </div>
            <label class="switch">
              <input type="checkbox" id="only-fav" ${ui.onlyFav ? 'checked' : ''}>
              <span>${icon('star', { size: 18, filled: true })}${t('rules.onlyFav')}</span>
            </label>
          </div>
          <div id="rules-list">${listHtml(data, favRules)}</div>
        </div>
      </div>`,
    mount(root) {
      const list = root.querySelector('#rules-list');
      const refresh = () => {
        list.innerHTML = listHtml(data, store.state.favRules);
        root.querySelector('#toc-list').innerHTML = tocHtml(data, store.state.favRules);
      };
      const input = root.querySelector('#rules-search');
      let timer;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          ui.query = input.value;
          refresh();
        }, 150);
      });
      root.querySelector('#only-fav').addEventListener('change', (e) => {
        ui.onlyFav = e.target.checked;
        refresh();
      });
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-fav-rule]');
        if (!btn) return;
        const id = btn.dataset.favRule;
        const nowFav = store.toggleFavRule(id);
        toast(t(nowFav ? 'rules.fav.add' : 'rules.fav.remove') + ' ✓');
        refresh();
        list.querySelector(`[data-fav-rule="${id}"]`)?.focus();
      });

      // Переход к разделу/пункту из оглавления или из пояснения к вопросу.
      if (params.section) {
        if (ui.query || ui.onlyFav) {
          // Сбрасываем фильтры, чтобы нужный раздел гарантированно был виден.
          ui.query = '';
          ui.onlyFav = false;
          input.value = '';
          root.querySelector('#only-fav').checked = false;
          refresh();
        }
        const target = root.querySelector(params.item ? `#item-${CSS.escape(params.item)}` : `#sec-${CSS.escape(params.section)}`);
        if (target) {
          requestAnimationFrame(() => {
            target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            target.classList.add('is-target');
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          });
        }
      }
      return () => clearTimeout(timer);
    },
  };
}
