# 文档索引

## 1 权威材料（组长刘晟玺交付，未修改）

| 位置 | 内容 |
| --- | --- |
| [leader/README.md](leader/README.md) | 组长第 1~4 周交付索引 |
| [leader/week1/SRS.md](leader/week1/SRS.md) | 需求规格说明书（需求 ID、用例、非功能、范围差异） |
| [leader/week2/technical-design.md](leader/week2/technical-design.md) | 技术方案（架构、认证、事务、数据关系） |
| [leader/week2/database-design.md](leader/week2/database-design.md) · [schema.sql](leader/week2/schema.sql) | 数据库设计与空库建表脚本（库 `takeout_course`） |
| [leader/week3/openapi.yaml](leader/week3/openapi.yaml) · [interface-review.md](leader/week3/interface-review.md) | 正式接口契约（63 个路径）与分批评审工作表 |
| [leader/week4/backend-implementation.md](leader/week4/backend-implementation.md) · [backend-self-test.md](leader/week4/backend-self-test.md) | 后端实现说明与 50 项测试报告（H2 + MockMvc） |
| [leader/组员前端与联调交接清单.md](leader/组员前端与联调交接清单.md) | 组长给我的前端/联调任务与验收要求 |
| [leader/collaboration.md](leader/collaboration.md) | 两人协作规范、PR 模板、交接字段 |
| [leader/meetings/week1.md](leader/meetings/week1.md) | 启动记录 |
| `leader/根目录材料/` | 组长版总体方案、个人周报等原始文件 |

## 2 本次整合产出（组员钱文博）

| 位置 | 内容 | 状态 |
| --- | --- | --- |
| [integration/contract-diff.md](integration/contract-diff.md) | 我的第 3 周草案 vs 组长正式契约：差异与映射表 | 完成 |
| [integration/page-api-map.md](integration/page-api-map.md) | 页面 → 需求 → 接口 → 关键字段 → 接入状态 | 完成 |
| [integration/defects.md](integration/defects.md) | F-01~F-06 缺陷/差异台账（含复现证据） | 待组长答复 |
| [integration/integration-record.md](integration/integration-record.md) | 组员侧真实联调记录（环境、7 个场景、结果） | 完成（单机，未双方在线） |
| [integration/frontend-self-test.md](integration/frontend-self-test.md) | 构建、代理连通、37 项接口冒烟、未验证项 | 完成 |
| [integration/runbook.md](integration/runbook.md) | 换机复现与常见问题 | 完成 |
| [integration/test-cases.md](integration/test-cases.md) | 第 7 周测试用例 30 条（主流程/异常/权限/前端交互），标注已执行与待执行 | 完成 |
| [integration/test-report.md](integration/test-report.md) | 系统测试报告：五套件 102 项、关键验证点、发现的问题、未执行项 | 完成 |
| [integration/retest-record.md](integration/retest-record.md) | 缺陷复测记录 F-01~F-08（含未修复项与责任人） | 完成 |
| [integration/pull-request-week5.md](integration/pull-request-week5.md) | 第 5~7 周 PR 描述（可直接粘贴到 GitHub） | 完成 |
| [report/technical-report.md](report/technical-report.md) | 课程技术报告（需求/方案/数据库/契约/前后端/测试/缺陷/部署/分工/合规） | 完成（部署章节待第 8 周补） |
| [deployment/nginx-static.md](deployment/nginx-static.md) | 静态部署方案、/assets/ 前缀冲突（F-07）与 13 项实测 | 完成（Nginx 待第 8 周） |
| [deployment/deploy-acceptance.md](deployment/deploy-acceptance.md) | 部署步骤、环境变量、13 项验收清单（含待填列） | 完成（待实测填写） |
| [integration/evidence/api-smoke.json](integration/evidence/api-smoke.json) | 主流程冒烟原始结果（37 项逐项 ok/detail） | 证据 |
| [integration/evidence/api-authz.json](integration/evidence/api-authz.json) | 越权/权限用例原始结果（22 项） | 证据 |
| [integration/evidence/static-deploy.json](integration/evidence/static-deploy.json) | dist 静态托管验证原始结果（13 项） | 证据 |
| [integration/evidence/api-exceptions.json](integration/evidence/api-exceptions.json) | 异常与边界用例原始结果（16 项） | 证据 |
| [integration/evidence/browser-check.json](integration/evidence/browser-check.json) | 浏览器渲染与响应式原始结果（14 项） | 证据 |
| [integration/evidence/browser-flow.json](integration/evidence/browser-flow.json) | 浏览器点击流原始结果（14 项） | 证据 |
| `integration/evidence/shots-flow/` | 点击流截图 10 张（登录→下单→支付→接单→派送→完成、表单校验） | 证据 |
| `integration/evidence/shots/` | Edge 无头截图（H5 登录/首页/购物车/订单/320px/1280px + 管理端 4 页） | 证据 |
| [integration/evidence/api-exceptions.json](integration/evidence/api-exceptions.json) | 异常与边界用例原始结果（16 项） | 证据 |
| [integration/evidence/browser-check.json](integration/evidence/browser-check.json) | 浏览器渲染与响应式原始结果（14 项） | 证据 |
| `integration/evidence/shots/` | Edge 无头截图（登录/首页/购物车/订单/320px/1280px/管理端 4 页） | 证据 |

## 3 组员早期草案（已归档，勿作依据）

| 位置 | 说明 |
| --- | --- |
| `requirements/SRS.md` | 第 1 周按前端视角写的 SRS，已被 `leader/week1/SRS.md` 取代 |
| `architecture/technical-design.md` | 第 2 周前端技术方案（含当时对 Vue2→Vue3、hash 路由等决策），后端章节已由组长版本取代 |
| `database/ER-and-dictionary.md`、`database/schema.sql`、`database/data.sql`、`database/review-notes.md` | 第 2 周我基于苍穹外卖表结构整理的库设计与评审意见；正式库以 `leader/week2/schema.sql` 为准 |
| `api/openapi.yaml` | 第 3 周我的 41 接口草案（`/api` 前缀、`code=0` 成功），已被组长契约取代 |
| `api/review-notes.md`、`api/frontend-field-checklist.md` | 当时对草案的评审意见与字段清单 |
| `quality/material-compatibility.md` | 素材兼容性检查（当时素材不在本机；组长后端现已交付） |
| `testing/frontend-selfcheck.md` | Mock 阶段自测记录，已被 `integration/frontend-self-test.md` 取代 |
| `deployment/environment.md` | 环境说明，运行步骤已归并到 `integration/runbook.md` |
| `meetings/2026-10-26-week01.md` 等 | 第 1~3 周组员会议/评审提交单 |

> 归档文件顶部均有状态说明。保留它们的目的是记录“我按什么依据做了什么”，而不是替代组长版本。

## 4 阅读顺序

1. 先看 [README](../README.md) 了解仓库结构与当前进度；
2. 看 `leader/` 确认需求、设计、契约（权威）；
3. 看 `integration/page-api-map.md` 了解前端每个页面调用了哪些真实接口；
4. 看 `integration/integration-record.md` 与 `defects.md` 了解实测结果与待办；
5. 需要复现环境时看 `integration/runbook.md`。
