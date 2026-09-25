const { Pool } = require('pg');
const config = require('./config');
const logger = require('./logger');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 5,
});

pool.on('error', (err) => {
  logger.error('PostgreSQL 连接池出现空闲连接错误', err.message);
});

// 自测档案表：同一个人同一天只保留一条（唯一约束），重复提交走 UPSERT 覆盖；
// 更早日期的记录不受影响，档案可以一直往前翻。
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS assessment_records (
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
  )`,
];

const ensureSchema = async () => {
  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
};

// 启动时数据库可能还没就绪（比如本地开发没走 compose 健康检查），重试几次再放弃。
const waitForDatabase = async (attempts = 15, delayMs = 2000) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await ensureSchema();
      logger.info('数据库就绪，自测档案表已确认');
      return;
    } catch (err) {
      logger.info(`等待数据库就绪（第 ${attempt}/${attempts} 次）：${err.message}`);
      if (attempt === attempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

module.exports = {
  pool,
  ensureSchema,
  waitForDatabase,
};
