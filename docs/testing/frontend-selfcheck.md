> **状态：组员第 1~3 周草案（已归档，勿作为依据）**
> 组长刘晟玺已交付正式版本，权威文件见 `docs/leader/docs/integration/frontend-self-test.md`；本文件仅保留为过程留痕。
> 最新整合结果与实测证据见 `docs/integration/`（contract-diff / page-api-map / defects / integration-record）。
# 前端自测记录（第 1~3 周）

| 项 | 内容 |
| --- | --- |
| 执行人 | 钱文博 |
| 执行日期 | 2026-10-26 |
| 被测范围 | 两套前端工程（Mock 模式）、契约自检脚本、开发环境脚本 |
| 明确不包含 | 与真实后端的接口联调（第 6 周）、浏览器交互与视觉走查、手机真机测试 |
| 结论 | 环境、构建、契约一致性三项通过；页面交互仅完成静态编译与 Mock 逻辑检查，**运行态交互尚未在浏览器中逐页验证** |

## 1 环境自检

命令：`. .\scripts\env.ps1 ; .\scripts\verify-env.ps1`

```text
项目               期望                             实际                                              结果
JDK（便携）          17.x                           openjdk version "17.0.20.1" 2026-08-18            PASS
Maven            3.9.x                          Apache Maven 3.9.9 ...                            PASS
Maven 运行时 JDK    17.x                           Java version: 17.0.20.1, vendor: Eclipse Adoptium  PASS
Node.js          >=18                           v22.19.0                                          PASS
pnpm（便携）         10.x                           10.34.9                                           PASS
MySQL 服务         Running                        Running                                           PASS
数据库 donghua_shop 可读写且含种子数据                       17 菜品 / 2 订单 / 11 张表                            PASS
前端 user-h5       package.json + dist/index.html pkg=True dist=True                                PASS
前端 admin-web     package.json + dist/index.html pkg=True dist=True                                PASS
OpenAPI 契约自检     通过且前端调用全覆盖                     契约覆盖：41/41                                     PASS
```

结果：**10/10 PASS**。

## 2 生产构建

命令：`.\scripts\build-frontend.ps1`

| 工程 | 结果 | 产物 | 体积 | 备注 |
| --- | --- | --- | --- | --- |
| user-h5 | ✓ built in 7.38s | `frontend/user-h5/dist` | 26 文件 / 607.8 KB | 主包 387.68 KB（gzip 142.11 KB） |
| admin-web | ✓ built in 6.95s | `frontend/admin-web/dist` | 19 文件 / 1624.5 KB | 主包 1266.63 KB（gzip 409.87 KB）；告警阈值已调到 1500 KB，按需引入/分包列入第 7 周 |

已知告警：admin-web 因 Element Plus 全量引入导致主包偏大。课程内网演示可接受，优化方案（按需引入 / `manualChunks`）列入第 7 周。

## 3 开发服务器可用性

分别启动 5173（用户端）与 5174（管理端）后，用 HTTP 请求验证“服务确实在编译并按需返回模块”：

| 请求 | 状态 | 大小 | 说明 |
| --- | --- | --- | --- |
| `GET http://127.0.0.1:5173/` | 200 | 443 B | 返回 `index.html`，含 `/src/main.js` 入口 |
| `GET /src/main.js` | 200 | 3046 B | Vite 转换后的 ESM 入口 |
| `GET /src/App.vue` | 200 | 10205 B | SFC 编译成功（含 HMR 客户端代码） |
| `GET /src/views/Login.vue` | 200 | 19870 B | 页面级 SFC 编译成功 |
| `GET /src/views/Home.vue` | 200 | 29229 B | 同上 |
| `GET /src/mock/index.js` | 200 | 63214 B | Mock 适配器可被加载 |
| `GET http://127.0.0.1:5174/` | 200 | 358 B | 管理端入口 |
| `GET /src/views/DishList.vue` | 200 | 52208 B | 管理端页面 SFC 编译成功 |

说明：返回 200 且大小合理，能证明 **SFC 语法、模板、脚本、样式均编译通过**；但不能证明交互正确（见第 6 节）。

## 4 契约一致性

命令：`node tools\validate-openapi.js`

```text
契约文件：docs/api/openapi.yaml
OpenAPI 版本：3.0.3；接口数：41；$ref 数：231
前端 API 调用：41 个，位于 4 个文件
契约覆盖：41/41
契约自检通过。
```

脚本检查项：

1. YAML 可被解析（曾真实拦截一次 `Bearer <token>` 中 `: ` 导致的非法 plain scalar）；
2. 231 个 `$ref` 全部可在文档内解析；
3. 每个操作都声明了 `responses`，且路径里的 `{param}` 都有对应 `parameters` 声明；
4. 前端 `src/api/*.js` 中的 41 个真实调用路径全部出现在契约中（含 `PUT /admin/dishes/${id}` 这类模板路径的归一化比较）。

## 5 Mock 逻辑覆盖（代码级检查）

| 用例 | 期望 | 实现位置 | 状态 |
| --- | --- | --- | --- |
| 未带令牌访问 `/user/cart` | 401 + `code=40101` | `user-h5/src/mock/index.js` `requireLogin` | 已实现 |
| 验证码非 1234 | 401 + `code=40102` | 同上 | 已实现 |
| 加入停售菜品 | 409 + `code=40901` | 同上 | 已实现 |
| 数量 0 或 100 | 400 + `code=40001` | 同上 | 已实现 |
| 同商品同口味重复加购 | 合并累加，不超过 99 | 同上（单价先取再合并） | 已实现 |
| 购物车为空下单 | 409 + `code=40903` | 同上 | 已实现 |
| 重复支付 | 409 + `code=40904` | 同上 | 已实现 |
| 删除默认地址（仍有其它地址） | 409 + `code=40902` | 同上 | 已实现 |
| 管理端非法状态迁移（如 5 → 3） | 409 + `code=40909` | `admin-web/src/mock/index.js` | 已实现 |
| 取消订单未填原因 | 400 + `code=40001` | 同上 | 已实现 |
| 删除被菜品引用的分类 | 409 + `code=40907` | 同上 | 已实现 |
| 分页边界 | `page`、`pageSize`、`total`、`records` 齐全 | 同上 | 已实现 |

> 这些是“代码里按契约写了分支”，不等于“在浏览器里点过”。第 6 节如实记录未验证项。

## 6 未验证项（不得在报告中写成已完成）

| 项 | 原因 | 计划 |
| --- | --- | --- |
| 页面交互与视觉走查（点击、表单校验、空状态、窄屏） | 本次仅在命令行验证到“编译与资源可获取”，未使用浏览器逐页操作 | 第 5 周集中开发时逐页自测并截图记录 |
| 与真实后端联调 | 后端第 4 周才开工 | 第 6 周 |
| 手机真机 / 局域网访问 | dev server 仅绑定 127.0.0.1 | 第 6 周联调前调整 host 并实测 |
| 越权访问用例（A 用户查 B 订单） | 需要真实后端令牌 | 第 6 周 |
| 金额篡改用例 | 同上 | 第 6 周 |
| 管理端套餐组合编辑 | 明确不属于第 1~3 周范围 | 第 5 周 |

## 7 复现命令

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\env.ps1
.\scripts\verify-env.ps1          # 10/10 PASS
.\scripts\build-frontend.ps1      # 两个 dist
node tools\validate-openapi.js    # 41/41 覆盖
```
