import { loadData, validateData } from './lib/data.mjs';

const data = await loadData();
const errors = validateData(data);
if (errors.length) {
  console.error(`Найдено ошибок: ${errors.length}`);
  for (const e of errors) console.error(' • ' + e);
  process.exit(1);
}
const items = data.rules.reduce((n, s) => n + s.items.length, 0);
console.log(`OK: тем ${data.topics.length}, разделов ${data.rules.length}, пунктов ${items}, вопросов ${data.questions.length}`);
