# 临终关怀信息指南

提供临终关怀知识、症状照护、家属指导和资源清单的指南应用。

## 快速启动（Docker Compose）

```bash
cp .env.example .env
docker compose up -d --build
```

启动后访问：

- 前端：http://localhost:8238
- 后端健康检查：http://localhost:3238/api/health
- 数据库端口：localhost:5738

停止并清理容器、网络和数据卷：

```bash
docker compose down -v --remove-orphans
```

## 主要功能

- 临终关怀知识导航
- 症状照护与心理支持信息
- 心理压力自测档案：填写人署名后由服务端算分并给出建议，记录持久化保存，可回看历史与分数变化
- 资源、愿望清单和家属指南

## 心理自测档案说明

- 填写前先输入填写人姓名（浏览器会记住上次使用的姓名），打开自测页即显示该人上次测评总分。
- 8 道题全部作答后才能提交；评分、等级与建议均由后端计算，前端不参与计分。
- 同一个人同一天多次提交时以最后一次为准，更早的记录仍保留在档案中，时间线逐条与更早一条对比分数变化。
- 提交经过完整校验后才写入数据库（事务保证），题目未答完或服务端出错都不会产生半条记录。
- 记录存储在 PostgreSQL 的 `assessment_records` 表中，服务重启后仍可查询。

## 本地开发

前端：

```bash
cd frontend
npm install
npm run dev
```

后端：

```bash
cd backend
npm install
npm run dev
```

数据库可通过根目录的 Docker Compose 单独启动：

```bash
docker compose up -d db
```

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React + Vite |
| 后端 | Node.js health API |
| 数据库 | PostgreSQL |
| 部署 | Docker Compose + Nginx |

## 项目目录结构

```text
.
├── docker-compose.yml
├── .env.example
├── .env
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
├── backend/
│   ├── Dockerfile
│   └── ...
└── database/
    └── ...
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| COMPOSE_PROJECT_NAME | Compose 项目名，避免中文目录名导致项目名为空 | gb-138 |
| DB_NAME | 数据库名称 | hospice_guide |
| DB_USER | 数据库用户 | app |
| DB_PASSWORD | 数据库密码 | app_pwd |
| DB_ROOT_PASSWORD | 数据库 root/superuser 密码 | root_pwd |
| JWT_SECRET | 后端签名密钥 | hospice_guide_secret_key_2026 |
| FRONTEND_PORT | 前端宿主机端口 | 8238 |
| BACKEND_PORT | 后端宿主机端口 | 3238 |
| DB_PORT | 数据库宿主机端口 | 5738 |

## Docker 部署说明

- `docker-compose.yml` 顶层已声明 `name: gb-138`，可以在中文目录名下直接运行。
- 数据库使用 Docker 命名卷 `db_data` 持久化，不绑定到宿主中文路径。
- 前端容器使用 Nginx 托管静态资源，并将 `/api` 反向代理到后端服务名 `backend`。
- 后端会等待数据库健康后再启动，前端会等待后端健康后再启动。
- 如本机端口冲突，修改根目录 `.env` 中的 `FRONTEND_PORT`、`BACKEND_PORT` 或 `DB_PORT`。

## License

MIT
