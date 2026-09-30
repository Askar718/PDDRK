-- Схема базы данных учебной платформы по ПДД РК.
-- Совместима с PostgreSQL 13+ и SQLite 3.35+ (без специфичных расширений).
-- Контент хранится отдельно от переводов: одна запись сущности + N строк
-- переводов (по одной на язык). Добавление нового языка не требует
-- изменения схемы.

-- ---------------------------------------------------------------------------
-- Справочники
-- ---------------------------------------------------------------------------

CREATE TABLE languages (
    code        VARCHAR(8)   PRIMARY KEY,           -- 'ru', 'kk'
    name        VARCHAR(64)  NOT NULL,              -- 'Русский', 'Қазақша'
    short_label VARCHAR(8)   NOT NULL,              -- 'RU', 'ҚАЗ'
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE
);

-- Нормативные акты, на которые ссылаются правила и вопросы.
CREATE TABLE legal_sources (
    id          VARCHAR(32)  PRIMARY KEY,           -- 'pdd-534'
    code        VARCHAR(64),                        -- 'V2300033003' (номер в ИПС «Әділет»)
    adopted_on  DATE,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE legal_source_translations (
    source_id   VARCHAR(32)  NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
    lang        VARCHAR(8)   NOT NULL REFERENCES languages(code),
    title       TEXT         NOT NULL,
    url         TEXT,
    PRIMARY KEY (source_id, lang)
);

-- ---------------------------------------------------------------------------
-- Темы (категории правил и вопросов)
-- ---------------------------------------------------------------------------

CREATE TABLE topics (
    id          VARCHAR(32)  PRIMARY KEY,           -- 'intersections'
    sort_order  INTEGER      NOT NULL,
    icon        VARCHAR(32)
);

CREATE TABLE topic_translations (
    topic_id    VARCHAR(32)  NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    lang        VARCHAR(8)   NOT NULL REFERENCES languages(code),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    PRIMARY KEY (topic_id, lang)
);

-- ---------------------------------------------------------------------------
-- Правила: раздел → пункты
-- ---------------------------------------------------------------------------

CREATE TABLE rule_sections (
    id          VARCHAR(32)  PRIMARY KEY,           -- 'speed'
    topic_id    VARCHAR(32)  NOT NULL REFERENCES topics(id),
    source_id   VARCHAR(32)  NOT NULL REFERENCES legal_sources(id),
    sort_order  INTEGER      NOT NULL
);

CREATE TABLE rule_section_translations (
    section_id  VARCHAR(32)  NOT NULL REFERENCES rule_sections(id) ON DELETE CASCADE,
    lang        VARCHAR(8)   NOT NULL REFERENCES languages(code),
    title       VARCHAR(255) NOT NULL,
    reference   TEXT         NOT NULL,              -- 'ПДД РК, раздел 10 «Скорость движения»'
    PRIMARY KEY (section_id, lang)
);

-- Пункт правил в учебном (пересказанном) изложении.
-- clause_number заполняется после сверки с официальной редакцией;
-- is_verified = TRUE означает, что номер и формулировка сверены с «Әділет».
CREATE TABLE rule_items (
    id            VARCHAR(48) PRIMARY KEY,          -- 'speed-2'
    section_id    VARCHAR(32) NOT NULL REFERENCES rule_sections(id) ON DELETE CASCADE,
    sort_order    INTEGER     NOT NULL,
    clause_number VARCHAR(32),                      -- например '10.2'
    is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
    verified_on   DATE
);

CREATE TABLE rule_item_translations (
    item_id     VARCHAR(48)  NOT NULL REFERENCES rule_items(id) ON DELETE CASCADE,
    lang        VARCHAR(8)   NOT NULL REFERENCES languages(code),
    body        TEXT         NOT NULL,
    PRIMARY KEY (item_id, lang)
);

-- ---------------------------------------------------------------------------
-- Иллюстрации (оригинальные SVG, генерируются по параметрам)
-- ---------------------------------------------------------------------------

CREATE TABLE illustrations (
    id          VARCHAR(48)  PRIMARY KEY,
    kind        VARCHAR(32)  NOT NULL,              -- 'sign' | 'light' | 'intersection' | 'road' | 'stop' | 'crosswalk' | 'triangle'
    params_json TEXT         NOT NULL               -- параметры сцены в JSON
);

-- ---------------------------------------------------------------------------
-- Тестовые вопросы
-- ---------------------------------------------------------------------------

CREATE TABLE questions (
    id              VARCHAR(16)  PRIMARY KEY,       -- 'q001'
    topic_id        VARCHAR(32)  NOT NULL REFERENCES topics(id),
    illustration_id VARCHAR(48)  REFERENCES illustrations(id),
    difficulty      SMALLINT     NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
    is_published    BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Учебный вопрос платформы. Не является официальной экзаменационной базой.
    is_official     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_translations (
    question_id VARCHAR(16)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    lang        VARCHAR(8)   NOT NULL REFERENCES languages(code),
    body        TEXT         NOT NULL,              -- текст вопроса
    explanation TEXT         NOT NULL,              -- пояснение к правильному ответу
    PRIMARY KEY (question_id, lang)
);

CREATE TABLE answer_options (
    id          VARCHAR(24)  PRIMARY KEY,           -- 'q001-a'
    question_id VARCHAR(16)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label       VARCHAR(4)   NOT NULL,              -- 'a', 'b', 'c'
    sort_order  INTEGER      NOT NULL,
    is_correct  BOOLEAN      NOT NULL DEFAULT FALSE,
    UNIQUE (question_id, label)
);

CREATE TABLE answer_option_translations (
    option_id   VARCHAR(24)  NOT NULL REFERENCES answer_options(id) ON DELETE CASCADE,
    lang        VARCHAR(8)   NOT NULL REFERENCES languages(code),
    body        TEXT         NOT NULL,
    PRIMARY KEY (option_id, lang)
);

-- Связь вопроса с пунктами правил (ссылка «на соответствующий пункт ПДД»).
CREATE TABLE question_rule_refs (
    question_id VARCHAR(16)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    item_id     VARCHAR(48)  NOT NULL REFERENCES rule_items(id),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    PRIMARY KEY (question_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Прогресс пользователей (для серверной версии; фронтенд хранит то же
-- самое в localStorage в формате js/store.js)
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id          VARCHAR(36)  PRIMARY KEY,           -- UUID
    lang        VARCHAR(8)   REFERENCES languages(code),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_sessions (
    id            VARCHAR(36) PRIMARY KEY,
    user_id       VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode          VARCHAR(16) NOT NULL CHECK (mode IN ('exam', 'topic', 'marathon', 'mistakes', 'favorites')),
    topic_id      VARCHAR(32) REFERENCES topics(id),
    started_at    TIMESTAMP   NOT NULL,
    finished_at   TIMESTAMP,
    total         INTEGER     NOT NULL,
    correct       INTEGER     NOT NULL DEFAULT 0,
    passed        BOOLEAN
);

CREATE TABLE test_answers (
    session_id  VARCHAR(36)  NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(16)  NOT NULL REFERENCES questions(id),
    option_id   VARCHAR(24)  REFERENCES answer_options(id),  -- NULL = нет ответа
    is_correct  BOOLEAN      NOT NULL,
    answered_at TIMESTAMP    NOT NULL,
    PRIMARY KEY (session_id, question_id)
);

CREATE TABLE favorite_questions (
    user_id     VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(16)  NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, question_id)
);

CREATE TABLE favorite_rule_sections (
    user_id     VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id  VARCHAR(32)  NOT NULL REFERENCES rule_sections(id) ON DELETE CASCADE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, section_id)
);

CREATE INDEX idx_questions_topic       ON questions(topic_id);
CREATE INDEX idx_rule_items_section    ON rule_items(section_id);
CREATE INDEX idx_answer_options_q      ON answer_options(question_id);
CREATE INDEX idx_test_sessions_user    ON test_sessions(user_id, started_at);
CREATE INDEX idx_test_answers_question ON test_answers(question_id);
