// 端到端测试：用 pg-mem 模拟 PostgreSQL，走真实的 HTTP 处理器验证自测档案接口。
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { newDb, DataType } = require('pg-mem');

// 在加载任何业务模块之前，用内存版 pg 替换真实的 pg 驱动。
const mem = newDb();
mem.public.registerFunction({
  name: 'to_char',
  args: [DataType.date, DataType.text],
  returns: DataType.text,
  implementation: (value) => {
    const d = value instanceof Date ? value : new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  },
});
require.cache[require.resolve('pg')] = { exports: mem.adapters.createPg() };

const { handleRequest } = require('../src/routes');
const { pool, ensureSchema } = require('../src/db');

let server;
let baseUrl;

const api = async (method, path, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

const post = (body) => api('POST', '/api/assessments', body);
const list = (name) => api('GET', `/api/assessments?name=${encodeURIComponent(name)}`);

const FULL_ANSWERS = [0, 1, 2, 3, 0, 1, 2, 3]; // 总分 12 → 轻度压力

before(async () => {
  await ensureSchema();
  server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('健康检查不受影响', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('提交完整答卷：服务端算分并归档', async () => {
  const { status, body } = await post({ name: '张三', answers: FULL_ANSWERS });
  assert.equal(status, 200);
  assert.equal(body.record.totalScore, 12);
  assert.equal(body.record.level, '轻度压力');
  assert.equal(body.record.color, 'yellow');
  assert.ok(Array.isArray(body.record.suggestions));
  assert.equal(body.replaced, false);
  assert.equal(body.previous, null);
  assert.equal(body.delta, null);
});

test('题目没答完不能提交，档案里不会多出半条记录', async () => {
  const name = '李四';
  for (const answers of [
    FULL_ANSWERS.slice(0, 7),
    [],
    [0, 1, 2, 3, 0, 1, 2, 99],
    [0, 1, 2, 3, 0, 1, 2, 'x'],
  ]) {
    const { status, body } = await post({ name, answers });
    assert.equal(status, 400, JSON.stringify(answers));
    assert.ok(body.error);
  }
  const { body } = await list(name);
  assert.equal(body.records.length, 0);
});

test('缺名字、坏 JSON 都会被拒，且不产生记录', async () => {
  assert.equal((await post({ answers: FULL_ANSWERS })).status, 400);
  assert.equal((await post({ name: '   ', answers: FULL_ANSWERS })).status, 400);
  const res = await fetch(`${baseUrl}/api/assessments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not-json',
  });
  assert.equal(res.status, 400);
  // 档案表里不应该出现任何空名字或这次失败提交的残留。
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM assessment_records WHERE person_name = ''`,
  );
  assert.equal(rows[0].n, 0);
});

test('同一个人同一天再提交以最后一次为准', async () => {
  const name = '王五';
  const first = await post({ name, answers: FULL_ANSWERS });
  assert.equal(first.body.record.totalScore, 12);

  const allMax = [3, 3, 3, 3, 3, 3, 3, 3];
  const second = await post({ name, answers: allMax });
  assert.equal(second.status, 200);
  assert.equal(second.body.record.totalScore, 24);
  assert.equal(second.body.record.level, '较重心理负担');
  assert.equal(second.body.replaced, true);

  const { body } = await list(name);
  assert.equal(body.records.length, 1);
  assert.equal(body.records[0].totalScore, 24);
  assert.deepEqual(body.records[0].answers, allMax);
});

test('更早的记录留在档案里，看变化时跟更早的那条比', async () => {
  const name = '赵六';
  // 手工补一条三天前的历史记录（总分 18，中度压力）。
  await pool.query(
    `INSERT INTO assessment_records
       (person_name, assessment_date, answers, total_score, level, color, description, suggestions)
     VALUES ($1, CURRENT_DATE - 3, $2::jsonb, 18, '中度压力', 'orange', '历史描述', '[]'::jsonb)`,
    [name, JSON.stringify([3, 3, 3, 3, 3, 3, 0, 0])],
  );

  const { status, body } = await post({ name, answers: FULL_ANSWERS });
  assert.equal(status, 200);
  assert.equal(body.record.totalScore, 12);
  assert.equal(body.previous.totalScore, 18);
  assert.equal(body.delta, -6);

  const listRes = await list(name);
  assert.equal(listRes.body.records.length, 2);
  // 新的在前，更早的那条还能翻到。
  assert.equal(listRes.body.records[0].totalScore, 12);
  assert.equal(listRes.body.records[1].totalScore, 18);
  assert.equal(listRes.body.records[1].level, '中度压力');
});

test('打开页面能拿到上次总分：列表第一条即最近一次', async () => {
  const name = '孙七';
  await post({ name, answers: [1, 1, 1, 1, 1, 1, 1, 1] });
  await post({ name, answers: [2, 2, 2, 2, 2, 2, 2, 2] }); // 同日覆盖
  const { status, body } = await list(name);
  assert.equal(status, 200);
  assert.equal(body.records[0].totalScore, 16);
});

test('查询缺少姓名返回 400，未知路径仍是 404', async () => {
  const res = await fetch(`${baseUrl}/api/assessments`);
  assert.equal(res.status, 400);
  const notFound = await fetch(`${baseUrl}/api/nope`);
  assert.equal(notFound.status, 404);
  const wrongMethod = await fetch(`${baseUrl}/api/assessments`, { method: 'DELETE' });
  assert.equal(wrongMethod.status, 405);
});
