// Генератор учебных вопросов по шаблонам.
// Правильный ответ каждого вопроса вычисляется из правил (кто кому уступает,
// ограничения скорости, запрещённые расстояния и т. д.), поэтому вопросы
// корректны по построению. Идентификаторы детерминированы: статистика и
// избранное сохраняются между запусками.
//
// Модуль не зависит от DOM и используется и сайтом, и scripts/build-seed.mjs.

const L = (ru, kk) => ({ ru, kk });

// ---------------------------------------------------------------------------
// Перекрёстки: модель приоритета
// ---------------------------------------------------------------------------

// Подъезды по часовой стрелке (как в js/illustrations.js: s=0°, w=90°, n=180°, e=270°).
const ARMS = ['s', 'w', 'n', 'e'];
// Ячейки центра перекрёстка по часовой стрелке; поворот на 90° сдвигает индекс на 1.
const CELLS = ['SE', 'SW', 'NW', 'NE'];
// Траектории для подъезда с юга (правостороннее движение).
const BASE_PATHS = {
  straight: { cells: ['SE', 'NE'], exit: 'n' },
  right: { cells: ['SE'], exit: 'e' },
  left: { cells: ['SE', 'NE', 'NW'], exit: 'w' },
};

const rot = (list, value, k) => list[(list.indexOf(value) + k) % list.length];

export function movement(from, turn) {
  const k = ARMS.indexOf(from);
  const base = BASE_PATHS[turn];
  return { cells: base.cells.map((c) => rot(CELLS, c, k)), exit: rot(ARMS, base.exit, k) };
}

/** Пересекаются ли траектории (общая ячейка или выезд на одну и ту же дорогу). */
export function conflicts(a, b) {
  const ma = movement(a.from, a.turn);
  const mb = movement(b.from, b.turn);
  return ma.exit === mb.exit || ma.cells.some((c) => mb.cells.includes(c));
}

/** Положение Y относительно водителя X: 'right' | 'left' | 'opposite'. */
export function relative(x, y) {
  const diff = (ARMS.indexOf(y.from) - ARMS.indexOf(x.from) + 4) % 4;
  return { 1: 'left', 2: 'opposite', 3: 'right' }[diff];
}

const onMain = (car, main) => Boolean(main) && (main === 'ew' ? ['w', 'e'] : ['n', 's']).includes(car.from);

/**
 * Должен ли X уступить Y. Возвращает причину ('main' | 'right' | 'left-turn') или null.
 * mode: 'equal' | 'main' | 'green' (регулируемый, обоим зелёный).
 */
export function yieldReason(x, y, { mode, main = null }) {
  if (mode === 'main') {
    const xm = onMain(x, main);
    const ym = onMain(y, main);
    if (!xm && ym) return 'main';
    if (xm && !ym) return null;
  }
  const rel = relative(x, y);
  if (mode !== 'green' && rel === 'right') return 'right';
  if (rel === 'opposite' && x.turn === 'left' && (y.turn === 'straight' || y.turn === 'right')) return 'left-turn';
  return null;
}

/** Итог для пары автомобилей: 'A' | 'B' | 'both' | null (неоднозначная ситуация). */
export function whoGoesFirst(a, b, opts) {
  if (!conflicts(a, b)) return { first: 'both' };
  const ra = yieldReason(a, b, opts);
  const rb = yieldReason(b, a, opts);
  if (ra && !rb) return { first: 'B', reason: ra };
  if (rb && !ra) return { first: 'A', reason: rb };
  return { first: null };
}

const MOVE = {
  straight: L('едет прямо', 'тура жүреді'),
  right: L('поворачивает направо', 'оңға бұрылады'),
  left: L('поворачивает налево', 'солға бұрылады'),
};

