# 把代码放到 GitHub 的操作指引与文件分类

| 项 | 内容 |
| --- | --- |
| 适用仓库 | 本目录（东华大学在线点餐系统） |
| 前提 | 本机已 `git init`，已有 1 个提交；尚未配置远程仓库 |
| 原则 | **仓库只放源码、文档、脚本、锁文件**；工具链、构建产物、依赖、本机口令一律不进仓库 |

## 1 提交前必须先做的事

仓库中**不含任何真实口令**（入库前已清理）：

- 数据库 root / 应用账号口令、管理员初始口令，全部放在 `config/env.local.ps1`，该文件被 `.gitignore` 排除；
- 脚本与文档只引用环境变量或占位符；
- 管理端登录页不再预填密码。

新机器上第一次使用前：

```powershell
Copy-Item .\config\env.example.ps1 .\config\env.local.ps1
notepad .\config\env.local.ps1    # 按注释填 4 个值
```

## 2 文件分类（该不该提交）

### 2.1 必须提交（已跟踪，287 个文件）

| 分类 | 路径 | 说明 |
| --- | --- | --- |
| 后端源码 | `code/backend/sky-common`、`sky-pojo`、`sky-server/src` | Java 源码、MyBatis XML、`application.yml`、静态资源与 `openapi.yaml` 副本 |
| 后端工程文件 | `code/backend/pom.xml`（三模块）、`sky-*/pom.xml`、`maven-settings.xml`、`README.md` | 不含 JDK/Maven 本体 |
| 后端测试 | `code/backend/sky-server/src/test/**` | 组长 50 项自动化测试 |
| 前端源码 | `code/frontend/user-h5/src`、`admin-web/src` | Vue 单文件组件、api 封装、路由、store、样式 |
| 前端工程文件 | `code/frontend/{package.json,pnpm-workspace.yaml,.npmrc,pnpm-lock.yaml}`、两端 `package.json`、`vite.config.js`、`.env.development`、`.env.production`、`index.html` | **锁文件必须提交**，保证依赖可复现 |
| 组长文档（权威） | `docs/leader/week1..week4`、`collaboration.md`、`组员前端与联调交接清单.md`、`meetings/`、`根目录材料/` | 需求、设计、契约、后端说明与自测报告 |
| 组员整合文档 | `docs/integration/*.md`、`docs/integration/evidence/api-smoke.json` | 契约差异、页面接口表、缺陷台账、联调记录、自测、运行手册 |
| 组员早期草案 | `docs/{requirements,architecture,database,api,quality,testing,deployment,meetings}` | 顶部均标注“已归档”，保留过程证据 |
| 脚本 | `scripts/*.ps1`、`scripts/smoke-api.mjs` | 环境、建库、构建、启停、接口冒烟 |
| 工具脚本 | `tools/{fetch.js,describe-openapi.js,validate-openapi.js}` | 可复用的辅助脚本（不含二进制） |
| 配置模板 | `config/env.example.ps1` | 只含占位符 |
| 仓库配置 | `.gitignore`、`.gitattributes`、`README.md`、`docs/README.md` | — |

### 2.2 绝对不能提交（已在 `.gitignore`）

| 分类 | 路径 | 原因 |
| --- | --- | --- |
| 本机口令 | `config/env.local.ps1` | 含 root/应用/管理员口令 |
| 便携 JDK | `tools/jdk17/` | 180 MB 二进制，可由 `setup-env.ps1` 重建 |
| 便携 Maven | `tools/apache-maven-3.9.9/` | 同上 |
| pnpm / npm 缓存 | `tools/pnpm/`、`tools/pnpm-store/`、`tools/npm-cache/`、`code/tools/` | 数万个小文件，重建即可 |
| Maven 本地仓库 | `tools/m2-repository/` | 数百 MB jar |
| 前端依赖 | `**/node_modules/` | 由锁文件重建 |
| 构建产物 | `**/target/`、`**/dist/` | 可重复生成 |
| 运行日志/临时 | `.tmp/`、`*.log` | 每次运行都变 |
| 个人周报 docx | 未入库（在 Desktop 文件夹） | 个人材料，需要时单独提交 |
| 系统垃圾 | `.DS_Store`、`Thumbs.db`、`__MACOSX/` | 无意义文件 |

