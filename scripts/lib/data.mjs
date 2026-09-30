import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function readJson(name) {
  return JSON.parse(await readFile(path.join(ROOT, 'data', name), 'utf8'));
}

export async function loadData() {
  const [meta, topics, rules, questions] = await Promise.all([
    readJson('meta.json'),
    readJson('topics.json'),
    readJson('rules.json'),
    readJson('questions.json'),
  ]);
  return { meta, topics, rules, questions };
}

const ILLUSTRATION_TYPES = new Set(['sign', 'light', 'intersection', 'road', 'stop', 'crosswalk', 'triangle']);

/**
 * Проверяет целостность учебной базы. Возвращает массив строк-ошибок
 * (пустой массив — всё в порядке).
 */
export function validateData({ meta, topics, rules, questions }) {
  const errors = [];
  const langs = meta.languages.map((l) => l.code);
  const checkText = (obj, where) => {
    if (!obj || typeof obj !== 'object') {
      errors.push(`${where}: нет переводов`);
      return;
    }
    for (const lang of langs) {
      if (typeof obj[lang] !== 'string' || !obj[lang].trim()) {
        errors.push(`${where}: нет перевода «${lang}»`);
      }
    }
  };
  const unique = (ids, what) => {
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`Дубликат ${what}: ${id}`);
      seen.add(id);
    }
    return seen;
  };

  const topicIds = unique(topics.map((t) => t.id), 'темы');
  for (const t of topics) {
    checkText(t.title, `Тема ${t.id}.title`);
    checkText(t.description, `Тема ${t.id}.description`);
  }

  const sourceIds = new Set(meta.legalSources.map((s) => s.id));
  unique(rules.map((s) => s.id), 'раздела правил');
  const itemIds = unique(rules.flatMap((s) => s.items.map((i) => i.id)), 'пункта правил');
  for (const s of rules) {
    if (!topicIds.has(s.topic)) errors.push(`Раздел ${s.id}: неизвестная тема ${s.topic}`);
    if (!sourceIds.has(s.source)) errors.push(`Раздел ${s.id}: неизвестный источник ${s.source}`);
    checkText(s.title, `Раздел ${s.id}.title`);
    checkText(s.reference, `Раздел ${s.id}.reference`);
    for (const item of s.items) checkText(item.text, `Пункт ${item.id}`);
  }

  unique(questions.map((q) => q.id), 'вопроса');
  for (const q of questions) {
    const where = `Вопрос ${q.id}`;
    if (!topicIds.has(q.topic)) errors.push(`${where}: неизвестная тема ${q.topic}`);
    checkText(q.text, `${where}.text`);
    checkText(q.explanation, `${where}.explanation`);
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`${where}: нужно минимум 2 варианта ответа`);
      continue;
    }
    const optIds = unique(q.options.map((o) => o.id), `варианта в ${q.id}`);
    q.options.forEach((o) => checkText(o.text, `${where}.options.${o.id}`));
    if (!optIds.has(q.correct)) errors.push(`${where}: правильный ответ «${q.correct}» не найден среди вариантов`);
    if (!Array.isArray(q.refs) || q.refs.length === 0) errors.push(`${where}: нет ссылки на пункт правил`);
    for (const ref of q.refs ?? []) {
      if (!itemIds.has(ref)) errors.push(`${where}: ссылка на несуществующий пункт ${ref}`);
    }
    if (q.illustration && !ILLUSTRATION_TYPES.has(q.illustration.type)) {
      errors.push(`${where}: неизвестный тип иллюстрации ${q.illustration.type}`);
    }
  }

  for (const t of topics) {
    if (!questions.some((q) => q.topic === t.id)) errors.push(`Тема ${t.id}: нет ни одного вопроса`);
    if (!rules.some((s) => s.topic === t.id)) errors.push(`Тема ${t.id}: нет раздела правил`);
  }
  return errors;
}
