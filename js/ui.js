// Общие помощники отрисовки.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Подсветка совпадений поиска: экранирует текст и оборачивает совпадения в <mark>. */
export function highlight(text, query) {
  const safe = esc(text);
  const q = query.trim();
  if (!q) return safe;
  const pattern = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(pattern, 'giu'), (m) => `<mark>${m}</mark>`);
}

const PATHS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zm0 0v16M8 7h7M8 11h7',
  check: 'M20 6L9 17l-5-5',
  test: 'M9 11l2 2 4-4M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  close: 'M18 6L6 18M6 6l12 12',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  timer: 'M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  repeat: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  image: 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15',
  // Иконки тем
  wheel: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 10h6.6M14.9 10h6.6M12 15v7',
  sign: 'M12 2l10 18H2zM12 9v5M12 17h.01',
  lines: 'M4 3v18M20 3v18M12 3v3M12 9v3M12 15v3',
  light: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  cross: 'M9 2v7H2v6h7v7h6v-7h7V9h-7V2z',
  gauge: 'M12 21a9 9 0 1 1 9-9M12 12l5-4M3 12h2M12 3v2M19 12h2',
  overtake: 'M5 20V4M12 20v-6a4 4 0 0 1 4-4h3M16 6l3 4-3 4',
  parking: 'M4 3h16v18H4zM9 17V7h4a3 3 0 0 1 0 6H9',
  walker: 'M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 22l2-7 3 3v6M9 12l2-5 4 3 3 1M11 7l-4 4',
  seat: 'M7 3h5l1 10H7zM7 13h9l2 8M7 13l-2 8',
  aid: 'M4 7h16v13H4zM9 7V4h6v3M12 10v7M8.5 13.5h7',
};

export function icon(name, { size = 22, filled = false, label = '' } = {}) {
  const d = PATHS[name] ?? PATHS.info;
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${a11y} focusable="false"><path d="${d}"/></svg>`;
}

export const pct = (ratio) => (ratio === null || ratio === undefined ? '—' : `${Math.round(ratio * 100)}%`);

/** Короткое всплывающее уведомление (озвучивается скринридерами). */
export function toast(message) {
  const host = document.getElementById('toast');
  if (!host) return;
  host.textContent = message;
  host.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => host.classList.remove('is-visible'), 2600);
}
