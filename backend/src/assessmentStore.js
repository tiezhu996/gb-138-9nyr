const { pool } = require('./db');

// 日期在 SQL 里直接格式化成 YYYY-MM-DD 文本，避免驱动时区换算把日期弄偏。
const RECORD_COLUMNS = `
  id,
  person_name,
  to_char(assessment_date, 'YYYY-MM-DD') AS date,
  answers,
  total_score,
  level,
  color,
  description,
  suggestions,
  created_at,
  updated_at`;

// 以应用服务器的本地日期为准：一天内多次提交只保留最后一次。
const todayString = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// 写入在同一个事务里完成：先查今天是否已有记录，再 upsert。
// 事务保证要么整条档案写好、要么什么都不留，出错时档案里不会多出半条记录。
const UPSERT_SQL = `
  INSERT INTO assessment_records
    (person_name, assessment_date, answers, total_score, level, color, description, suggestions)
  VALUES ($1, $2::date, $3::jsonb, $4, $5, $6, $7, $8::jsonb)
  ON CONFLICT (person_name, assessment_date)
  DO UPDATE SET
    answers = EXCLUDED.answers,
    total_score = EXCLUDED.total_score,
    level = EXCLUDED.level,
    color = EXCLUDED.color,
    description = EXCLUDED.description,
    suggestions = EXCLUDED.suggestions,
    updated_at = now()
  RETURNING ${RECORD_COLUMNS}`;

const EXISTS_TODAY_SQL = `
  SELECT 1 FROM assessment_records
  WHERE person_name = $1 AND assessment_date = $2::date
  LIMIT 1`;

const PREVIOUS_SQL = `
  SELECT to_char(assessment_date, 'YYYY-MM-DD') AS date, total_score, level
  FROM assessment_records
  WHERE person_name = $1 AND assessment_date < $2::date
  ORDER BY assessment_date DESC
  LIMIT 1`;

const LIST_SQL = `
  SELECT ${RECORD_COLUMNS}
  FROM assessment_records
  WHERE person_name = $1
  ORDER BY assessment_date DESC, id DESC`;

const mapRecord = (row) => ({
  id: Number(row.id),
  name: row.person_name,
  date: row.date,
  answers: row.answers,
  totalScore: row.total_score,
  level: row.level,
  color: row.color,
  description: row.description,
  suggestions: row.suggestions,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const saveAssessment = async ({ name, answers, result }) => {
  const date = todayString();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(EXISTS_TODAY_SQL, [name, date]);
    const { rows } = await client.query(UPSERT_SQL, [
      name,
      date,
      JSON.stringify(answers),
      result.totalScore,
      result.level,
      result.color,
      result.description,
      JSON.stringify(result.suggestions),
    ]);
    await client.query('COMMIT');
    return { record: mapRecord(rows[0]), replaced: existing.rowCount > 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// 找到比指定日期更早的最近一条记录，用于"看变化时跟更早的那条比"。
const findPrevious = async (name, date) => {
  const { rows } = await pool.query(PREVIOUS_SQL, [name, date]);
  if (rows.length === 0) {
    return null;
  }
  return {
    date: rows[0].date,
    totalScore: rows[0].total_score,
    level: rows[0].level,
  };
};

const listAssessments = async (name) => {
  const { rows } = await pool.query(LIST_SQL, [name]);
  return rows.map(mapRecord);
};

module.exports = {
  saveAssessment,
  findPrevious,
  listAssessments,
};