### 2.3 可选（想提交再提交）

| 文件 | 建议 |
| --- | --- |
| `docs/meetings/个人工作周报_钱文博_第1周.docx` | 若课程要求提交周报，单独提交；体积 17 KB |
| `docs/integration/evidence/api-smoke.json` | 建议提交，作为联调证据 |
| 截图/录屏 | 放 `docs/integration/evidence/`，单张 < 1 MB；视频建议外链，不入库 |

## 3 在 GitHub 建仓库并推送

### 3.1 网页建仓库

1. 打开 https://github.com/new
2. Repository name 填 `donghua-shop`（或你们约定的名字）
3. 选 **Public**（课程展示）或 Private（加老师为 collaborator）
4. **不要**勾选 “Add a README / .gitignore / license”——本地已有，勾了会冲突
5. 点 Create repository，记下地址：`https://github.com/<你的账号>/donghua-shop.git`

### 3.2 设置提交身份（只在本仓库生效，避免影响别的项目）

```powershell
cd <你的仓库目录>\donghua-shop
git config user.name  "钱文博"
git config user.email "你的GitHub邮箱或学校邮箱"
```

### 3.3 关联远程并推送

```powershell
git remote add origin https://github.com/<你的账号>/donghua-shop.git
git remote -v                      # 确认

git push -u origin main
git push origin develop            # 协作分支
```

推送时会要求登录：

- 浏览器弹窗（Git Credential Manager）→ 选 “Sign in with your browser”；
- 或使用 **Personal Access Token** 当密码：GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token，勾 `repo` 权限，复制后粘贴到密码位置。**Token 只显示一次，勿写进代码或文档。**

### 3.4 验证

```powershell
git status                 # working tree clean
git log --oneline -3
git ls-remote origin       # 能看到 main / develop
```

浏览器打开仓库，确认 `code/`、`docs/`、`scripts/` 都在，且**没有** `node_modules`、`target`、`env.local.ps1`。

## 4 分支与协作（配合组长《协作规范》）

| 分支 | 用途 | 当前状态 |
| --- | --- | --- |
| `main` | 可演示/可验收版本 | 已有 1 个初始提交 |
| `develop` | 阶段集成 | 与 main 同点 |
| `feature/*` | 单个需求/接口批次 | 待建，例如 `feature/week5-frontend` |

推荐做法：

```powershell
git switch -c feature/week5-frontend      # 从 develop 拉
# ...改代码...
git add -A
git commit -m "feat(frontend): 接入用户端菜品口味与套餐组成"
git push -u origin feature/week5-frontend
# 到 GitHub 提 Pull Request → 组长审阅 → 合并到 develop
```

## 5 常见问题

| 现象 | 处理 |
| --- | --- |
| `remote: Support for password authentication was removed` | GitHub 不再支持账号密码，用 3.3 里的 Token 或浏览器登录 |
| 推送很慢/中断 | 仓库里若混入了 `node_modules` 会变大；用 `git ls-files | Measure-Object` 确认只有约 290 个文件 |
| 误把 `env.local.ps1` 加进来了 | `git rm --cached config/env.local.ps1`，确认 `.gitignore` 生效后再提交 |
| 满屏 `LF will be replaced by CRLF` | 已加 `.gitattributes` 统一处理，可以忽略 |
| 想改提交里的邮箱/名字 | `git commit --amend --reset-author --no-edit`（尚未推送时） |
| 推送后才发现提交了密码 | 立刻改口令 + 用 `git filter-repo` 清历史，并视为已泄露 |

## 6 课程要求的留痕

按组长规范，每个 PR 需要写：目的/需求 ID、变更、验证命令与结果、调用方影响、审阅要点。模板见 `docs/leader/collaboration.md` 第 3 节。
