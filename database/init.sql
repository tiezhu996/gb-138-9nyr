CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_metadata (key, value)
VALUES ('project', 'gb-138')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

-- 心理支持自测档案：同一个人同一天只保留一条，重复提交以最后一次为准；
-- 更早日期的记录保留在档案里，供随时翻阅、对比变化。
CREATE TABLE IF NOT EXISTS assessment_records (
  id BIGSERIAL PRIMARY KEY,
  person_name TEXT NOT NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  answers JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  level TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT NOT NULL,
  suggestions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT assessment_records_person_day UNIQUE (person_name, assessment_date)
);
