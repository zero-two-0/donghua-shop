# 前端自测记录（第 5 周交付包用）

| 项 | 内容 |
| --- | --- |
| 执行人 | 钱文博（组员） |
| 执行日期 | 2026-10-27 |
| 被测版本 | `code/frontend/user-h5`、`code/frontend/admin-web`（已接入真实后端，无 Mock） |
| 后端 | 组长交付 JAR，本机以 MySQL 8.0.46 真实库运行（`takeout_course`） |
| 结论 | 构建通过；开发服务器与后端代理连通；**接口级主流程 37/37 通过**；浏览器逐页点击与窄屏走查**尚未执行**，见第 4 节 |

## 1 构建与静态检查

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 用户端构建 | `pnpm --filter user-h5 build` | ✓ built in 4.40s，dist 26 文件 |
| 管理端构建 | `pnpm --filter admin-web build` | ✓ built in 12.56s，dist 19 文件（主包 1.27 MB，gzip 410 KB） |
| 依赖安装 | `pnpm install --frozen-lockfile` | 通过（pnpm 10.34.9，Node 22.19.0） |
| 契约自检（旧脚本，仅比对旧草案） | `node tools/validate-openapi.js` | 不再适用：契约已换成组长版本，见第 5 节说明 |

## 2 开发服务器与代理连通性（实测）

| 检查 | 请求 | 结果 |
| --- | --- | --- |
| 用户端外壳 | `GET http://127.0.0.1:5173/` | 200，443 B（index.html） |
| 用户端页面编译 | `GET /src/views/Home.vue` | 200，44 279 B（SFC 编译成功） |
| 管理端外壳 | `GET http://127.0.0.1:5174/` | 200，358 B |
| 管理端页面编译 | `GET /src/views/DishList.vue` | 200，71 510 B |
| 5173 → 后端 浏览 | `GET :5173/user/category/list?type=1` | 200，`code=1`，1 条分类 |
| 5173 → 后端 登录+受保护接口 | `POST :5173/user/user/test-login` → `GET :5173/user/shoppingCart/list` | 200，`code=1` |
| 5174 → 后端 员工登录+受保护接口 | `POST :5174/admin/employee/login` → `GET :5174/admin/shop/status` | 200，`code=1`，`data=1` |
| 静态图片 | `GET :5173/assets/dish-1.svg` | 200，`image/svg+xml` |

说明：两套前端都通过 Vite `server.proxy` 把 `/user`、`/admin`、`/assets` 转发到 8080，因此**没有开启 CORS 也能联调**，构建后由 Nginx 做同样反代。

## 3 接口级主流程（真实 MySQL）

执行：`node scripts/smoke-api.mjs`（结果写入 `docs/integration/evidence/api-smoke.json`）

```text
合计 37 项，通过 37，失败 0
```

覆盖分组：

| 分组 | 项数 | 代表项 |
| --- | --- | --- |
| 认证 | 3 | 测试身份登录、非法 loginCode 被拒、无令牌 401 |
| 浏览 | 6 | 分类、营业状态、菜品（含口味）、关键词搜索、套餐、套餐组成 |
| 购物车 | 4 | 加购、列表、改数量、单价×数量 与期望一致 |
| 地址 | 3 | 新增、列表、设默认 |
| 订单 | 6 | 下单（客户端传 0.01 不被采信）、清车、支付、幂等重复支付、分页、状态 2 |
| 管理端 | 5 | 员工登录、订单条件查询、接单、派送、完成 |
| 鉴权 | 1 | 用户令牌访问管理端被拒 |
| 闭环 | 1 | 用户复查订单变为 5（已完成） |
| 统计 | 3 | 工作台经营数据、营业额报表、订单状态计数 |
| 管理端商品/营业 | 5 | 菜品分页、菜品详情含口味、打烊、恢复营业 |

## 4 尚未执行（如实记录，不写成已通过）

| 项 | 原因 | 计划 |
| --- | --- | --- |
| 浏览器逐页点击与截图 | 本次以脚本验证接口与代理链路；未在浏览器中逐页操作 | 交付前用 Chrome 走一遍主流程并截图 |
| 手机/窄屏布局检查 | 同上 | 与上一条同批完成 |
| 前端单元测试 | 课程未要求，时间优先给联调 | 不承诺 |
| 大并发 / 性能 | 不在课程范围 | 不做 |
| 员工改密 | 契约无此接口（F-06） | 待组长决定 |

## 5 关于旧的契约自检脚本

`tools/validate-openapi.js` 是为我第 3 周的草案写的（41 个接口、`/api` 前缀、`code=0` 成功）。组长正式契约是 63 个路径、无 `/api`、`code=1` 成功，脚本已不能直接用于比对。本次改用：

- 接口级实测：`scripts/smoke-api.mjs`（直接打真实后端，比静态比对更有说服力）；
- 结构摘要：`tools/describe-openapi.js`（生成组长契约的接口/Schema 摘要，用于逐项核对）。

若后续要恢复静态一致性检查，应按组长脚本 `docs/leader/scripts/check_contract.py` 的口径重写。
