const { Pool } = require('pg');
const config = require('./config');
const logger = require('./logger');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 10,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected idle database client error', err.message);
});

// 心理自测档案：所有提交都保留；同一个人同一天以最新一条为准
// （按 created_at DESC, id DESC 排序，查询"上次"记录时排除当天）。
const SCHEMA_SQL = `
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
`;

const initDatabase = async (retries = 30, delayMs = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query(SCHEMA_SQL);
      logger.info('Database schema ready');
      return;
    } catch (err) {
      logger.error(
        `Database init failed (attempt ${attempt}/${retries}): ${err.message}`,
      );
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const insertRecord = async ({ personName, score, maxScore, answers }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO assessment_records
         (person_name, score, max_score, answers, assessment_date)
       VALUES ($1, $2, $3, $4::jsonb, CURRENT_DATE)
       RETURNING id, person_name, score, max_score, answers, created_at, assessment_date`,
      [personName, score, maxScore, JSON.stringify(answers)],
    );
    const previous = await client.query(
      `SELECT id, score, created_at, assessment_date
         FROM assessment_records
        WHERE person_name = $1 AND id <> $2
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [personName, inserted.rows[0].id],
    );
    await client.query('COMMIT');
    return { record: inserted.rows[0], previous: previous.rows[0] || null };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const listRecords = async (personName) => {
  const result = await pool.query(
    `SELECT id, person_name, score, max_score, answers, created_at, assessment_date
       FROM assessment_records
      WHERE person_name = $1
      ORDER BY created_at DESC, id DESC`,
    [personName],
  );
  return result.rows;
};

module.exports = {
  pool,
  initDatabase,
  insertRecord,
  listRecords,
};
