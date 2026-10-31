# PR 描述：第 5~7 周前端接入、联调与测试交付

> 用途：在 GitHub 上创建 Pull Request 时直接粘贴。分支建议 `feature/week5-frontend` → `develop`。
> 说明：本仓库此前由组员直接在 `main` 上提交（无 PR）。如课程要求 PR 留痕，可按下面步骤补一次：
>
> ```powershell
> git switch -c feature/week5-frontend
> git push -u origin feature/week5-frontend
> # 到 GitHub 打开该分支 → Compare & pull request → 粘贴本文件内容 → 选择审阅人（刘晟玺）→ 合并到 develop
> git switch develop; git merge --no-ff feature/week5-frontend
> ```

## 目的

- 周次：第 5~7 周（前端交付包 / 联调包 / 测试材料）
- 需求：用户端与商家端全部页面按正式契约接入真实后端；完成前后端联调、权限与异常用例、构建与静态部署验证
- 完成后行为：`demo-user` 登录可完成“浏览→加购→下单→模拟支付→查单”；`admin` 可完成“接单→派送→完成”；所有接口走真实 Spring Boot + MySQL

## 变更

- 前端：新增 `code/frontend/user-h5`（Vue3 + Vant，12 路由）与 `code/frontend/admin-web`（Vue3 + Element Plus，7 页面）
- 接口层：`src/api/http.js` 统一外壳（`code=1` 成功 / `msg` 错误 / 401 跳登录 / Bearer）；用户与员工令牌分域
- 契约对齐：从 `/api/*` 草案改写到组长 `/user/**`、`/admin/**`；金额由字符串改 number；删除 Mock 层，改 Vite 代理直连
- 部署：新增 `deploy/nginx.conf`（按扩展名区分 `/assets`，避免入口 JS 被误转发）
- 工具：`scripts/smoke-api.mjs`(37)、`smoke-authz.mjs`(22)、`smoke-exceptions.mjs`(16)、`serve-dist.mjs` + `check-static-deploy.mjs`(13)、`browser-check.mjs`(14)
- 文档：`docs/integration/*`（契约差异、页面-接口对应表、缺陷台账、联调记录、测试用例、测试报告、复测记录）、`docs/deployment/*`、`docs/report/technical-report.md`
- 数据库设计影响：**无变更**（沿用组长 `schema.sql`，仅本地建库）

## 验证

命令与运行环境（Windows 11 / JDK17.0.20.1 / MySQL 8.0.46 / Node 22.19 / Edge 156）：

```text
node scripts/smoke-api.mjs          → 37 项，通过 37，失败 0
node scripts/smoke-authz.mjs        → 22 项，通过 22，失败 0
node scripts/smoke-exceptions.mjs   → 16 项，通过 16，失败 0
node scripts/check-static-deploy.mjs→ 13 项，通过 13，失败 0
node scripts/browser-check.mjs      → 14 项，通过 14，失败 0
scripts/build-frontend.ps1          → user-h5 29 文件/619 KB；admin-web 25 文件/1.64 MB（入口 9.7 KB）
```

证据：`docs/integration/evidence/{api-smoke,api-authz,api-exceptions,static-deploy,browser-check}.json` 与 `evidence/shots/`（8 张截图）。

未验证范围及原因：浏览器**点击流**（无头脚本只做渲染与断言）、真实手机/局域网、真实 Nginx（本机未安装，用等价静态服务验证）、并发与性能。

## 调用方影响

- 后端无需改动即可对接；契约仍需按 F-01/F-03/F-04/F-05 修订（`docs/integration/defects.md`）
- 需要同步的页面/调用：无（本次为前端一次性接入）
- 测试数据：课程库 `takeout_course` 种子数据；脚本自建数据在用例结束时取消/清理

## 审阅

请重点核对：

1. `docs/integration/page-api-map.md` 中“页面 → 接口 → 字段”是否与实际调用一致；
2. `docs/integration/defects.md` 的 F-01~F-08 是否认可，特别是 F-01（购物车 `amount` 语义）与 F-07（`/assets` 前缀冲突）；
3. `deploy/nginx.conf` 的反代规则是否符合部署预期；
4. 是否同意把用户端菜品详情接口（F-04）与员工改密（F-06）纳入后续版本。
