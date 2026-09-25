const config = require('./config');
const { project, messages } = require('./constants');
const { sendJson } = require('./response');
const { QUESTIONS, MAX_SCORE, interpret } = require('./assessment');
const db = require('./db');
const logger = require('./logger');

const readBody = (req, limitBytes = 16 * 1024) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const validateName = (raw) => {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (name.length === 0 || name.length > 50) return null;
  return name;
};

// 返回 { answers: {questionId: optionValue}, score }；缺题、非法选项一律拒绝，
// 这样任何不完整的提交都不可能进入数据库。
const validateAnswers = (raw) => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const answers = {};
  for (const question of QUESTIONS) {
    const value = raw[String(question.id)];
    if (!Number.isInteger(value)) return null;
    const allowed = question.options.some((option) => option.value === value);
    if (!allowed) return null;
    answers[question.id] = value;
  }
  if (Object.keys(raw).length !== QUESTIONS.length) return null;

  const score = QUESTIONS.reduce((sum, question) => sum + answers[question.id], 0);
  return { answers, score };
};

const serializeRecord = (row) => ({
  id: row.id,
  personName: row.person_name,
  score: row.score,
  maxScore: row.max_score,
  answers: row.answers,
  createdAt: row.created_at.toISOString(),
  assessmentDate:
    row.assessment_date instanceof Date
      ? row.assessment_date.toISOString().slice(0, 10)
      : String(row.assessment_date).slice(0, 10),
});

const withResult = (record, previous) => {
  const result = interpret(record.score);
  return {
    record: serializeRecord(record),
    result,
    previous: previous
      ? { id: previous.id, score: previous.score, createdAt: previous.created_at.toISOString() }
      : null,
  };
};

const handleAssessmentRecords = async (req, res, url) => {
  const name = validateName(url.searchParams.get('name'));
  if (!name) {
    sendJson(res, 400, { error: '请填写有效的姓名后再查看档案' });
    return;
  }
  const rows = await db.listRecords(name);
  sendJson(res, 200, {
    records: rows.map(serializeRecord),
    interpretations: Object.fromEntries(
      rows.map((row) => [row.id, interpret(row.score).level]),
    ),
  });
};

const handleAssessmentSubmit = async (req, res) => {
  let payload;
  try {
    const body = await readBody(req);
    payload = JSON.parse(body);
  } catch (err) {
    sendJson(res, 400, { error: '提交内容格式有误，请检查后重试' });
    return;
  }

  const name = validateName(payload && payload.name);
  if (!name) {
    sendJson(res, 400, { error: '请先填写姓名，姓名长度为 1-50 个字' });
    return;
  }

  const checked = validateAnswers(payload && payload.answers);
  if (!checked) {
    sendJson(res, 400, {
      error: `请完成全部 ${QUESTIONS.length} 道题目后再提交`,
    });
    return;
  }

  // 校验全部通过后才执行唯一一次写入；事务保证出错时不会留下半条记录。
  const { record, previous } = await db.insertRecord({
    personName: name,
    score: checked.score,
    maxScore: MAX_SCORE,
    answers: checked.answers,
  });
  sendJson(res, 201, withResult(record, previous));
};

const handleRequest = async (req, res, url) => {
  if (url.pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: project.id,
      message: messages.health,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (url.pathname === '/api/info') {
    sendJson(res, 200, {
      ...project,
      database: config.database,
    });
    return;
  }

  if (url.pathname === '/api/assessment/questions') {
    sendJson(res, 200, { questions: QUESTIONS, maxScore: MAX_SCORE });
    return;
  }

  if (url.pathname === '/api/assessment/records' && req.method === 'GET') {
    await handleAssessmentRecords(req, res, url);
    return;
  }

  if (url.pathname === '/api/assessment/records' && req.method === 'POST') {
    await handleAssessmentSubmit(req, res);
    return;
  }

  sendJson(res, 404, { error: messages.notFound, path: url.pathname });
};

// 统一兜底：任何处理异常只返回错误响应，不向前端写出半截数据，
// 数据库侧未通过校验的请求根本不会发起写入。
module.exports = {
  handleRequest: (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    Promise.resolve(handleRequest(req, res, url)).catch((err) => {
      sendJson(res, 500, { error: '服务器开小差了，请稍后重试' });
      logger.error('Request handling failed', err && err.message);
    });
  },
};
