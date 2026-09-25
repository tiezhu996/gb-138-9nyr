CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_metadata (key, value)
VALUES ('project', 'gb-138')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

-- 心理自测档案：每次完整提交都保留，同一个人同一天以最新一条为准
-- （查询按 created_at DESC, id DESC 排序）。
CREATE TABLE IF NOT EXISTS assessment_records (
  id SERIAL PRIMARY KEY,
  person_name VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assessment_date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessment_records_person
  ON assessment_records (person_name, created_at DESC, id DESC);
