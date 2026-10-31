# 东华大学在线点餐系统（DonghuaShop）

课程项目：面向东华大学食堂的在线点餐系统。前端为**用户 H5（Vue 3 + Vant 4）**与**商家管理 Web（Vue 3 + Element Plus）**，后端为**Java 17 + Spring Boot 2.7 + MyBatis + MySQL 8**。

- 组名：Darling in the FranXX　成员：刘晟玺（组长：后端、数据库、契约）、钱文博（组员：两端前端、接口接入、前端自测与联调）
- 当前状态：**组长后端已交付并可在本机真实 MySQL 上运行；组员两端前端已改写到组长正式契约，主流程接口级联调 37/37 通过**
- 未完成（不写成已完成）：浏览器逐页截图走查、跨用户越权用例、Nginx 部署验收、员工改密

## 仓库结构

```text
.
├─ code/
│  ├─ backend/                 # 组长交付的 Java 后端（原样并入，未修改）
│  └─ frontend/
│     ├─ user-h5/              # 用户端 H5（Vue3 + Vant）
│     └─ admin-web/            # 管理端 Web（Vue3 + Element Plus）
├─ docs/
│  ├─ leader/                  # 组长第 1~4 周交付（权威）：SRS、技术方案、DB 设计、OpenAPI、后端说明与自测报告
│  │  └─ 根目录材料/            # 组长版分工、个人周报等原始文件
│  ├─ integration/             # 本次整合产出：契约差异、页面-接口对应表、缺陷台账、联调记录、自测、运行手册
│  ├─ requirements|architecture|database|api|quality|testing|deployment|meetings/   # 组员第 1~3 周草案（已归档）
│  └─ README.md                # 文档索引
├─ scripts/                    # 环境、建库、构建、启动后端/前端、接口冒烟
└─ tools/                      # 便携 JDK17 / Maven / pnpm / 契约与脚本依赖（不入库）
```

## 快速开始

```powershell
# 0) 允许本会话运行脚本
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 0.1) 本地口令（仓库中不含任何口令）
Copy-Item .\config\env.example.ps1 .\config\env.local.ps1
notepad .\config\env.local.ps1     # 填 MySQL root、sky_app 口令、admin 口令

# 1) 工具链（便携 JDK17 + Maven + pnpm）
.\scripts\setup-env.ps1 -All

# 2) 按组长 schema.sql 建 takeout_course 库 + 应用账号
.\scripts\db-init-backend.ps1

# 3) 构建并启动后端（真实 MySQL）
. .\scripts\env.ps1
cd code\backend; mvn -B -DskipTests package; cd ..\..
.\scripts\run-backend.ps1                 # http://127.0.0.1:8080

# 4) 前端（另开终端）
cd code\frontend
..\..\tools\pnpm\node_modules\.bin\pnpm.cmd install --frozen-lockfile
cd ..\..
.\scripts\dev-h5.ps1                      # 5173
.\scripts\dev-admin.ps1                   # 5174

# 5) 接口冒烟（37 项）
node scripts\smoke-api.mjs
```

演示身份：

| 端 | 身份 | 来源 |
| --- | --- | --- |
| 用户 H5 | `demo-user` / `demo-user-2`（受控课程身份，不使用微信） | `POST /user/user/test-login` |
| 管理 Web | `admin` + 你自己设置的口令（见 `config/env.local.ps1` 的 `COURSE_ADMIN_PASSWORD`） | 首次启动后端时写入 `employee` 表 |

端口与数据库：MySQL `127.0.0.1:3306/takeout_course`（应用账号 `sky_app`，口令见本地 `config/env.local.ps1`）、后端 `8080`、前端 `5173/5174`。口令一律不入库。

## 本次整合结果

