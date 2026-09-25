const config = require('./config');
const { project, messages } = require('./constants');
const { sendJson } = require('./response');
const { normalizeSubmission, scoreAnswers } = require('./assessment');
const store = require('./assessmentStore');
const logger = require('./logger');

const MAX_BODY_BYTES = 64 * 1024;

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        const err = new Error('请求内容过大');
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'));
      } catch {
        const err = new Error('请求不是有效的 JSON');
        err.status = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });

// GET /api/assessments?name=张三 —— 取出这个人的全部档案，新的在前。
const handleListAssessments = async (res, url) => {
  const name = (url.searchParams.get('name') || '').trim();
  if (!name) {
    sendJson(res, 400, { error: '请提供填写人姓名' });
    return;
  }
  const records = await store.listAssessments(name);
  sendJson(res, 200, { name, records });
};

// POST /api/assessments —— 服务端算分并归档；同一天重复提交以最后一次为准。
const handleCreateAssessment = async (req, res) => {
  const body = await readJsonBody(req);
  const submission = normalizeSubmission(body);
  const result = scoreAnswers(submission.answers);
  const { record, replaced } = await store.saveAssessment({
    name: submission.name,
    answers: submission.answers,
    result,
  });
  const previous = await store.findPrevious(submission.name, record.date);
  sendJson(res, 200, {
    record,
    replaced,
    previous,
    delta: previous ? record.totalScore - previous.totalScore : null,
  });
};

const handleRequest = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  try {
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

    if (url.pathname === '/api/assessments') {
      if (req.method === 'GET') {
        await handleListAssessments(res, url);
        return;
      }
      if (req.method === 'POST') {
        await handleCreateAssessment(req, res);
        return;
      }
      sendJson(res, 405, { error: messages.methodNotAllowed });
      return;
    }

    sendJson(res, 404, { error: messages.notFound, path: url.pathname });
  } catch (err) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    if (status >= 500) {
      logger.error(`请求处理失败：${req.method} ${url.pathname}`, err);
    }
    sendJson(res, status, {
      error: status >= 500 ? messages.serverError : err.message,
    });
  }
};

module.exports = {
  handleRequest,
};
