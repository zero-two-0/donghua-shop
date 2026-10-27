# 运行手册（前端 + 组长后端 + 数据库）

> 目标：换一台 Windows 机器，按本文从零跑起“用户 H5 + 管理 Web + 真实后端 + MySQL”。

## 1 端口与账号

| 组件 | 地址 | 账号 |
| --- | --- | --- |
| MySQL | 127.0.0.1:3306，库 `takeout_course` | 应用账号 `sky_app`（口令见本地 `config/env.local.ps1`；root 仅建库用） |
| 后端 | http://127.0.0.1:8080 | 员工 `admin`（口令 = 你配置的 `COURSE_ADMIN_PASSWORD`，首次启动时写入） |
| 用户 H5 | http://127.0.0.1:5173 | 课程身份 `demo-user`、`demo-user-2`（`POST /user/user/test-login`） |
| 管理 Web | http://127.0.0.1:5174 | 同上员工账号 |
| 契约/文档 | `/openapi.yaml`、`/doc.html` | 只读 |

## 2 一次性准备

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
Copy-Item .\config\env.example.ps1 .\config\env.local.ps1   # 填口令；该文件已被 .gitignore 排除
.\scripts\setup-env.ps1 -All                  # 便携 JDK17 + Maven + pnpm
.\scripts\db-init-backend.ps1                 # 按组长 schema.sql 建 takeout_course
```

`config\env.local.ps1` 需要 root 口令（脚本只在建库时用），应用连接用 `sky_app`。

## 3 构建与启动

```powershell
# 后端（首次需下载依赖，约 1~2 分钟）
. .\scripts\env.ps1
cd code\backend
mvn -B -DskipTests package
cd ..\..
.\scripts\run-backend.ps1                     # 后台启动，日志 .tmp\backend.log

# 前端
cd code\frontend
$env:CI = 'true'                              # 首次或换 store 目录时允许重建 node_modules
..\..\tools\pnpm\node_modules\.bin\pnpm.cmd install --frozen-lockfile
cd ..\..
.\scripts\dev-h5.ps1      # 5173
.\scripts\dev-admin.ps1   # 5174
```

构建前端产物：

```powershell
.\scripts\build-frontend.ps1     # 两个 dist，内部已处理 TEMP 与 stderr 噪声
```

## 4 联调自检

```powershell
node scripts\smoke-api.mjs       # 37 项接口冒烟，结果写 docs/integration/evidence/api-smoke.json
```

期望输出末尾：`合计 37 项，通过 37，失败 0`。

## 5 前端如何指向后端

- 开发期：`vite.config.js` 的 `SKY_BACKEND`（默认 `http://127.0.0.1:8080`）通过 `server.proxy` 转发 `/user`、`/admin`、`/assets`。
- 连接他人电脑上的后端：`$env:SKY_BACKEND='http://192.168.x.x:8080'` 后再启动 dev server。
- 生产：`npm run build` 产物为静态文件，Nginx 需同样反代 `/user`、`/admin`、`/assets`（后端未开 CORS）。

## 6 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 前端登录提示“网络异常，请检查后端服务是否已启动” | 8080 未启动或代理目标错 | `scripts\run-backend.ps1`；确认 `SKY_BACKEND` |
| 后端启动报 `AccessDeniedException: ...\Temp\tomcat.8080...` | 系统 TEMP 权限异常 | 用 `run-backend.ps1`（已传 `-Djava.io.tmpdir`），或手动 `java -Djava.io.tmpdir=<项目>\.tmp -jar ...` |
| Maven 报 `AccessDeniedException: ~/.m2/repository` | 用户目录仓库权限异常 | 项目 `conf/settings.xml` 已固定 `tools/m2-repository`，用项目内 Maven 执行 |
| `Table 'takeout_course.xxx' doesn't exist` | 未执行建库脚本 | `.\scripts\db-init-backend.ps1` |
| 登录 admin 失败（用户名或密码错误） | 管理员未创建或口令不同 | 首次启动时由 `config/env.local.ps1` 的 `COURSE_ADMIN_PASSWORD` 创建；已存在的账号不会被重置 |
| 401 后页面停在登录页 | 令牌过期（默认 2 小时）或后端重启且未固定 JWT 密钥 | 重新登录；联调环境用 `run-backend.ps1`（已固定本地密钥） |
| 购物车金额看起来只有一半 | `amount` 是单价（F-01） | 前端已按 单价×数量 展示；接口原始值即单价 |
| 用户端详情页显示“菜品不存在或已停售” | 无用户端菜品详情接口（F-04），且列表只返回在售 | 确认该菜品 `status=1`；如需详情接口由组长增补 |

## 7 目录指引

| 内容 | 位置 |
| --- | --- |
| 组长后端源码 | `code/backend`（组长交付，本次未修改） |
| 前端源码 | `code/frontend/{user-h5,admin-web}` |
| 组长文档（权威） | `docs/leader/week1..week4`、`docs/leader/组员前端与联调交接清单.md` |
| 我的整合文档 | `docs/integration/` |
| 我早期草案（作废） | `docs/{requirements,architecture,database,api,quality,testing,deployment}`，顶部均有状态说明 |
| 环境/构建脚本 | `scripts/` |
| 证据 | `docs/integration/evidence/` |
