const http = require('node:http');
const config = require('./config');
const { messages } = require('./constants');
const { handleRequest } = require('./routes');
const { initDatabase, pool } = require('./db');
const logger = require('./logger');

const server = http.createServer(handleRequest);

const start = async () => {
  // 等数据库就绪并建好表后再开始接收请求，重启后历史档案仍可查询。
  await initDatabase();

  server.listen(config.port, config.host, () => {
    logger.info(`${messages.serverStarted} on ${config.port}`);
  });
};

const shutdown = () => {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
