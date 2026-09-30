// Генерирует db/seed.sql из JSON-файлов в data/.
// Запуск: npm run build:seed
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadData, validateData, ROOT } from './lib/data.mjs';

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? 'TRUE' : 'FALSE');

const data = await loadData();
const errors = validateData(data);
if (errors.length) {
  console.error('Данные не прошли проверку, seed не создан:\n' + errors.join('\n'));
  process.exit(1);
}
const { meta, topics, rules, questions } = data;
const langs = meta.languages.map((l) => l.code);
const out = [];
const insert = (table, cols, values) =>
  out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${values.join(', ')});`);

out.push('-- Сгенерировано scripts/build-seed.mjs. Не редактируйте вручную.');
out.push(`-- Версия контента: ${meta.contentVersion}`);
out.push('BEGIN;');

meta.languages.forEach((l, i) =>
  insert('languages', ['code', 'name', 'short_label', 'is_default'], [q(l.code), q(l.name), q(l.short), b(i === 0)]),
);

for (const s of meta.legalSources) {
  const code = s.url.ru.split('/').pop();
  insert('legal_sources', ['id', 'code', 'is_active'], [q(s.id), q(code), 'TRUE']);
  for (const lang of langs) {
    insert('legal_source_translations', ['source_id', 'lang', 'title', 'url'], [q(s.id), q(lang), q(s.title[lang]), q(s.url[lang])]);
  }
}

for (const t of topics) {
  insert('topics', ['id', 'sort_order', 'icon'], [q(t.id), t.order, q(t.icon)]);
  for (const lang of langs) {
    insert('topic_translations', ['topic_id', 'lang', 'title', 'description'], [q(t.id), q(lang), q(t.title[lang]), q(t.description[lang])]);
  }
}

rules.forEach((s, si) => {
  insert('rule_sections', ['id', 'topic_id', 'source_id', 'sort_order'], [q(s.id), q(s.topic), q(s.source), si + 1]);
  for (const lang of langs) {
    insert('rule_section_translations', ['section_id', 'lang', 'title', 'reference'], [q(s.id), q(lang), q(s.title[lang]), q(s.reference[lang])]);
  }
  s.items.forEach((item, ii) => {
    insert('rule_items', ['id', 'section_id', 'sort_order', 'clause_number', 'is_verified'], [q(item.id), q(s.id), ii + 1, q(item.clause ?? null), b(item.verified)]);
    for (const lang of langs) {
      insert('rule_item_translations', ['item_id', 'lang', 'body'], [q(item.id), q(lang), q(item.text[lang])]);
    }
  });
});

for (const question of questions) {
  let illId = null;
  if (question.illustration) {
    illId = `ill-${question.id}`;
    insert('illustrations', ['id', 'kind', 'params_json'], [q(illId), q(question.illustration.type), q(JSON.stringify(question.illustration))]);
  }
  insert('questions', ['id', 'topic_id', 'illustration_id', 'difficulty'], [q(question.id), q(question.topic), q(illId), question.difficulty ?? 1]);
  for (const lang of langs) {
    insert('question_translations', ['question_id', 'lang', 'body', 'explanation'], [q(question.id), q(lang), q(question.text[lang]), q(question.explanation[lang])]);
  }
  question.options.forEach((o, oi) => {
    const optId = `${question.id}-${o.id}`;
    insert('answer_options', ['id', 'question_id', 'label', 'sort_order', 'is_correct'], [q(optId), q(question.id), q(o.id), oi + 1, b(o.id === question.correct)]);
    for (const lang of langs) {
      insert('answer_option_translations', ['option_id', 'lang', 'body'], [q(optId), q(lang), q(o.text[lang])]);
    }
  });
  question.refs.forEach((ref, ri) =>
    insert('question_rule_refs', ['question_id', 'item_id', 'sort_order'], [q(question.id), q(ref), ri]),
  );
}

out.push('COMMIT;');
const file = path.join(ROOT, 'db', 'seed.sql');
await writeFile(file, out.join('\n') + '\n');
console.log(`Записано ${out.length} строк в ${path.relative(ROOT, file)}`);
