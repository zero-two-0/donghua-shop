> **状态：组员第 1~3 周草案（已归档，勿作为依据）**
> 组长刘晟玺已交付正式版本，权威文件见 `docs/leader/week2/technical-design.md`；本文件仅保留为过程留痕。
> 最新整合结果与实测证据见 `docs/integration/`（contract-diff / page-api-map / defects / integration-record）。
# 东华大学在线点餐系统 · 技术方案（前端部分）

| 项目 | 内容 |
| --- | --- |
| 版本 | v0.2（第 2 周草案，随第 3 周契约评审定稿） |
| 编写 | 钱文博（组员）；后端章节由组长刘晟玺补充 |
| 状态 | **待评审**：技术选型、素材复用结论、部署方式三项需双方确认后冻结 |
| 日期 | 2026-10-26 |
| 配套 | `docs/requirements/SRS.md`、`docs/api/openapi.yaml`、`docs/database/ER-and-dictionary.md` |

## 1 总体架构

```
┌────────────────────┐        ┌────────────────────┐
│  用户端 H5          │        │  商家管理 Web       │
│  Vue 3 + Vant 4    │        │  Vue 3 + Element+  │
│  Vite · Pinia      │        │  Vite · Pinia      │
│  :5173             │        │  :5174             │
└─────────┬──────────┘        └─────────┬──────────┘
          │  HTTPS/HTTP  /api/*          │
          └──────────────┬───────────────┘
                         │
              ┌──────────▼───────────┐
              │  Spring Boot 3 (8080) │
              │  Controller / Service │
              │  MyBatis · JWT        │
              └──────────┬───────────┘
                         │
              ┌──────────▼───────────┐
              │  MySQL 8.0 (3306)     │
              │  donghua_shop         │
              └──────────────────────┘
```

- 开发期：Vite dev server 通过 `server.proxy` 把 `/api` 转发到 `127.0.0.1:8080`，前端不处理跨域。
- 部署期（第 8 周）：Nginx 托管 `dist` 静态文件并反代 `/api`；`VITE_API_BASE_URL=/api` 保持不变。
- Redis：本期不引入。购物车与登录态落 MySQL/JWT，理由见 §7 决策记录 D-04。

## 2 技术栈与实测版本

下表版本为本机实测结果（2026-10-26，`scripts/verify-env.ps1` 输出），不是计划值。

| 组件 | 版本 | 用途 | 位置 |
| --- | --- | --- | --- |
| Node.js | 22.19.0 | 前端构建 | 系统已装 |
| pnpm | 10.34.9 | 依赖管理（工作区） | `tools/pnpm` |
| Vite | 6.4.5 | 开发服务器与打包 | 两个前端工程 |
| Vue | 3.5.x | 视图框架 | 同上 |
| Vant | 4.9.x | 用户端移动组件库 | `user-h5` |
| Element Plus | 2.9.x | 管理端组件库 | `admin-web` |
| Pinia | 2.3.x | 状态管理 | 两端 |
| Vue Router | 4.5.x | 路由与访问控制（hash 模式） | 两端 |
| Axios | 1.7.x | 请求层 | 两端 |
| JDK | 17.0.20.1 (Temurin) | 后端运行（本期仅验证工具链） | `tools/jdk17` |
| Maven | 3.9.9 | 后端构建 | `tools/apache-maven-3.9.9` |
| MySQL | 8.0.46 | 数据库 | 系统服务 `MySQL80` |

> 版本锁定策略：`package.json` 使用 `^` 范围 + 提交 `pnpm-lock.yaml`；换机执行 `pnpm install --frozen-lockfile` 复现。

## 3 前端工程结构

