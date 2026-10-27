> **状态：组员第 1~3 周草案（已归档，勿作为依据）**
> 组长刘晟玺已交付正式版本，权威文件见 `docs/leader/docs/integration/runbook.md`；本文件仅保留为过程留痕。
> 最新整合结果与实测证据见 `docs/integration/`（contract-diff / page-api-map / defects / integration-record）。
# 开发环境配置说明

| 项 | 内容 |
| --- | --- |
| 适用 | 东华大学在线点餐系统（前端 + 后端联调） |
| 编写 | 钱文博（组员） |
| 验证日期 | 2026-10-26 |
| 验证结论 | 工具链、数据库、两套前端工程、契约自检 **全部通过**（`scripts/verify-env.ps1` 10/10 PASS） |
| 目标机器 | Windows 11 + PowerShell 5.1；其他成员换机后按本文复现 |

## 1 版本与环境矩阵（实测）

| 组件 | 本机原状 | 本项目要求 | 本项目做法 | 实测版本 |
| --- | --- | --- | --- | --- |
| JDK | PATH 上是 JDK 1.8.0_73（32 位），另有 JDK 25 | Java 17 | 便携 Temurin JDK 17 解压到 `tools/jdk17`，只在脚本会话里生效 | 17.0.20.1 |
| Maven | 已装但未入 PATH，且默认挂 JDK 8 | 3.9.x | 复制到 `tools/apache-maven-3.9.9`，`settings.xml` 指向阿里云镜像 + 项目内仓库 | 3.9.9 |
| Node.js | 22.19.0（系统） | ≥18 | 直接使用系统 Node | 22.19.0 |
| pnpm | 未安装 | 10.x | `npm install --prefix tools/pnpm pnpm@10`，工作区内自包含 | 10.34.9 |
| MySQL | 8.0 服务已装并运行，客户端不在 PATH | 8 | 用绝对路径调用 `mysql.exe`，建独立库与专用账号 | 8.0.46 |
| Redis | 未安装 | 备选 | **本期不引入**（技术方案 D-04），购物车/登录态落 MySQL + JWT | — |
| Git | 已装（`D:\rengongzhineng\Git`） | — | 直接使用 | — |
| Python | 非必需 | — | 仅用于生成本周报 DOCX 与文档校验 | 3.x |

> 为什么不改系统环境变量：本机还有其它依赖 JDK 8 的工程（含 `D:\Java\apache-maven-3.9.9` 默认挂的就是 JDK 8）。
> 把 17 装进项目目录、由脚本按需注入，既不影响别的项目，也方便卸载重装。

## 2 目录约定

```text
donghua-shop/
├─ tools/                 # 便携工具链（已 .gitignore，不入库）
│  ├─ jdk17/              # Temurin JDK 17（180 MB 解压后）
│  ├─ apache-maven-3.9.9/ # Maven + conf/settings.xml（阿里云镜像）
│  ├─ pnpm/               # pnpm 10（node_modules/.bin/pnpm.cmd）
│  ├─ m2-repository/      # Maven 本地仓库（避免污染用户 ~/.m2）
│  ├─ npm-cache/          # npm 缓存
│  ├─ yaml/               # js-yaml，仅用于契约校验脚本
│  └─ fetch.js            # Node 下载器（绕开本机 TLS 限制）
├─ config/
│  ├─ env.example.ps1     # 私密配置模板（入库）
│  └─ env.local.ps1       # 真实口令（已 .gitignore，不入库）
├─ scripts/
│  ├─ env.ps1             # 注入 JAVA_HOME/PATH/数据库参数（dot-source）
│  ├─ setup-env.ps1       # 一次性装齐 JDK/Maven/pnpm/数据库
│  ├─ db-init.ps1         # 建库、建账号、导表结构、灌种子数据
│  ├─ verify-env.ps1      # 自检表（PASS/FAIL）
│  ├─ build-frontend.ps1  # 构建两个前端工程
│  ├─ dev-h5.ps1          # 启动用户端 5173
│  └─ dev-admin.ps1       # 启动管理端 5174
├─ docs/                  # 需求、架构、数据库、接口、会议、测试
└─ frontend/              # pnpm 工作区：user-h5 + admin-web
```

## 3 从零配置（换机复现）

```powershell
# 0) 允许本会话执行脚本（Windows 默认禁止）
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 1) 进入项目根目录后，一次性安装工具链与数据库
.\scripts\setup-env.ps1 -All

# 2) 校验（要求 10 项全部 PASS）
. .\scripts\env.ps1
.\scripts\verify-env.ps1

# 3) 前端依赖 + 构建
cd frontend
..\tools\pnpm\node_modules\.bin\pnpm.cmd install --frozen-lockfile
cd ..
.\scripts\build-frontend.ps1
```

`setup-env.ps1 -All` 会做四件事：

1. 从清华镜像下载 Temurin JDK 17 zip（`tools/fetch.js`），解压到 `tools/jdk17`；
2. 从本机 `D:\Java\apache-maven-3.9.9` 复制 Maven（不存在时改为镜像下载），写入阿里云镜像 `settings.xml`；
3. `npm install --prefix tools/pnpm pnpm@10`；
4. 调用 `db-init.ps1` 建库、建账号、导表与种子数据。

