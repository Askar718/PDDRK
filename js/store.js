// Локальное хранилище прогресса пользователя (localStorage).
// Формат данных совместим с таблицами users/test_sessions/test_answers/
// favorite_* из db/schema.sql, что упрощает будущую синхронизацию с сервером.

export const STORAGE_KEY = 'pdd-kz:v1';
const HISTORY_LIMIT = 100;

function emptyState() {
  return {
    version: 1,
    lang: null,
    theme: null,
    favRules: [],
    favQuestions: [],
    // stats[questionId] = { a: попыток, c: верных, last: верен ли последний ответ, t: время последнего ответа }
    stats: {},
    history: [],
    activeQuiz: null,
  };
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = '__pdd_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    // Приватный режим или запрет хранилища: работаем в памяти.
    return memoryStorage();
  }
}

function normalize(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    lang: typeof raw.lang === 'string' ? raw.lang : null,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null,
    favRules: Array.isArray(raw.favRules) ? raw.favRules.filter((x) => typeof x === 'string') : [],
    favQuestions: Array.isArray(raw.favQuestions) ? raw.favQuestions.filter((x) => typeof x === 'string') : [],
    stats: raw.stats && typeof raw.stats === 'object' ? raw.stats : {},
    history: Array.isArray(raw.history) ? raw.history.slice(0, HISTORY_LIMIT) : [],
    activeQuiz: raw.activeQuiz && typeof raw.activeQuiz === 'object' ? raw.activeQuiz : null,
  };
}

export function createStore(storage = safeStorage()) {
  let state;
  try {
    state = normalize(JSON.parse(storage.getItem(STORAGE_KEY)));
  } catch {
    state = emptyState();
  }
  const listeners = new Set();

  const save = () => {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* квота исчерпана — продолжаем работу без сохранения */
    }
    listeners.forEach((fn) => fn(state));
  };

  const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return {
    get state() {
      return state;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setLang(lang) {
      state.lang = lang;
      save();
    },
    setTheme(theme) {
      state.theme = theme;
      save();
    },
    toggleFavRule(id) {
      state.favRules = toggleIn(state.favRules, id);
      save();
      return state.favRules.includes(id);
    },
    toggleFavQuestion(id) {
      state.favQuestions = toggleIn(state.favQuestions, id);
      save();
      return state.favQuestions.includes(id);
    },
    recordAnswer(questionId, correct, at = Date.now()) {
      const prev = state.stats[questionId] ?? { a: 0, c: 0, last: null, t: 0 };
      state.stats[questionId] = { a: prev.a + 1, c: prev.c + (correct ? 1 : 0), last: !!correct, t: at };
      save();
    },
    addHistory(entry) {
      state.history = [entry, ...state.history].slice(0, HISTORY_LIMIT);
      save();
    },
    setActiveQuiz(session) {
      state.activeQuiz = session;
      save();
    },
    reset() {
      const { lang, theme } = state;
      state = { ...emptyState(), lang, theme };
      save();
    },
    exportJson() {
      const { activeQuiz, ...rest } = state;
      return JSON.stringify({ ...rest, exportedAt: new Date().toISOString() }, null, 2);
    },
    importJson(text) {
      const parsed = JSON.parse(text);
      if (!parsed || parsed.version !== 1) throw new Error('Unsupported format');
      state = { ...normalize(parsed), lang: state.lang, theme: state.theme, activeQuiz: null };
      save();
    },
  };
}