```
frontend/
├─ pnpm-workspace.yaml        # 工作区：user-h5 + admin-web
├─ .npmrc                     # 国内镜像、工作区内 store
├─ package.json               # 聚合脚本：build / dev:h5 / dev:admin
├─ user-h5/
│  ├─ .env.development        # VITE_USE_MOCK=true
│  ├─ .env.production         # VITE_USE_MOCK=false
│  ├─ vite.config.js          # 端口 5173，/api → 8080
│  └─ src/
│     ├─ api/http.js          # axios 实例、令牌注入、外壳拆解、401 跳登录、Mock 挂载
│     ├─ api/user.js          # 按业务域封装：auth / catalog / cart / address / order
│     ├─ mock/{data,index}.js # 内存数据集 + 路由表 + axios adapter
│     ├─ stores/{auth,cart}.js
│     ├─ router/index.js      # 路由表 + 登录守卫
│     ├─ views/*.vue          # 8 个页面
│     └─ styles/app.css       # 主题变量、手机画布、占位图
└─ admin-web/
   ├─ vite.config.js          # 端口 5174
   └─ src/
      ├─ api/{http,admin}.js
      ├─ constants/order.js   # 订单状态与状态机（唯一来源）
      ├─ mock/{data,index}.js
      ├─ layout/AdminLayout.vue
      ├─ router/index.js
      └─ views/*.vue          # 登录、工作台、分类、菜品、套餐、订单
```

分层约定：

1. `views` 只调用 `api/*`，不出现 `axios`、不拼 URL、不判断 HTTP 状态码。
2. `api/*` 只做参数与返回值透传，不写业务判断（金额、状态合法性由后端决定）。
3. `stores` 只缓存跨页面共享状态（登录用户、购物车），页面级列表数据留在页面。
4. `mock/*` 与 `api/*` 一一对应，响应外壳、字段名、错误码必须与契约一致。

## 4 请求层设计（两端一致）

```js
// 请求：注入令牌
config.headers.Authorization = `Bearer ${getToken()}`

// 响应：拆外壳
if (body.code === 0) return body.data
throw new ApiError(body.code, body.message, response.status)

// 失败：401 清令牌 + 跳登录；其余统一 ApiError
```

- 令牌存放：`localStorage`（`dh_shop_user_token` / `dh_shop_admin_token`）。课程内可接受；XSS 风险与 `httpOnly Cookie` 的取舍记入 §7 D-05。
- Mock 挂载点：`if (USE_MOCK) service.defaults.adapter = mockRequest`，业务代码零改动即可切换真实后端。
- 超时 10s；GET 不做重试（避免误用），提交类接口由按钮 loading 防重复提交。
- 统一错误对象 `ApiError { code, message, status }`，页面只读 `message` 做提示。

## 5 路由与访问控制

| 端 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| H5 | `/login` | 公开 | 登录后回跳 `redirect` 参数 |
| H5 | `/home`、`/dish/:id` | 公开 | 浏览无需登录 |
| H5 | `/cart`、`/order/confirm`、`/orders`、`/orders/:id`、`/addresses*` | 需登录 | 守卫拦截并带 `redirect` |
| H5 | `/profile` | 公开但按登录态渲染 | 未登录显示“去登录” |
| 管理端 | `/login` | 公开 | — |
| 管理端 | `/dashboard`、`/categories`、`/dishes`、`/setmeals`、`/orders` | 需登录 | `AdminLayout` 子路由 |

采用 hash 路由（`createWebHashHistory`）：静态托管时无需服务端 history 回退配置，降低第 8 周部署风险。

前端守卫只做“有没有令牌”的粗判，**真正的权限校验在后端**；越权访问必须由后端返回 40301。

## 6 状态管理与数据流

| Store | 状态 | 何时刷新 |
| --- | --- | --- |
| `auth`（用户端） | `token`、`user` | 登录成功写入本地；退出清除 |
| `cart`（用户端） | `items`、`count`、`total` | 加购/改数量/删除/进入购物车/下单成功后 |
| `auth`（管理端） | `token`、`employee` | 同上 |

购物车合计始终由后端返回的 `amount` 累加得出，前端不做“单价 × 数量”的重算，避免与后端口径漂移。

## 7 决策记录