数据库口令放在 `config/env.local.ps1`（模板为 `config/env.example.ps1`），**不入库**：

```powershell
$Env:DH_DB_ROOT_PASSWORD = '...'   # root 口令，仅本机
$Env:DH_DB_APP_PASSWORD  = '...'   # 应用账号 dh_shop 的口令
```

## 4 数据库

| 项 | 值 |
| --- | --- |
| 库名 | `donghua_shop`（utf8mb4 / utf8mb4_general_ci） |
| 应用账号 | `dh_shop`@`localhost` 与 `dh_shop`@`127.0.0.1` |
| 权限 | SELECT/INSERT/UPDATE/DELETE/CREATE/DROP/INDEX/ALTER/REFERENCES，仅限该库 |
| root 用途 | 仅 `db-init.ps1` 建库建账号时使用，业务连接一律用 `dh_shop` |
| 建表 | `docs/database/schema.sql`（11 张表） |
| 种子数据 | `docs/database/data.sql`（6 分类 / 17 菜品 / 3 套餐 / 2 员工 / 2 订单） |
| 连通性 | 服务名 `MySQL80`，端口 3306，本机 loopback |

验证（`db-init.ps1` 末尾自动执行）：

```text
指标      值
表数量    11
分类      6
菜品      17
套餐      3
员工      2
订单      2
```

后端第 4 周接入时的参考配置（Spring Boot `application.yml`）：

```yaml
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/donghua_shop?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useSSL=false
    username: dh_shop
    password: ${DH_DB_APP_PASSWORD}
```

## 5 前端

| 端 | 目录 | 端口 | 环境文件 | Mock |
| --- | --- | --- | --- | --- |
| 用户 H5 | `frontend/user-h5` | 5173 | `.env.development` / `.env.production` | dev 开、prod 关 |
| 管理 Web | `frontend/admin-web` | 5174 | 同上 | dev 开、prod 关 |

```powershell
.\scripts\dev-h5.ps1      # http://127.0.0.1:5173
.\scripts\dev-admin.ps1   # http://127.0.0.1:5174
```

联调切真实后端：把 `.env.development` 的 `VITE_USE_MOCK` 改为 `false`，Vite 会把 `/api` 代理到 `127.0.0.1:8080`。

## 6 已知问题与处理（本机实测）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `无法加载文件 ... 未对文件进行数字签名` | PowerShell 执行策略为 RemoteSigned/Restricted | `Set-ExecutionPolicy -Scope Process Bypass`，或 `powershell -ExecutionPolicy Bypass -File scripts\xxx.ps1` |
| 脚本中文乱码或语法错误（`字符串缺少终止符`） | Windows PowerShell 5.1 按 ANSI 读取无 BOM 的 UTF-8 脚本 | 所有 `.ps1` 保存为 **UTF-8 with BOM**（已统一处理） |
| `curl` / `Invoke-WebRequest` 报 `SEC_E_NO_CREDENTIALS`、`基础连接已关闭` | 本机 schannel 客户端凭证受限 | 下载改用 `node tools/fetch.js get <url> <out>` |
| `vite build` 报 `[vite:esbuild-transpile] remove ...Access is denied` | esbuild 中间文件写在系统 `TEMP`，本机 OneDrive 环境删除被拒 | 用 `scripts/build-frontend.ps1`（内部把 `TEMP/TMP` 指向项目 `.tmp`） |
| `pnpm install` 后 `Cannot find package 'picomatch'` | 依赖未装全（构建脚本被跳过导致中断） | 重新 `pnpm install`；`pnpm-workspace.yaml` 已声明 `onlyBuiltDependencies: [esbuild, vue-demi]` |
| `mvn -v` 显示 Java 8 | 未先执行 `. .\scripts\env.ps1` | 先 dot-source 环境脚本，`verify-env.ps1` 会校验“Maven 运行时 JDK = 17” |
| `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` | 换了 `store-dir`（或从别处拷来 node_modules）后 pnpm 需重建目录，但非交互终端无法确认 | 在 frontend 目录执行前设置 `$env:CI = 'true'`，再 `pnpm install --frozen-lockfile`；正常全新安装不需要 |
| `vite build` 结束时多出 `pnpm.cmd : ... RemoteException` 噪声 | pnpm/vite 把告警写到 stderr，PowerShell 5.1 把它当错误对象打印 | 用 `scripts/build-frontend.ps1`（内部 cmd 重定向到 `.tmp\frontend-build.log` 再回显） |
| 手机访问不到 5173 | dev server 默认只绑 `127.0.0.1` | 临时改 `vite.config.js` 的 `host: '0.0.0.0'`，同一 Wi-Fi 下用电脑 IP 访问 |

## 7 安全与合规

1. `config/env.local.ps1`、`tools/` 已在 `.gitignore` 中，口令与二进制不入库。
2. 数据库口令仅本机使用；提交作业时若需演示，用 `dh_shop` 账号而非 root。
3. 课程内不接入真实短信、支付、实名信息；`employee.id_number`、`user.phone` 均为虚构数据。
4. 密码列存散列值，不存明文（算法待第 3 周定稿，见数据库评审意见 4）。