| 项 | 内容 | 证据 |
| --- | --- | --- |
| 契约对齐 | 前端从我的 `/api/*` 草案整体改写到组长 `/user/**`、`/admin/**`、`code=1/msg`、number 金额 | [contract-diff.md](docs/integration/contract-diff.md) |
| 页面覆盖 | 用户端 12 个页面路由、管理端 7 个页面（含新增员工管理与营业开关） | [page-api-map.md](docs/integration/page-api-map.md) |
| 真实联调 | 登录→浏览→加购→地址→下单→模拟支付→接单→派送→完成→统计 全链路 | [integration-record.md](docs/integration/integration-record.md)、[api-smoke.json](docs/integration/evidence/api-smoke.json) |
| 权限与越权 | 两身份交叉访问地址/购物车/订单/支付/取消，22 项全部被后端拒绝且数据未变 | [api-authz.json](docs/integration/evidence/api-authz.json) |
| 静态部署 | dist 脱离 dev server 独立运行（静态托管 + 接口反代），13 项通过 | [nginx-static.md](docs/deployment/nginx-static.md)、[static-deploy.json](docs/integration/evidence/static-deploy.json) |
| 测试用例 | 30 条用例（主流程/异常/权限/前端交互），标注已执行与待执行 | [test-cases.md](docs/integration/test-cases.md) |
| 前端自测 | 两工程构建通过、代理穿透真实后端、管理端已分包 | [frontend-self-test.md](docs/integration/frontend-self-test.md) |
| 缺陷登记 | F-01~F-07（购物车 amount 语义、支付幂等、dish/list 返回类型、缺详情接口、`/assets/` 前缀冲突等） | [defects.md](docs/integration/defects.md) |
| 运行手册 | 换机复现、常见问题、目录指引 | [runbook.md](docs/integration/runbook.md) |

关键实测数字：

```text
scripts/smoke-api.mjs        合计 37 项，通过 37，失败 0（主流程）
scripts/smoke-authz.mjs      合计 22 项，通过 22，失败 0（越权/权限）
check-static-deploy.mjs      合计 13 项，通过 13，失败 0（dist 静态托管 + 反代）
user-h5  build               ✓ 29 文件 / 618.6 KB
admin-web build              ✓ 25 文件 / 1.64 MB；已分包：入口 9.7 KB、element-plus 1.09 MB、vue-vendor 114 KB、axios 51 KB
5173 → 8080 proxy            /user/category/list code=1；test-login + 购物车 code=1
5174 → 8080 proxy            /admin/employee/login + /admin/shop/status code=1
数据库                        takeout_course：11 表 / 2 分类 / 2 菜品 / 1 套餐 / 2 用户
```

## 文档入口

- 权威材料（组长）：[leader/README.md](docs/leader/README.md)｜[SRS](docs/leader/week1/SRS.md)｜[技术方案](docs/leader/week2/technical-design.md)｜[DB 设计](docs/leader/week2/database-design.md)｜[OpenAPI](docs/leader/week3/openapi.yaml)｜[后端说明](code/backend/README.md)｜[后端自测报告](docs/leader/week4/backend-self-test.md)
- 整合材料（组员）：[页面-接口对应表](docs/integration/page-api-map.md)｜[契约差异](docs/integration/contract-diff.md)｜[缺陷台账](docs/integration/defects.md)｜[联调记录](docs/integration/integration-record.md)｜[测试用例](docs/integration/test-cases.md)｜[前端自测](docs/integration/frontend-self-test.md)｜[运行手册](docs/integration/runbook.md)｜[静态部署](docs/deployment/nginx-static.md)
- 周报：[个人（10.19—10.26 整合版）](docs/meetings/个人工作周报_钱文博_2026-10-19至10-26.docx)｜[小组（第 1~4 周）](docs/meetings/小组工作周报_第1-4周.docx)
- 部署配置：[deploy/nginx.conf](deploy/nginx.conf)
- 早期草案（已归档）：`docs/requirements`、`docs/architecture`、`docs/database`、`docs/api`、`docs/quality`、`docs/testing`、`docs/meetings`（除周报外的会议/评审稿）

## 协作约定

- 契约以 `docs/leader/week3/openapi.yaml` 为唯一来源；前端改动若涉及字段/路径，先改契约再改实现。
- 接口变更需同时更新：OpenAPI、前端字段使用点、`docs/integration/page-api-map.md`、缺陷/联调记录。
- 提交前本地验证：`node scripts\smoke-api.mjs`、`node scripts\smoke-authz.mjs`、`.\scripts\build-frontend.ps1`。