| 编号 | 决策 | 备选方案 | 结论与理由 | 状态 |
| --- | --- | --- | --- | --- |
| D-01 | 用户端新建 Vue 3 + Vant 工程 | 复用 uni-app 用户端工程 | 该工程不在本机，H5 构建未经验证；新建可保证技术栈符合任务书 | 组员提交，待组长确认 |
| D-02 | 管理端不迁移 Vue 2 + Element UI 旧代码 | 直接迁移苍穹外卖管理端 | 旧工程依赖 Vue 2（已停止维护）与 Element UI，迁移工作量大于按信息架构重写 | 待组长确认 |
| D-03 | 采用 hash 路由 | history 路由 | 免服务端回退配置，降低部署风险；对 SEO 无要求 | 已采用 |
| D-04 | 第 1~3 周不引入 Redis | 用 Redis 存购物车/令牌 | 课程范围未强制；单机 MySQL 足以支撑演示，减少环境依赖 | 待评审 |
| D-05 | 令牌存 localStorage | httpOnly Cookie | 前后端分离 + 课程演示便利；已知 XSS 风险，需前端不渲染不可信 HTML | 待评审 |
| D-06 | 金额以字符串传输 | 浮点数 | 避免 `0.1+0.2` 类精度问题，与 `DECIMAL(10,2)` 对应 | 待评审 |
| D-07 | Mock 用 axios adapter 而非独立 Mock 服务器 | MSW / vite-plugin-mock | 零额外运行时依赖，构建产物可关闭，切换成本最低 | 已采用 |

## 8 构建与运行

```powershell
# 1) 注入工具链（每个新终端执行一次）
. .\scripts\env.ps1

# 2) 首次准备：JDK17 / Maven / pnpm / 数据库
.\scripts\setup-env.ps1 -All

# 3) 自检（PASS/FAIL 表）
.\scripts\verify-env.ps1

# 4) 开发
.\scripts\dev-h5.ps1        # http://127.0.0.1:5173 （Mock 模式）
.\scripts\dev-admin.ps1     # http://127.0.0.1:5174 （Mock 模式）

# 5) 构建
.\scripts\build-frontend.ps1

# 6) 契约自检
node tools\validate-openapi.js
```

构建注意事项（本机实测）：

- PowerShell 执行策略默认禁止运行脚本，需 `Set-ExecutionPolicy -Scope Process Bypass`，或
  `powershell -ExecutionPolicy Bypass -File scripts\build-frontend.ps1`。
- esbuild 会把中间文件写入系统 `TEMP`；本机 OneDrive 环境的 `TEMP` 目录会出现删除被拒（`Access is denied`）。
  `scripts/build-frontend.ps1` 已把 `TEMP/TMP` 指向项目内 `.tmp`，请勿绕过该脚本直接 `vite build`。
- 本机 `curl`/`Invoke-WebRequest` 走 schannel 时报 `SEC_E_NO_CREDENTIALS`，下载一律用 Node（`tools/fetch.js`）。

## 9 质量与验证

| 项 | 方式 | 当前结果 |
| --- | --- | --- |
| 语法/构建 | `vite build` 两工程 | 通过：user-h5 26 文件 / 607.8 KB；admin-web 19 文件 / 1624.5 KB |
| 契约一致性 | `tools/validate-openapi.js` | 41/41 前端调用被契约覆盖，231 个 `$ref` 全部可解析 |
| 数据库可重建 | `scripts/db-init.ps1` | 通过：11 张表，17 菜品 / 3 套餐 / 2 员工 / 2 订单 |
| 环境可复现 | `scripts/verify-env.ps1` | 见 `docs/testing/frontend-selfcheck.md` |
| 接口真实联调 | 待第 6 周 | 未开始，当前全部为 Mock |

## 10 风险

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 契约频繁变更 | 前端返工 | 第 3 周冻结；变更走 PR + 我方字段清单同步 |
| 后端未就绪 | 无法真联调 | Mock + 契约自检脚本先行 |
| 管理端打包体积 1.2 MB | 首屏慢（内网影响小） | 第 5 周按需引入 Element Plus 或配置 manualChunks |
| 图片字段无内容 | 演示观感 | 统一占位图组件；第 8 周前定 OSS/静态目录方案 |
| 单机环境差异 | 换机跑不起来 | `setup-env.ps1` + `verify-env.ps1` + 版本表 |
