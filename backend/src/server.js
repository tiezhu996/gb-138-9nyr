const http = require('node:http');
const config = require('./config');
const { messages } = require('./constants');
const { handleRequest } = require('./routes');
const { waitForDatabase } = require('./db');
const logger = require('./logger');

const start = async () => {
  await waitForDatabase();

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      logger.error('未处理的请求异常', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      res.end(JSON.stringify({ error: messages.serverError }));
    });
  });

  server.listen(config.port, config.host, () => {
    logger.info(`${messages.serverStarted} on ${config.port}`);
  });
};

start().catch((err) => {
  logger.error('服务启动失败', err);
  process.exit(1);
});
