# 部署与验收说明

| 项 | 内容 |
| --- | --- |
| 版本 | 前端 `code/frontend/*`、后端 `code/backend`（组长交付）、配置 `deploy/nginx.conf` |
| 目标 | 在一台机器上以“MySQL + 后端 JAR + Nginx 静态托管”的方式运行，供课程演示与验收 |
| 当前状态 | **本机已完成等价验证**（Node 静态托管 + 反代，13 项通过）；**Nginx 尚未安装、未做真实验收**，第 8 周执行 |
| 编写 | 钱文博；后端启动参数与环境变量见 `code/backend/README.md`（组长） |

## 1 端口与账号

| 组件 | 端口 | 说明 |
| --- | --- | --- |
| MySQL | 3306 | 库 `takeout_course`；应用账号 `sky_app` |
| 后端 | 8080 | Spring Boot JAR，`--spring.profiles.active=course` |
| 用户 H5 | 8081 | Nginx 静态站点（当前等价验证用 8081） |
| 管理 Web | 8082 | Nginx 静态站点 |
| 用户端 dev | 5173 | 仅开发期，Vite 代理 |
| 管理端 dev | 5174 | 仅开发期 |

账号：用户 `demo-user` / `demo-user-2`（受控白名单）；员工 `admin`（口令由 `COURSE_ADMIN_PASSWORD` 首次启动创建，不入库、不入文档）。

## 2 部署步骤

```powershell
# 0) 脚本执行策略（Windows）
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 1) 工具链 + 本地口令（config/env.local.ps1，已被 gitignore）
Copy-Item .\config\env.example.ps1 .\config\env.local.ps1
notepad .\config\env.local.ps1
.\scripts\setup-env.ps1 -All

# 2) 数据库：按组长 schema.sql 建库 + 专用账号 + 种子数据
.\scripts\db-init-backend.ps1

# 3) 后端：构建并启动（真实 MySQL）
. .\scripts\env.ps1
Push-Location code\backend; & $env:MAVEN_HOME\bin\mvn.cmd -B -DskipTests package; Pop-Location
.\scripts\run-backend.ps1            # 后台启动，日志 .tmp\backend.log

# 4) 前端：构建静态产物
.\scripts\build-frontend.ps1         # 产出 code\frontend\{user-h5,admin-web}\dist

# 5) 静态托管 + 反代
#    a. 生产：安装 Nginx，套用 deploy\nginx.conf（改 root 与端口），nginx -t 后 reload
#    b. 本机等价验证（无 Nginx 时）：
node scripts\serve-dist.mjs code\frontend\user-h5\dist 8081
node scripts\serve-dist.mjs code\frontend\admin-web\dist 8082

# 6) 冒烟验收
node scripts\smoke-api.mjs           # 37 项
node scripts\check-static-deploy.mjs # 13 项（需 COURSE_ADMIN_PASSWORD 环境变量）
```

## 3 环境变量（后端）

| 变量 | 用途 | 本地演示值来源 |
| --- | --- | --- |
| `SERVER_PORT` | HTTP 端口，默认 8080 | 脚本内固定 8080 |
| `DB_URL` | JDBC URL，默认本机 `takeout_course` | 脚本内固定 |
| `DB_USERNAME` / `DB_PASSWORD` | 数据库账号 | `config/env.local.ps1` 的 `SKY_DB_APP_PASSWORD` |
| `COURSE_ADMIN_PASSWORD` | 首次启动创建 admin | `config/env.local.ps1` 的 `COURSE_ADMIN_PASSWORD` |
| `SKY_JWT_ADMINSECRETKEY` / `SKY_JWT_USERSECRETKEY` | 固定 JWT 密钥（否则重启换密钥） | 启动脚本内固定演示值，**部署必须换成独立高熵值** |

## 4 验收清单

> 第 8 周在目标机逐项执行并把“实测”列填上；当前只有第 4 列“本机等价验证”的结果。

| # | 检查项 | 方式 | 本机等价验证 | 目标机实测 | 结论 |
| --- | --- | --- | --- | --- | --- |
| D-01 | 数据库建表 11 张、种子数据齐备 | `db-init-backend.ps1` 输出 | 通过（11 表 / 2 分类 / 2 菜品 / 1 套餐 / 2 用户 / 2 地址） | 待填 | — |
| D-02 | 后端启动并监听 8080 | 访问 `/user/shop/status` | 通过（code=1） | 待填 | — |
| D-03 | 员工登录可用 | `POST /admin/employee/login` | 通过（code=1，“课程管理员”） | 待填 | — |
| D-04 | 用户端静态站可打开 | 浏览器访问 8081 | 通过（Edge 无头渲染 + 截图） | 待填 | — |
| D-05 | 管理端静态站可打开 | 浏览器访问 8082 | 通过 | 待填 | — |
| D-06 | 接口同源可达（无 CORS 报错） | 浏览器 Network | 通过（13/13） | 待填 | — |
| D-07 | 菜品图片可显示 | `/assets/dish-1.svg` | 通过（image/svg+xml） | 待填 | — |
| D-08 | SPA 回退可用 | 访问 `/home` | 通过（返回 index.html） | 待填 | — |
| D-09 | 主流程闭环（下单→支付→接单→派送→完成） | `smoke-api.mjs` | 通过（37/37） | 待填 | — |
| D-10 | 越权被拒 | `smoke-authz.mjs` | 通过（22/22） | 待填 | — |
| D-11 | 窄屏可用 | 320px 视口 | 通过（无横向滚动） | 待填 | — |
| D-12 | Nginx 配置语法 | `nginx -t` | **未执行（未安装）** | 待填 | — |
| D-13 | 真机/局域网访问 | 手机浏览器 | **未执行** | 待填 | — |

## 5 已知限制与回滚

| 限制 | 影响 | 处置 |
| --- | --- | --- |
| 营业状态存进程内，重启恢复“营业中” | 重启后状态不保留 | 课程可接受；如需要改为 Redis/DB，属契约变更 |
| JWT 密钥若用默认演示值 | 令牌可被伪造 | 部署时必须注入独立密钥 |
| 无 HTTPS | 仅课程内网演示 | 生产需加证书 |
| 无 Redis/WebSocket | 无推送，订单状态靠刷新 | course profile 不注册 WS 端点 |
| 图片走 `/assets/*.svg` 与前端产物同前缀 | 反代需按扩展名区分（F-07） | 已写入 nginx.conf；长期建议后端改名 |

回滚：静态站点回滚到上一版 `dist` 目录即可；后端回滚到上一版 JAR 并重启；数据库变更前先 `mysqldump` 备份（本次未做迁移，只有初始化）。

## 6 部署阶段待办（第 8 周）

1. 目标机安装 Nginx，套用 `deploy/nginx.conf`，`nginx -t` 通过后 reload；
2. 注入独立 JWT 密钥与数据库口令（环境变量，不写文件）；
3. 用真实浏览器走一遍主流程与异常，填完第 4 节“目标机实测”列；
4. 截图归档到 `docs/deployment/evidence/`，与 `test-report.md` 一起作为验收材料；
5. 若采纳 F-07 改名方案，同步修改契约、后端静态资源与前端图片路径。
