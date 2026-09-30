// Оригинальные SVG-иллюстрации дорожных ситуаций, генерируемые по параметрам
// из data/questions.json (поле illustration). Цвета окружения берутся из
// CSS-переменных, поэтому схемы адаптируются к светлой и тёмной темам.
// Цвета самих знаков и сигналов фиксированы — как на реальных дорогах.

const CAR_COLORS = { blue: '#1f6fd1', red: '#d23b3b', green: '#1d9a5b', yellow: '#e0a800', gray: '#6b7280' };

const r2 = (n) => Math.round(n * 100) / 100;

function rotatePoint([x, y], deg, [cx, cy] = [150, 150]) {
  const a = (deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return [r2(cx + dx * Math.cos(a) - dy * Math.sin(a)), r2(cy + dx * Math.sin(a) + dy * Math.cos(a))];
}

/** Автомобиль с центром в (x, y), направленный под углом deg (0 — вверх, по часовой). */
function car(x, y, deg, color, { blinkLeft = false, hazard = false } = {}) {
  const fill = CAR_COLORS[color] ?? color;
  const lamp = (cx, cy, cls) => `<circle cx="${cx}" cy="${cy}" r="3.2" class="${cls}"/>`;
  let lamps = '';
  if (blinkLeft) lamps += lamp(-9, -18, 'il-blink') + lamp(-9, 18, 'il-blink');
  if (hazard) lamps += lamp(-9, -18, 'il-blink') + lamp(9, -18, 'il-blink') + lamp(-9, 18, 'il-blink') + lamp(9, 18, 'il-blink');
  return `<g transform="translate(${x} ${y}) rotate(${deg})">
    <rect x="-12" y="-21" width="24" height="42" rx="6" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
    <rect x="-9" y="-13" width="18" height="8" rx="2" fill="#dbeafe" opacity=".9"/>
    <rect x="-9" y="9" width="18" height="6" rx="2" fill="#dbeafe" opacity=".7"/>
    <rect x="-9" y="-21" width="5" height="3" rx="1" fill="#fff7c2"/>
    <rect x="4" y="-21" width="5" height="3" rx="1" fill="#fff7c2"/>
    ${lamps}
  </g>`;
}

function label(x, y, text) {
  return `<g class="il-label"><circle cx="${x}" cy="${y}" r="11"/><text x="${x}" y="${y + 4}" text-anchor="middle">${text}</text></g>`;
}

function pedestrian(x, y, { cane = false } = {}) {
  return `<g class="il-ped" transform="translate(${x} ${y})">
    <circle cx="0" cy="-16" r="5"/>
    <path d="M0 -10 L0 4 M0 -6 L-7 0 M0 -6 L7 -1 M0 4 L-6 14 M0 4 L6 14" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    ${cane ? '<path d="M7 -1 L16 15" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" class="il-cane"/><rect x="-4" y="-18" width="8" height="3" rx="1" fill="#111"/>' : ''}
  </g>`;
}

function arrowPath(d, color) {
  return `<path d="${d}" fill="none" stroke="${CAR_COLORS[color] ?? color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#il-arrow-${color})" opacity=".9"/>`;
}

function arrowMarkers(colors) {
  return [...new Set(colors)]
    .map(
      (c) => `<marker id="il-arrow-${c}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="${CAR_COLORS[c] ?? c}"/></marker>`,
    )
    .join('');
}

// ---------------------------------------------------------------------------
// Дорожные знаки (viewBox 0 0 200 200)
// ---------------------------------------------------------------------------

const RED = '#d0202e';
const BLUE = '#1c5bb8';
const YELLOW = '#f7c600';

function signSvg(kind, value) {
  switch (kind) {
    case 'give-way':
      return `<path d="M20 30 H180 L100 178 Z" fill="${RED}" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
        <path d="M50 48 H150 L100 142 Z" fill="#fff"/>`;
    case 'stop': {
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = ((22.5 + i * 45) * Math.PI) / 180;
        return `${r2(100 + 88 * Math.cos(a))},${r2(100 + 88 * Math.sin(a))}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="${RED}" stroke="#fff" stroke-width="6"/>
        <text x="100" y="118" text-anchor="middle" font-size="52" font-weight="800" fill="#fff" font-family="Arial, sans-serif">STOP</text>`;
    }
    case 'priority-road':
      return `<rect x="42" y="42" width="116" height="116" transform="rotate(45 100 100)" fill="#fff" stroke="#222" stroke-width="2"/>
        <rect x="62" y="62" width="76" height="76" transform="rotate(45 100 100)" fill="${YELLOW}"/>`;
    case 'no-overtaking':
      return `<circle cx="100" cy="100" r="88" fill="#fff" stroke="${RED}" stroke-width="18"/>
        ${miniCar(68, 104, RED)}${miniCar(132, 104, '#1a1a1a')}`;
    case 'no-stopping':
      return `<circle cx="100" cy="100" r="88" fill="${BLUE}" stroke="${RED}" stroke-width="18"/>
        <path d="M45 45 L155 155 M155 45 L45 155" stroke="${RED}" stroke-width="16"/>`;
    case 'no-parking':
      return `<circle cx="100" cy="100" r="88" fill="${BLUE}" stroke="${RED}" stroke-width="18"/>
        <path d="M45 45 L155 155" stroke="${RED}" stroke-width="16"/>`;
    case 'speed-limit':
      return `<circle cx="100" cy="100" r="88" fill="#fff" stroke="${RED}" stroke-width="18"/>
        <text x="100" y="124" text-anchor="middle" font-size="68" font-weight="800" fill="#111" font-family="Arial, sans-serif">${Number(value) || 60}</text>`;
    case 'children':
      return `<path d="M100 18 L186 170 H14 Z" fill="#fff" stroke="${RED}" stroke-width="14" stroke-linejoin="round"/>
        <g fill="#111"><circle cx="86" cy="82" r="9"/><path d="M78 94 h16 l6 34 h-8 l-4 22 h-8 l-4 -22 h-6 z"/>
        <circle cx="118" cy="96" r="7"/><path d="M112 106 h12 l5 26 h-6 l-3 18 h-6 l-3 -18 h-4 z"/></g>`;
    case 'settlement':
      return `<rect x="10" y="50" width="180" height="100" rx="8" fill="#fff" stroke="#111" stroke-width="4"/>
        <g fill="#111"><rect x="36" y="96" width="22" height="36"/><rect x="62" y="80" width="18" height="52"/>
        <rect x="84" y="70" width="24" height="62"/><path d="M112 132 v-36 l14 -12 l14 12 v36 z"/><rect x="144" y="90" width="22" height="42"/></g>`;
    case 'crosswalk':
      return `<rect x="14" y="14" width="172" height="172" rx="14" fill="${BLUE}" stroke="#fff" stroke-width="6"/>
        <path d="M100 30 L172 164 H28 Z" fill="#fff"/>
        <g fill="#111"><circle cx="104" cy="82" r="10"/><path d="M96 96 h14 l10 26 l-8 3 l-6 -14 l-2 18 l12 28 h-10 l-10 -22 l-8 22 h-10 l12 -32 l0 -14 l-10 10 l-6 -6 z"/></g>
        <path d="M44 150 H156" stroke="#111" stroke-width="6" stroke-dasharray="12 8"/>`;
    default:
      return `<circle cx="100" cy="100" r="88" fill="#fff" stroke="#999" stroke-width="6"/>`;
  }
}

function miniCar(cx, cy, color) {
  return `<g transform="translate(${cx} ${cy})" fill="${color}">
    <path d="M-24 6 v-12 l8 -14 h32 l8 14 v12 z"/><circle cx="-13" cy="8" r="6"/><circle cx="13" cy="8" r="6"/></g>`;
}

function renderSign({ sign, value }) {
  return { viewBox: '0 0 200 200', body: signSvg(sign, value), className: 'il-sign' };
}

/** Небольшой знак на стойке для сцен. */
function signOnPost(x, y, kind, size = 34) {
  const s = size / 200;
  return `<g transform="translate(${x} ${y})">
    <rect x="-1.5" y="0" width="3" height="${size * 0.8}" class="il-post"/>
    <g transform="translate(${-size / 2} ${-size}) scale(${s})">${signSvg(kind)}</g></g>`;
}

// ---------------------------------------------------------------------------
// Светофор (viewBox 0 0 220 240)
// ---------------------------------------------------------------------------

function renderLight({ state }) {
  const on = {
    red: state === 'red' || state === 'red-yellow' || state === 'red-arrow-right',
    yellow: state === 'yellow' || state === 'red-yellow' || state === 'yellow-flash',
    green: state === 'green',
  };
  const lamp = (cy, color, lit, blink = false) =>
    `<circle cx="80" cy="${cy}" r="28" fill="${lit ? color : '#2b2f36'}" ${lit ? `class="il-lit${blink ? ' il-blink' : ''}" style="--glow:${color}"` : ''} stroke="#15181c" stroke-width="3"/>`;
  let extra = '';
  if (state === 'red-arrow-right') {
    extra = `<rect x="130" y="160" width="70" height="70" rx="12" fill="#1f2328"/>
      <circle cx="165" cy="195" r="26" fill="#2b2f36" stroke="#15181c" stroke-width="3"/>
      <path d="M148 195 H176 M166 183 L180 195 L166 207" stroke="#35d07f" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" class="il-lit" style="--glow:#35d07f"/>`;
  }
  return {
    viewBox: '0 0 220 240',
    className: 'il-light',
    body: `<rect x="40" y="10" width="80" height="220" rx="16" fill="#1f2328"/>
      ${lamp(55, '#ff3b30', on.red)}${lamp(120, '#ffc400', on.yellow, state === 'yellow-flash')}${lamp(185, '#2fd07a', on.green)}
      ${extra}`,
  };
}

// ---------------------------------------------------------------------------
// Перекрёсток (viewBox 0 0 300 300). Схемы строятся для подъезда с юга
// и поворачиваются для остальных направлений.
// ---------------------------------------------------------------------------

const APPROACH_ANGLE = { s: 0, w: 90, n: 180, e: 270 };

const TURN_PATHS = {
  straight: [['M', [175, 222]], ['L', [175, 40]]],
  right: [['M', [175, 222]], ['L', [175, 195]], ['Q', [175, 175], [195, 175]], ['L', [262, 175]]],
  left: [['M', [175, 222]], ['L', [175, 160]], ['Q', [175, 125], [140, 125]], ['L', [38, 125]]],
};

function turnPath(turn, deg) {
  const spec = TURN_PATHS[turn] ?? TURN_PATHS.straight;
  return spec
    .map(([cmd, ...points]) => cmd + points.map((p) => rotatePoint(p, deg).join(' ')).join(' '))
    .join(' ');
}

function renderIntersection({ cars = [], main = null, signs = [], light = null, pedestrian: pedArm = null }) {
  const markers = arrowMarkers(cars.map((c) => c.color));
  const centerLine = (horizontal) => {
    const isMain = main === (horizontal ? 'ew' : 'ns');
    const dash = isMain ? '' : 'stroke-dasharray="12 10"';
    return horizontal
      ? `<path d="M0 150 H100 M200 150 H300" class="il-line" ${dash}/>`
      : `<path d="M150 0 V100 M150 200 V300" class="il-line" ${dash}/>`;
  };
  let body = `<defs>${markers}</defs>
    <rect width="300" height="300" class="il-ground"/>
    <rect x="100" y="0" width="100" height="300" class="il-road"/>
    <rect x="0" y="100" width="300" height="100" class="il-road"/>
    ${main ? `<rect x="${main === 'ew' ? 0 : 100}" y="${main === 'ew' ? 100 : 0}" width="${main === 'ew' ? 300 : 100}" height="${main === 'ew' ? 100 : 300}" class="il-road-main"/>` : ''}
    ${centerLine(true)}${centerLine(false)}`;

  if (pedArm) {
    const deg = APPROACH_ANGLE[pedArm];
    const stripes = Array.from({ length: 7 }, (_, i) => `<rect x="${104 + i * 14}" y="208" width="8" height="26" class="il-zebra"/>`).join('');
    body += `<g transform="rotate(${deg} 150 150)">${stripes}</g>`;
    const [px, py] = rotatePoint([128, 221], deg);
    body += pedestrian(px, py);
  }

  if (light) {
    body += `<g transform="translate(212 212)"><rect width="16" height="40" rx="4" fill="#1f2328"/>
      <circle cx="8" cy="8" r="5" fill="${light === 'red' ? '#ff3b30' : '#2b2f36'}"/>
      <circle cx="8" cy="20" r="5" fill="${light === 'yellow' ? '#ffc400' : '#2b2f36'}"/>
      <circle cx="8" cy="32" r="5" fill="${light === 'green' ? '#2fd07a' : '#2b2f36'}"/></g>`;
  }

  for (const s of signs) {
    const [x, y] = rotatePoint([222, 250], APPROACH_ANGLE[s.at] ?? 0);
    body += signOnPost(x, y, s.sign);
  }
  if (main) {
    // Знак «Главная дорога» для подъездов по главной (справа по ходу движения).
    const arms = main === 'ew' ? ['w', 'e'] : ['s', 'n'];
    for (const arm of arms) {
      const [x, y] = rotatePoint([222, 262], APPROACH_ANGLE[arm]);
      body += signOnPost(x, y, 'priority-road', 26);
    }
  }

  for (const c of cars) {
    const deg = APPROACH_ANGLE[c.from] ?? 0;
    body += arrowPath(turnPath(c.turn, deg), c.color);
  }
  for (const c of cars) {
    const deg = APPROACH_ANGLE[c.from] ?? 0;
    const [x, y] = rotatePoint([175, 250], deg);
    body += car(x, y, deg, c.color);
    const [lx, ly] = rotatePoint([196, 272], deg);
    if (c.label) body += label(lx, ly, c.label);
  }
  return { viewBox: '0 0 300 300', body, className: 'il-scene' };
}

// ---------------------------------------------------------------------------
// Участок дороги (viewBox 0 0 400 200): обгон, разметка
// ---------------------------------------------------------------------------

function roadBase(marking, { width = 400 } = {}) {
  const dash = marking === 'broken' ? 'stroke-dasharray="22 16"' : '';
  return `<rect width="${width}" height="200" class="il-ground"/>
    <rect x="0" y="45" width="${width}" height="110" class="il-road"/>
    <path d="M0 50 H${width} M0 150 H${width}" class="il-edge"/>
    <path d="M0 100 H${width}" class="il-line" ${dash}/>`;
}

function renderRoad({ marking = 'broken', scene = 'plain' }) {
  let body = `<defs>${arrowMarkers(['blue'])}</defs>` + roadBase(marking);
  if (scene === 'plain') {
    body += car(90, 125, 90, 'blue') + car(310, 75, 270, 'gray');
  } else if (scene === 'overtake') {
    body += arrowPath('M112 125 C 150 125, 150 75, 190 75 L 250 75 C 290 75, 290 125, 330 125', 'blue');
    body += car(80, 125, 90, 'blue') + car(215, 125, 90, 'red');
    body += label(80, 158 + 10, 'A');
  } else if (scene === 'signal-left') {
    body += car(90, 125, 90, 'blue') + car(215, 125, 90, 'red', { blinkLeft: true });
    body += `<path d="M150 125 C 180 125, 190 80, 230 80" fill="none" stroke="${CAR_COLORS.blue}" stroke-width="4" stroke-dasharray="6 6" opacity=".7"/>`;
    body += `<text x="258" y="110" class="il-q">?</text>`;
  }
  return { viewBox: '0 0 400 200', body, className: 'il-scene' };
}

// ---------------------------------------------------------------------------
// Остановка у объекта с размерной линией (viewBox 0 0 400 200)
// ---------------------------------------------------------------------------

function dimension(x1, x2, y, text) {
  return `<g class="il-dim">
    <path d="M${x1} ${y} H${x2} M${x1} ${y - 7} V${y + 7} M${x2} ${y - 7} V${y + 7}"/>
    <rect x="${(x1 + x2) / 2 - 26}" y="${y - 13}" width="52" height="22" rx="6"/>
    <text x="${(x1 + x2) / 2}" y="${y + 3}" text-anchor="middle">${text}</text></g>`;
}

function renderStop({ object, distance }) {
  let body = `<rect width="400" height="200" class="il-ground"/>
    <rect x="0" y="30" width="400" height="110" class="il-road"/>
    <path d="M0 85 H400" class="il-line" stroke-dasharray="22 16"/>
    <rect x="0" y="140" width="400" height="34" class="il-sidewalk"/>`;
  if (object === 'bus-stop') {
    body += `<rect x="286" y="112" width="100" height="28" class="il-stop-zone"/>
      <g transform="translate(290 150)"><rect x="-2" y="-30" width="4" height="34" class="il-post"/>
      <rect x="-14" y="-52" width="28" height="24" rx="3" fill="${BLUE}"/>
      <path d="M-8 -34 v-12 h16 v12 z M-6 -42 h12" stroke="#fff" stroke-width="2" fill="none"/></g>`;
    body += car(170, 118, 90, 'blue');
    body += dimension(192, 286, 58, `${distance} м`);
  } else {
    const stripes = Array.from({ length: 6 }, (_, i) => `<rect x="300" y="${36 + i * 18}" width="44" height="10" class="il-zebra"/>`).join('');
    body += stripes + car(225, 118, 90, 'blue');
    body += dimension(247, 300, 58, `${distance} м`);
    body += pedestrian(322, 162);
  }
  return { viewBox: '0 0 400 200', body, className: 'il-scene' };
}

// ---------------------------------------------------------------------------
// Пешеходный переход (viewBox 0 0 400 220)
// ---------------------------------------------------------------------------

function renderCrosswalk({ pedestrian: kind = 'entering' }) {
  let body = `<rect width="400" height="220" class="il-ground"/>
    <rect x="0" y="16" width="400" height="30" class="il-sidewalk"/>
    <rect x="0" y="46" width="400" height="120" class="il-road"/>
    <rect x="0" y="166" width="400" height="34" class="il-sidewalk"/>
    <path d="M0 106 H400" class="il-line" stroke-dasharray="22 16"/>`;
  if (kind === 'entering') {
    body += Array.from({ length: 6 }, (_, i) => `<rect x="215" y="${52 + i * 19}" width="50" height="11" class="il-zebra"/>`).join('');
    body += signOnPost(292, 200, 'crosswalk', 30);
    body += pedestrian(240, 168);
    body += car(110, 136, 90, 'blue');
  } else {
    body += pedestrian(240, 150, { cane: true });
    body += car(110, 136, 90, 'blue');
  }
  return { viewBox: '0 0 400 220', body, className: 'il-scene' };
}

// ---------------------------------------------------------------------------
// Знак аварийной остановки (viewBox 0 0 400 180)
// ---------------------------------------------------------------------------

function renderTriangle({ distance = 30 }) {
  const body = `<rect width="400" height="180" class="il-ground"/>
    <rect x="0" y="30" width="400" height="110" class="il-road"/>
    <path d="M0 85 H400" class="il-line" stroke-dasharray="22 16"/>
    <path d="M0 136 H400" class="il-edge"/>
    ${car(330, 112, 90, 'blue', { hazard: true })}
    <g transform="translate(70 124)"><path d="M0 -20 L17 10 H-17 Z" fill="none" stroke="${RED}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M0 -9 L8 5 H-8 Z" fill="#ffb300" opacity=".7"/></g>
    ${dimension(70, 306, 162, `≥ ${distance} м`)}`;
  return { viewBox: '0 0 400 180', body, className: 'il-scene' };
}

const RENDERERS = {
  sign: renderSign,
  light: renderLight,
  intersection: renderIntersection,
  road: renderRoad,
  stop: renderStop,
  crosswalk: renderCrosswalk,
  triangle: renderTriangle,
};

/** Возвращает строку <svg> для описания иллюстрации или пустую строку. */
export function renderIllustration(spec, ariaLabel = '') {
  if (!spec) return '';
  const fn = RENDERERS[spec.type];
  if (!fn) return '';
  const { viewBox, body, className } = fn(spec);
  const safeLabel = String(ariaLabel).replace(/[<>&"]/g, '');
  return `<svg class="illustration ${className}" viewBox="${viewBox}" role="img" aria-label="${safeLabel}" xmlns="http://www.w3.org/2000/svg" focusable="false">${body}</svg>`;
}

export const _internal = { rotatePoint, turnPath, RENDERERS };