const CAR = {
  A: {
    nom: L('синий автомобиль A', 'көк A автомобилі'),
    dat: L('синему автомобилю A', 'көк A автомобиліне'),
    gen: L('синего автомобиля A', 'көк A автомобилінің'),
    short: L('Синий автомобиль A', 'Көк A автомобилі'),
  },
  B: {
    nom: L('красный автомобиль B', 'қызыл B автомобилі'),
    dat: L('красному автомобилю B', 'қызыл B автомобиліне'),
    gen: L('красного автомобиля B', 'қызыл B автомобилінің'),
    short: L('Красный автомобиль B', 'Қызыл B автомобилі'),
  },
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const both = (fn) => ({ ru: fn('ru'), kk: fn('kk') });

function intersectionQuestion(a, b, opts) {
  const res = whoGoesFirst(a, b, opts);
  if (!res.first) return null;
  const { mode, main } = opts;

  let context;
  if (mode === 'equal') {
    context = L('Перекрёсток равнозначных дорог, светофора и знаков приоритета нет.', 'Тең маңызды жолдардың қиылысы, бағдаршам және басымдық белгілері жоқ.');
  } else if (mode === 'green') {
    context = L('Перекрёсток регулируется светофором, обоим автомобилям горит зелёный сигнал.', 'Қиылыс бағдаршаммен реттеледі, екі автомобильге де жасыл сигнал жанып тұр.');
  } else {
    const road = (car) => (onMain(car, main) ? L('главной', 'басты') : L('второстепенной', 'қосалқы'));
    context = both((l) =>
      l === 'ru'
        ? `Перекрёсток неравнозначных дорог. Синий A находится на ${road(a).ru} дороге, красный B — на ${road(b).ru}.`
        : `Тең емес жолдардың қиылысы. Көк A ${road(a).kk} жолда, қызыл B — ${road(b).kk} жолда.`,
    );
  }
  const text = both((l) =>
    l === 'ru'
      ? `${context.ru} A ${MOVE[a.turn].ru}, B ${MOVE[b.turn].ru}. Кто проедет перекрёсток первым?`
      : `${context.kk} A ${MOVE[a.turn].kk}, B ${MOVE[b.turn].kk}. Қиылыстан кім бірінші өтеді?`,
  );

  let explanation;
  const refs = [];
  if (res.first === 'both') {
    explanation = L(
      'Траектории автомобилей не пересекаются и не сходятся на одной полосе, поэтому уступать дорогу никому не нужно: A и B могут проехать одновременно.',
      'Автомобильдердің жүру жолдары қиылыспайды және бір жолаққа тоғыспайды, сондықтан ешкімге жол берудің қажеті жоқ: A мен B бір мезгілде өте алады.',
    );
    refs.push(mode === 'main' ? 'intersections-4' : 'intersections-5');
  } else {
    const x = res.first === 'A' ? CAR.B : CAR.A; // уступающий
    const y = res.first === 'A' ? CAR.A : CAR.B; // имеющий преимущество
    let prefix = L('', '');
    if (mode === 'main' && onMain(a, main) === onMain(b, main)) {
      prefix = onMain(a, main)
        ? L('Оба автомобиля на главной дороге, поэтому между собой они разъезжаются по правилам равнозначного перекрёстка. ', 'Екі автомобиль де басты жолда, сондықтан өзара тең маңызды қиылыс ережелері бойынша айырылысады. ')
        : L('Оба автомобиля на второстепенной дороге, поэтому между собой они разъезжаются по правилам равнозначного перекрёстка. ', 'Екі автомобиль де қосалқы жолда, сондықтан өзара тең маңызды қиылыс ережелері бойынша айырылысады. ');
    }
    if (res.reason === 'main') {
      explanation = both((l) =>
        l === 'ru'
          ? `${cap(x.nom.ru)} движется по второстепенной дороге и обязан уступить ${y.dat.ru} на главной дороге независимо от направления его движения.`
          : `${cap(x.nom.kk)} қосалқы жолмен келеді және басты жолдағы ${y.dat.kk} оның қозғалыс бағытына қарамастан жол беруге міндетті.`,
      );
      refs.push('intersections-4', 'signs-3');
    } else if (res.reason === 'right') {
      explanation = both((l) =>
        l === 'ru'
          ? `${prefix.ru}${cap(y.nom.ru)} приближается справа от ${x.gen.ru}, поэтому ${x.nom.ru} уступает ему дорогу («помеха справа»).`
          : `${prefix.kk}${cap(y.nom.kk)} ${x.gen.kk} оң жағынан жақындап келеді, сондықтан ${x.nom.kk} оған жол береді («оң жақтан кедергі»).`,
      );
      refs.push('intersections-5');
    } else {
      explanation = both((l) =>
        l === 'ru'
          ? `${prefix.ru}${cap(x.nom.ru)} поворачивает налево и должен уступить ${y.dat.ru}, который движется со встречного направления прямо или направо.`
          : `${prefix.kk}${cap(x.nom.kk)} солға бұрылады және қарсы бағыттан тура немесе оңға жүріп келе жатқан ${y.dat.kk} жол беруге тиіс.`,
      );
      refs.push(mode === 'green' ? 'intersections-3' : 'intersections-5');
      if (mode === 'green') refs.push('signals-1');
    }
  }

  const illustration = { type: 'intersection', cars: [{ ...a, color: 'blue', label: 'A' }, { ...b, color: 'red', label: 'B' }] };
  if (mode === 'green') illustration.light = 'green';
  if (mode === 'main') {
    illustration.main = main;
    illustration.signs = (main === 'ew' ? ['s', 'n'] : ['w', 'e']).map((at) => ({ at, sign: 'give-way' }));
  }

  return {
    id: `g-int-${mode}${main ? '-' + main : ''}-${b.from}-${a.turn}-${b.turn}`,
    topic: 'intersections',
    difficulty: mode === 'equal' ? 2 : 3,
    illustration,
    text,
    options: [
      { id: 'a', text: CAR.A.short },
      { id: 'b', text: CAR.B.short },
      { id: 'c', text: L('Оба одновременно', 'Екеуі бір мезгілде') },
    ],
    correct: { A: 'a', B: 'b', both: 'c' }[res.first],
    explanation,
    refs: [...new Set(refs)],
  };
}

function* intersectionQuestions() {
  const turns = ['straight', 'right', 'left'];
  const modes = [
    { mode: 'equal' },
    { mode: 'main', main: 'ew' }, // A на второстепенной
    { mode: 'main', main: 'ns' }, // A на главной
    { mode: 'green' },
  ];
  for (const opts of modes) {
    const froms = opts.mode === 'green' ? ['n'] : ['w', 'n', 'e'];
    for (const bFrom of froms) {
      for (const aTurn of turns) {
        for (const bTurn of turns) {
          const q = intersectionQuestion({ from: 's', turn: aTurn }, { from: bFrom, turn: bTurn }, opts);
          if (q) yield q;
        }
      }
    }
  }
}

// Поворот и пешеход на регулируемом перекрёстке (зелёный сигнал).
function* pedestrianTurnQuestions() {
  for (const turn of ['straight', 'right', 'left']) {
    for (const arm of ['e', 'w']) {
      const crosses = movement('s', turn).exit === arm;
      yield {
        id: `g-ped-${turn}-${arm}`,
        topic: 'pedestrians',
        difficulty: 2,
        illustration: { type: 'intersection', light: 'green', pedestrian: arm, cars: [{ from: 's', turn, color: 'blue', label: 'A' }] },
        text: both((l) =>
          l === 'ru'
            ? `Горит зелёный сигнал. Синий автомобиль A ${MOVE[turn].ru}, пешеход переходит проезжую часть, как показано на схеме. Как должен поступить водитель A?`
            : `Жасыл сигнал жанып тұр. Көк A автомобилі ${MOVE[turn].kk}, жаяу жүргінші сызбада көрсетілгендей жүру бөлігін кесіп өтіп жатыр. A жүргізушісі қалай әрекет етуі тиіс?`,
        ),
        options: [
          { id: 'a', text: L('Уступить дорогу пешеходу.', 'Жаяу жүргіншіге жол беру.') },
          { id: 'b', text: L('Продолжить движение: пешеход переходит другую дорогу и не мешает его манёвру.', 'Жүруді жалғастыру: жаяу жүргінші басқа жолды кесіп өтіп жатыр және оның маневріне кедергі жасамайды.') },
          { id: 'c', text: L('Подать звуковой сигнал, чтобы пешеход ускорился.', 'Жаяу жүргінші жылдамдауы үшін дыбыстық сигнал беру.') },
        ],
        correct: crosses ? 'a' : 'b',
        explanation: crosses
          ? L(
              'При повороте водитель обязан уступить дорогу пешеходам, пересекающим проезжую часть, на которую он поворачивает, даже при зелёном сигнале.',
              'Бұрылған кезде жүргізуші жасыл сигнал болса да, өзі бұрылатын жүру бөлігін кесіп өтіп жатқан жаяу жүргіншілерге жол беруге міндетті.',
            )
          : L(
              'Траектория автомобиля A не проходит через дорогу, которую переходит пешеход, поэтому A может продолжить движение, оставаясь внимательным. Подавать сигнал, чтобы поторопить пешехода, нельзя.',
              'A автомобилінің жүру жолы жаяу жүргінші кесіп өтіп жатқан жол арқылы өтпейді, сондықтан A мұқият бола отырып жүруді жалғастыра алады. Жаяу жүргіншіні асықтыру үшін сигнал беруге болмайды.',
            ),
        refs: ['intersections-1'],
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Скорость
// ---------------------------------------------------------------------------

const SPEED_CASES = [
  { key: 'town', where: L('в населённом пункте', 'елді мекенде'), limit: 60, ill: { type: 'sign', sign: 'settlement' }, ref: 'speed-2' },
  { key: 'town-40', where: L('в населённом пункте, где установлен знак ограничения максимальной скорости 40 км/ч', 'ең жоғары жылдамдықты сағатына 40 км-ге шектеу белгісі орнатылған елді мекенде'), limit: 40, ill: { type: 'sign', sign: 'speed-limit', value: 40 }, ref: 'signs-4' },
  { key: 'town-50', where: L('в населённом пункте, где установлен знак ограничения максимальной скорости 50 км/ч', 'ең жоғары жылдамдықты сағатына 50 км-ге шектеу белгісі орнатылған елді мекенде'), limit: 50, ill: { type: 'sign', sign: 'speed-limit', value: 50 }, ref: 'signs-4' },
  { key: 'yard', where: L('в жилой зоне', 'тұрғын аймақта'), limit: 20, ill: null, ref: 'speed-2' },
  { key: 'road', where: L('вне населённого пункта по обычной дороге', 'елді мекеннен тыс кәдімгі жолмен'), limit: 110, ill: null, ref: 'speed-3' },
  { key: 'road-70', where: L('вне населённого пункта, где установлен знак ограничения максимальной скорости 70 км/ч', 'ең жоғары жылдамдықты сағатына 70 км-ге шектеу белгісі орнатылған елді мекеннен тыс жерде'), limit: 70, ill: { type: 'sign', sign: 'speed-limit', value: 70 }, ref: 'signs-4' },
  { key: 'road-90', where: L('вне населённого пункта, где установлен знак ограничения максимальной скорости 90 км/ч', 'ең жоғары жылдамдықты сағатына 90 км-ге шектеу белгісі орнатылған елді мекеннен тыс жерде'), limit: 90, ill: { type: 'sign', sign: 'speed-limit', value: 90 }, ref: 'signs-4' },
  { key: 'motorway', where: L('по автомагистрали', 'автомагистральмен'), limit: 140, ill: null, ref: 'speed-3' },
];
const SPEED_VALUES = [20, 40, 50, 60, 70, 80, 90, 110, 120, 140];

function speedOptions(limit) {
  // Правильный ответ + три ближайших значения, по возрастанию.
  const near = SPEED_VALUES.filter((v) => v !== limit).sort((x, y) => Math.abs(x - limit) - Math.abs(y - limit) || x - y).slice(0, 3);
  return [limit, ...near].sort((x, y) => x - y);
}

function* speedQuestions() {
  for (const c of SPEED_CASES) {
    const values = speedOptions(c.limit);
    const options = values.map((v, i) => ({ id: 'abcd'[i], text: L(`${v} км/ч`, `Сағатына ${v} км`) }));
    const signNote = c.ill?.sign === 'speed-limit';
    yield {
      id: `g-speed-${c.key}`,
      topic: 'speed',
      difficulty: 1,
      illustration: c.ill,
      text: both((l) =>
        l === 'ru'
          ? `С какой максимальной скоростью разрешено двигаться легковому автомобилю ${c.where.ru}?`
          : `Жеңіл автомобильге ${c.where.kk} ең жоғары қандай жылдамдықпен жүруге рұқсат етіледі?`,
      ),
      options,
      correct: options[values.indexOf(c.limit)].id,
      explanation: signNote
        ? L(
            `Знак ограничения максимальной скорости запрещает движение со скоростью выше указанной на нём: здесь не более ${c.limit} км/ч.`,
            `Ең жоғары жылдамдықты шектеу белгісі онда көрсетілгеннен жоғары жылдамдықпен жүруге тыйым салады: мұнда сағатына ${c.limit} км-ден аспайды.`,
          )
        : L(
            `Если знаками не установлено иное, легковому автомобилю ${c.where.ru} разрешено не более ${c.limit} км/ч.`,
            `Егер белгілермен өзгеше белгіленбесе, жеңіл автомобильге ${c.where.kk} сағатына ${c.limit} км-ден аспайтын жылдамдыққа рұқсат етіледі.`,
          ),
      refs: [c.ref],
    };
  }
}

// ---------------------------------------------------------------------------
// Дорожные знаки
// ---------------------------------------------------------------------------

export const SIGN_GROUPS = {
  warning: L('Предупреждающие знаки', 'Ескерту белгілері'),
  priority: L('Знаки приоритета', 'Басымдық белгілері'),
  prohibitory: L('Запрещающие знаки', 'Тыйым салу белгілері'),
  mandatory: L('Предписывающие знаки', 'Нұсқама белгілері'),
  info: L('Информационно-указательные знаки', 'Ақпараттық-нұсқағыш белгілер'),
};

export const SIGN_CATALOG = [
  { kind: 'children', group: 'warning', name: L('«Дети»', '«Балалар»'), ref: 'signs-2' },
  { kind: 'equal-crossing', group: 'warning', name: L('«Пересечение равнозначных дорог»', '«Тең маңызды жолдардың қиылысуы»'), ref: 'signs-2' },
  { kind: 'lights-ahead', group: 'warning', name: L('«Светофорное регулирование»', '«Бағдаршаммен реттеу»'), ref: 'signs-2' },
  { kind: 'priority-road', group: 'priority', name: L('«Главная дорога»', '«Басты жол»'), ref: 'signs-3' },
  { kind: 'end-priority', group: 'priority', name: L('«Конец главной дороги»', '«Басты жолдың соңы»'), ref: 'signs-3' },
  { kind: 'give-way', group: 'priority', name: L('«Уступите дорогу»', '«Жол беріңіз»'), ref: 'signs-3' },
  { kind: 'stop', group: 'priority', name: L('«Движение без остановки запрещено»', '«Тоқтамай жүруге тыйым салынады»'), ref: 'signs-3' },
  { kind: 'oncoming-priority', group: 'priority', name: L('«Преимущество встречного движения»', '«Қарсы қозғалыстың басымдығы»'), ref: 'signs-3' },
  { kind: 'over-oncoming', group: 'priority', name: L('«Преимущество перед встречным движением»', '«Қарсы қозғалыс алдындағы басымдық»'), ref: 'signs-3' },
  { kind: 'no-entry', group: 'prohibitory', name: L('«Въезд запрещён»', '«Кіруге тыйым салынады»'), ref: 'signs-4' },
  { kind: 'no-overtaking', group: 'prohibitory', name: L('«Обгон запрещён»', '«Басып озуға тыйым салынады»'), ref: 'signs-4' },
  { kind: 'speed-limit', value: 40, group: 'prohibitory', name: L('«Ограничение максимальной скорости»', '«Ең жоғары жылдамдықты шектеу»'), ref: 'signs-4' },
  { kind: 'no-stopping', group: 'prohibitory', name: L('«Остановка запрещена»', '«Тоқтауға тыйым салынады»'), ref: 'signs-4' },
  { kind: 'no-parking', group: 'prohibitory', name: L('«Стоянка запрещена»', '«Тұраққа тыйым салынады»'), ref: 'signs-4' },
  { kind: 'straight-only', group: 'mandatory', name: L('«Движение прямо»', '«Тура жүру»'), ref: 'signs-5' },
  { kind: 'right-only', group: 'mandatory', name: L('«Движение направо»', '«Оңға жүру»'), ref: 'signs-5' },
  { kind: 'crosswalk', group: 'info', name: L('«Пешеходный переход»', '«Жаяу жүргіншілер өткелі»'), ref: 'signs-5' },
  { kind: 'one-way', group: 'info', name: L('«Дорога с односторонним движением»', '«Бір жақты қозғалысы бар жол»'), ref: 'signs-5' },
  { kind: 'parking', group: 'info', name: L('«Место стоянки»', '«Тұрақ орны»'), ref: 'signs-5' },
  { kind: 'settlement', group: 'info', name: L('«Начало населённого пункта»', '«Елді мекеннің басталуы»'), ref: 'signs-5' },
];

function pickOthers(list, index, count) {
  // Детерминированный выбор «соседей» по кругу: вначале из той же группы.
  const self = list[index];
  const same = list.filter((s, i) => i !== index && s.group === self.group);
  const other = list.filter((s) => s.group !== self.group);
  const out = [];
  for (let i = 0; out.length < count && i < same.length; i++) out.push(same[(index + i) % same.length]);
  for (let i = 0; out.length < count; i++) out.push(other[(index * 3 + i) % other.length]);
  return out;
}

function* signQuestions() {
  for (const [index, sign] of SIGN_CATALOG.entries()) {
    // Позиция правильного ответа меняется от знака к знаку.
    const others = pickOthers(SIGN_CATALOG, index, 3);
    const pos = index % 4;
    const ordered = [...others];
    ordered.splice(pos, 0, sign);
    const ill = { type: 'sign', sign: sign.kind, ...(sign.value ? { value: sign.value } : {}) };
    yield {
      id: `g-sign-name-${sign.kind}`,
      topic: 'signs',
      difficulty: 1,
      illustration: ill,
      text: L('Как называется этот знак?', 'Бұл белгі қалай аталады?'),
      options: ordered.map((s, i) => ({ id: 'abcd'[i], text: s.name })),
      correct: 'abcd'[pos],
      explanation: both((l) =>
        l === 'ru'
          ? `Это знак ${sign.name.ru}. Он относится к группе «${SIGN_GROUPS[sign.group].ru}».`
          : `Бұл ${sign.name.kk} белгісі. Ол «${SIGN_GROUPS[sign.group].kk}» тобына жатады.`,
      ),
      refs: [...new Set(['signs-1', sign.ref])],
    };

    const groupKeys = Object.keys(SIGN_GROUPS);
    const wrong = groupKeys.filter((g) => g !== sign.group);
    const groupOpts = [sign.group, ...wrong.slice(0, 3)].sort((x, y) => groupKeys.indexOf(x) - groupKeys.indexOf(y));
    yield {
      id: `g-sign-group-${sign.kind}`,
      topic: 'signs',
      difficulty: 2,
      illustration: ill,
      text: L('К какой группе относится этот знак?', 'Бұл белгі қай топқа жатады?'),
      options: groupOpts.map((g, i) => ({ id: 'abcd'[i], text: SIGN_GROUPS[g] })),
      correct: 'abcd'[groupOpts.indexOf(sign.group)],
      explanation: both((l) =>
        l === 'ru'
          ? `Знак ${sign.name.ru} относится к группе «${SIGN_GROUPS[sign.group].ru}». Группу можно узнать по форме и цвету знака.`
          : `${sign.name.kk} белгісі «${SIGN_GROUPS[sign.group].kk}» тобына жатады. Топты белгінің пішіні мен түсі бойынша тануға болады.`,
      ),
      refs: ['signs-1', sign.ref],
    };
  }
}

// ---------------------------------------------------------------------------
// Светофор
// ---------------------------------------------------------------------------

const LIGHT_OPTIONS = {
  yes: L('Да, разрешено.', 'Иә, рұқсат етіледі.'),
  no: L('Нет, запрещено.', 'Жоқ, тыйым салынады.'),
  arrow: L('Только в направлении стрелки, уступив дорогу транспорту с других направлений.', 'Тек бағдарше бағытында, басқа бағыттардан келе жатқан көлікке жол беріп.'),
  unregulated: L('Да, руководствуясь правилами проезда нерегулируемых перекрёстков и знаками приоритета.', 'Иә, реттелмейтін қиылыстардан өту ережелерін және басымдық белгілерін басшылыққа ала отырып.'),
};

const LIGHT_CASES = [
  { state: 'red', answer: 'no', ref: 'signals-4', why: L('Красный сигнал запрещает движение.', 'Қызыл сигнал қозғалысқа тыйым салады.') },
  { state: 'yellow', answer: 'no', ref: 'signals-2', why: L('Жёлтый сигнал запрещает движение; продолжить движение можно только тому, кто не может остановиться без экстренного торможения, а начинать движение нельзя.', 'Сары сигнал қозғалысқа тыйым салады; шұғыл тежеусіз тоқтай алмайтын жүргізуші ғана жүруді жалғастыра алады, ал қозғалысты бастауға болмайды.') },
  { state: 'red-yellow', answer: 'no', ref: 'signals-4', why: L('Красный с жёлтым — запрещающий сигнал: он лишь предупреждает, что скоро включится зелёный.', 'Қызыл мен сары — тыйым салатын сигнал: ол тек жақында жасыл қосылатынын ескертеді.') },
  { state: 'green', answer: 'yes', ref: 'signals-1', why: L('Зелёный сигнал разрешает движение.', 'Жасыл сигнал қозғалысқа рұқсат береді.') },
  { state: 'green-flash', answer: 'yes', ref: 'signals-1', why: L('Мигающий зелёный разрешает движение и предупреждает, что скоро включится запрещающий сигнал.', 'Жыпылықтайтын жасыл қозғалысқа рұқсат береді және көп ұзамай тыйым салатын сигнал қосылатынын ескертеді.') },
  { state: 'yellow-flash', answer: 'unregulated', ref: 'signals-3', why: L('Мигающий жёлтый разрешает движение: перекрёсток считается нерегулируемым, очерёдность определяют знаки приоритета и правила проезда.', 'Жыпылықтайтын сары қозғалысқа рұқсат береді: қиылыс реттелмейтін болып саналады, кезектілікті басымдық белгілері мен өту ережелері анықтайды.') },
  { state: 'red-arrow-right', answer: 'arrow', ref: 'signals-5', why: L('Зелёная стрелка в дополнительной секции разрешает движение только в своём направлении, и при этом нужно уступить дорогу транспорту с других направлений.', 'Қосымша секциядағы жасыл бағдарше тек өз бағытында қозғалуға рұқсат береді, бұл ретте басқа бағыттардан келе жатқан көлікке жол беру керек.') },
];

function* lightQuestions() {
  const keys = ['yes', 'no', 'arrow', 'unregulated'];
  for (const c of LIGHT_CASES) {
    yield {
      id: `g-light-${c.state}`,
      topic: 'signals',
      difficulty: c.state === 'yellow' || c.state === 'yellow-flash' ? 2 : 1,
      illustration: { type: 'light', state: c.state },
      text: L('Разрешено ли водителю начать движение через перекрёсток при таком сигнале светофора?', 'Бағдаршамның осындай сигналында жүргізушіге қиылыс арқылы қозғалысты бастауға рұқсат етіле ме?'),
      options: keys.map((k, i) => ({ id: 'abcd'[i], text: LIGHT_OPTIONS[k] })),
      correct: 'abcd'[keys.indexOf(c.answer)],
      explanation: c.why,
      refs: [c.ref],
    };
  }
}

// ---------------------------------------------------------------------------
// Остановка: расстояния до перехода и остановки маршрутных ТС
// ---------------------------------------------------------------------------

function* stoppingQuestions() {
  const objects = [
    { object: 'crosswalk', min: 5, distances: [2, 3, 4, 6, 8, 12], where: L('перед пешеходным переходом', 'жаяу жүргіншілер өткелінің алдында') },
    { object: 'bus-stop', min: 15, distances: [6, 10, 12, 14, 18, 22], where: L('перед остановочной площадкой автобуса', 'автобус аялдамасы алаңының алдында') },
  ];
  for (const o of objects) {
    for (const d of o.distances) {
      const allowed = d >= o.min;
      yield {
        id: `g-stop-${o.object}-${d}`,
        topic: 'stopping',
        difficulty: 1,
        illustration: { type: 'stop', object: o.object, distance: d },
        text: both((l) =>
          l === 'ru'
            ? `Водитель остановился в ${d} м ${o.where.ru}. Разрешена ли такая остановка?`
            : `Жүргізуші ${o.where.kk} ${d} м жерде тоқтады. Мұндай тоқтауға рұқсат етіле ме?`,
        ),
        options: [
          { id: 'a', text: L('Разрешена.', 'Рұқсат етіледі.') },
          { id: 'b', text: L('Запрещена: слишком близко.', 'Тыйым салынады: тым жақын.') },
          { id: 'c', text: L('Разрешена только с включённой аварийной сигнализацией.', 'Тек авариялық дабыл қосулы болғанда рұқсат етіледі.') },
        ],
        correct: allowed ? 'a' : 'b',
        explanation: both((l) =>
          l === 'ru'
            ? `Остановка запрещена ближе ${o.min} м ${o.object === 'crosswalk' ? 'перед пешеходным переходом' : 'от остановочной площадки маршрутных транспортных средств'}. ${d} м ${allowed ? 'не меньше' : 'меньше'} ${o.min} м, поэтому остановка ${allowed ? 'разрешена' : 'запрещена'}. Аварийная сигнализация не делает запрещённую остановку разрешённой.`
            : `${o.object === 'crosswalk' ? 'Жаяу жүргіншілер өткелінің алдында' : 'Бағыттағы көлік құралдарының аялдама алаңынан'} ${o.min} м-ден жақын тоқтауға тыйым салынады. ${d} м ${allowed ? `${o.min} м-ден кем емес` : `${o.min} м-ден аз`}, сондықтан тоқтауға ${allowed ? 'рұқсат етіледі' : 'тыйым салынады'}. Авариялық дабыл тыйым салынған тоқтауды рұқсат етілгенге айналдырмайды.`,
        ),
        refs: ['stopping-3'],
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Знак аварийной остановки
// ---------------------------------------------------------------------------

function* triangleQuestions() {
  const areas = [
    { area: 'inside', min: 15, where: L('в населённом пункте', 'елді мекенде') },
    { area: 'outside', min: 30, where: L('вне населённого пункта', 'елді мекеннен тыс жерде') },
  ];
  for (const a of areas) {
    for (const d of [8, 12, 20, 25, 35, 40]) {
      const ok = d >= a.min;
      yield {
        id: `g-triangle-${a.area}-${d}`,
        topic: 'driver',
        difficulty: 1,
        illustration: { type: 'triangle', area: a.area, distance: d, exact: true },
        text: both((l) =>
          l === 'ru'
            ? `Автомобиль вынужденно остановился ${a.where.ru}. Водитель выставил знак аварийной остановки в ${d} м от автомобиля. Достаточно ли этого расстояния?`
            : `Автомобиль ${a.where.kk} мәжбүрлі тоқтады. Жүргізуші авариялық тоқтау белгісін автомобильден ${d} м жерге қойды. Бұл қашықтық жеткілікті ме?`,
        ),
        options: [
          { id: 'a', text: L('Достаточно.', 'Жеткілікті.') },
          { id: 'b', text: L('Недостаточно: нужно не менее 15 м.', 'Жеткіліксіз: кемінде 15 м қажет.') },
          { id: 'c', text: L('Недостаточно: нужно не менее 30 м.', 'Жеткіліксіз: кемінде 30 м қажет.') },
        ],
        correct: ok ? 'a' : a.min === 15 ? 'b' : 'c',
        explanation: both((l) =>
          l === 'ru'
            ? `Знак аварийной остановки выставляют не ближе 15 м от автомобиля в населённом пункте и не ближе 30 м вне населённого пункта. Здесь требуется не менее ${a.min} м, а выставлено ${d} м.`
            : `Авариялық тоқтау белгісі елді мекенде автомобильден кемінде 15 м, елді мекеннен тыс жерде кемінде 30 м қашықтықта қойылады. Мұнда кемінде ${a.min} м қажет, ал ${d} м жерге қойылған.`,
        ),
        refs: ['safety-2'],
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Перевозка детей
// ---------------------------------------------------------------------------

function* childQuestions() {
  const seats = [
    { seat: 'front', where: L('на переднем сиденье', 'алдыңғы орындықта') },
    { seat: 'rear', where: L('на заднем сиденье', 'артқы орындықта') },
  ];
  for (const s of seats) {
    for (const age of [3, 6, 9, 11, 13, 15]) {
      const answer = age >= 12 ? 'c' : s.seat === 'front' ? 'a' : 'b';
      yield {
        id: `g-child-${s.seat}-${age}`,
        topic: 'passengers',
        difficulty: 2,
        illustration: null,
        text: both((l) =>
          l === 'ru'
            ? `Как допускается перевозить ребёнка ${age} лет ${s.where.ru} легкового автомобиля, оборудованного ремнями безопасности?`
            : `Қауіпсіздік белдіктерімен жабдықталған жеңіл автомобильдің ${s.where.kk} ${age} жастағы баланы қалай тасымалдауға рұқсат етіледі?`,
        ),
        options: [
          { id: 'a', text: L('Только в детском удерживающем устройстве.', 'Тек балаларды ұстап тұратын құрылғыда.') },
          { id: 'b', text: L('В детском удерживающем устройстве или с иными средствами, позволяющими пристегнуть ребёнка штатным ремнём.', 'Балаларды ұстап тұратын құрылғыда немесе баланы штаттық белдікпен байлауға мүмкіндік беретін өзге құралдармен.') },
          { id: 'c', text: L('Пристегнув штатным ремнём безопасности, как взрослого пассажира.', 'Ересек жолаушы сияқты штаттық қауіпсіздік белдігімен байлап.') },
        ],
        correct: answer,
        explanation:
          age >= 12
            ? L('Требования о детских удерживающих устройствах касаются детей до 12 лет. Ребёнок старше 12 лет пристёгивается штатным ремнём безопасности.', 'Балаларды ұстап тұратын құрылғылар туралы талаптар 12 жасқа дейінгі балаларға қатысты. 12 жастан асқан бала штаттық қауіпсіздік белдігімен байланады.')
            : s.seat === 'front'
              ? L('На переднем сиденье детей до 12 лет перевозят только в детском удерживающем устройстве.', 'Алдыңғы орындықта 12 жасқа дейінгі балалар тек балаларды ұстап тұратын құрылғыда тасымалданады.')
              : L('На заднем сиденье детей до 12 лет перевозят в детском удерживающем устройстве или с иными средствами, позволяющими пристегнуть их штатными ремнями.', 'Артқы орындықта 12 жасқа дейінгі балалар ұстап тұратын құрылғыда немесе оларды штаттық белдіктермен байлауға мүмкіндік беретін өзге құралдармен тасымалданады.'),
        refs: ['passengers-2'],
      };
    }
  }
}

// ---------------------------------------------------------------------------

const GENERATORS = [intersectionQuestions, pedestrianTurnQuestions, speedQuestions, signQuestions, lightQuestions, stoppingQuestions, triangleQuestions, childQuestions];

/** Все сгенерированные вопросы (детерминированно, в одном и том же порядке). */
export function generateQuestions() {
  const out = [];
  for (const gen of GENERATORS) for (const q of gen()) out.push({ ...q, generated: true });
  return out;
}
