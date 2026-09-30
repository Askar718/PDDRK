import { setLang, getLang, t, LANGS } from './i18n.js';
import { createStore } from './store.js';
import { icon, esc } from './ui.js';
import { generateQuestions } from './generator.js';
import { homeView } from './views/home.js';
import { rulesView } from './views/rules.js';
import { testsView } from './views/tests.js';
import { quizStartView, quizView, resultView } from './views/quiz.js';
import { progressView } from './views/progress.js';
import { aboutView } from './views/about.js';

const store = createStore();
let data = null;
let cleanup = null;

// ---------------------------------------------------------------------------
// Загрузка учебной базы
// ---------------------------------------------------------------------------

async function loadData() {
  const get = async (name) => {
    const res = await fetch(`data/${name}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return res.json();
  };
  const [meta, topics, rules, authored] = await Promise.all(['meta', 'topics', 'rules', 'questions'].map(get));
  // Авторские вопросы + сгенерированные по шаблонам (js/generator.js).
  const questions = [...authored, ...generateQuestions()];
  topics.sort((a, b) => a.order - b.order);
  const ruleItemById = new Map();
  for (const section of rules) for (const item of section.items) ruleItemById.set(item.id, { item, section });
  return {
    meta,
    topics,
    rules,
    questions,
    topicById: new Map(topics.map((x) => [x.id, x])),
    sectionById: new Map(rules.map((x) => [x.id, x])),
    questionById: new Map(questions.map((x) => [x.id, x])),
    ruleItemById,
    sourceById: new Map(meta.legalSources.map((x) => [x.id, x])),
  };
}

// ---------------------------------------------------------------------------
// Тема и язык
// ---------------------------------------------------------------------------

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const theme = store.state.theme ?? systemTheme();
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f1720' : '#0a7fa4');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const next = theme === 'dark' ? 'light' : 'dark';
    btn.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
    btn.setAttribute('aria-label', t(next === 'dark' ? 'theme.dark' : 'theme.light'));
    btn.title = btn.getAttribute('aria-label');
  }
}

function detectLang() {
  if (store.state.lang && LANGS.includes(store.state.lang)) return store.state.lang;
  const nav = (navigator.language || '').toLowerCase();
  return nav.startsWith('kk') ? 'kk' : 'ru';
}

// ---------------------------------------------------------------------------
// Каркас страницы
// ---------------------------------------------------------------------------

const NAV = [
  { href: '#/', key: 'nav.home', icon: 'home', match: /^\/?$/ },
  { href: '#/rules', key: 'nav.rules', icon: 'book', match: /^\/rules/ },
  { href: '#/tests', key: 'nav.tests', icon: 'test', match: /^\/(tests|quiz|result)/ },
  { href: '#/progress', key: 'nav.progress', icon: 'chart', match: /^\/progress/ },
  { href: '#/about', key: 'nav.about', icon: 'info', match: /^\/about/, desktopOnly: true },
];

function renderShell() {
  const lang = getLang();
  document.title = t('app.name');
  document.getElementById('app').innerHTML = `
    <a class="skip-link" href="#main">${t('skip')}</a>
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="#/" aria-label="${esc(t('app.name'))}">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="36" height="36"><rect width="40" height="40" rx="10" fill="var(--brand)"/>
            <path d="M20 6 L28 34 H12 Z" fill="var(--road)"/><path d="M20 10v4M20 18v4M20 26v5" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/></svg>
          </span>
          <span class="brand-text"><strong>${t('app.short')}</strong><small>${t('app.tagline')}</small></span>
        </a>
        <nav class="main-nav" aria-label="${esc(t('nav.label'))}">
          ${NAV.map((n) => `<a href="${n.href}" data-nav="${n.href}">${icon(n.icon, { size: 20 })}<span>${t(n.key)}</span></a>`).join('')}
        </nav>
        <div class="header-tools">
          <div class="lang-switch" role="group" aria-label="${esc(t('lang.switch'))}">
            ${data.meta.languages
              .map((l) => `<button type="button" data-lang="${l.code}" aria-pressed="${l.code === lang}" lang="${l.code}" title="${esc(l.name)}">${esc(l.short)}</button>`)
              .join('')}
          </div>
          <button type="button" id="theme-toggle" class="icon-btn"></button>
        </div>
      </div>
    </header>
    <main id="main" tabindex="-1" class="container"></main>
    <footer class="site-footer">
      <div class="container">
        <p class="footer-disclaimer">${icon('alert', { size: 18 })}<span>${t('disclaimer.short')}</span></p>
        <p class="footer-links"><a href="#/about">${t('nav.about')}</a> · <a href="${esc(data.meta.legalSources[0].url[lang])}" target="_blank" rel="noopener">adilet.zan.kz</a></p>
      </div>
    </footer>
    <nav class="tab-bar" aria-label="${esc(t('nav.label'))}">
      ${NAV.filter((n) => !n.desktopOnly)
        .map((n) => `<a href="${n.href}" data-nav="${n.href}">${icon(n.icon, { size: 22 })}<span>${t(n.key)}</span></a>`)
        .join('')}
    </nav>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>`;

  document.querySelectorAll('[data-lang]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === getLang()) return;
      setLang(btn.dataset.lang);
      store.setLang(btn.dataset.lang);
      renderShell();
      route({ keepScroll: true });
      document.querySelector(`[data-lang="${btn.dataset.lang}"]`)?.focus();
    }),
  );
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    store.setTheme(current === 'dark' ? 'light' : 'dark');
    applyTheme();
  });
  applyTheme();
}

function markActiveNav(path) {
  const item = NAV.find((n) => n.match.test(path));
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (item && a.dataset.nav === item.href) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// ---------------------------------------------------------------------------
// Маршрутизация (hash-router)
// ---------------------------------------------------------------------------

const ROUTES = [
  [/^\/?$/, homeView],
  [/^\/rules(?:\/([\w-]+))?(?:\/([\w-]+))?$/, rulesView, ['section', 'item']],
  [/^\/tests$/, testsView],
  [/^\/quiz\/(exam|marathon|mistakes|favorites)$/, quizStartView, ['mode']],
  [/^\/quiz\/(topic)\/([\w-]+)$/, quizStartView, ['mode', 'topicId']],
  [/^\/quiz$/, quizView],
  [/^\/result$/, resultView],
  [/^\/progress$/, progressView],
  [/^\/about$/, aboutView],
];

export function navigate(hash, { replace = false } = {}) {
  if (replace) {
    history.replaceState(null, '', hash);
    route();
  } else if (location.hash === hash) {
    route();
  } else {
    location.hash = hash;
  }
}

function notFoundView() {
  return {
    title: t('common.notFound'),
    html: `<section class="page-head"><h1 tabindex="-1">${t('common.notFound')}</h1><p><a class="btn btn-primary" href="#/">${t('common.toHome')}</a></p></section>`,
  };
}

function route({ keepScroll = false } = {}) {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  const path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  let view = notFoundView;
  let params = {};
  for (const [re, fn, names = []] of ROUTES) {
    const m = path.match(re);
    if (m) {
      view = fn;
      names.forEach((name, i) => (params[name] = m[i + 1]));
      break;
    }
  }
  const main = document.getElementById('main');
  const ctx = { data, store, params, navigate, rerender: () => route({ keepScroll: true }) };
  const result = view(ctx);
  if (!result) return; // представление выполнило перенаправление
  main.innerHTML = result.html;
  document.title = result.title ? `${result.title} — ${t('app.short')}` : t('app.name');
  markActiveNav(path);
  if (typeof result.mount === 'function') cleanup = result.mount(main) || null;
  if (!keepScroll && !result.manageFocus) {
    window.scrollTo(0, 0);
    const h1 = main.querySelector('h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  }
}

// ---------------------------------------------------------------------------
// Запуск
// ---------------------------------------------------------------------------

async function start() {
  setLang(detectLang());
  applyTheme();
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (!store.state.theme) applyTheme();
  });
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    document.getElementById('app').innerHTML = `<main class="container load-error" role="alert"><h1>${esc(t('app.name'))}</h1><p>${esc(t('common.loadError'))}</p></main>`;
    return;
  }
  renderShell();
  window.addEventListener('hashchange', () => route());
  route();
}

start();
