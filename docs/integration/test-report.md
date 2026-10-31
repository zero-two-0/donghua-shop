# 系统测试报告

| 项 | 内容 |
| --- | --- |
| 项目 | 东华大学在线点餐系统（用户 H5 + 管理 Web + Spring Boot 后端） |
| 版本 | 前端与后端均为 Git `09459e4` 之后的本地工作区版本；契约 `docs/leader/week3/openapi.yaml` v1.0.0-draft |
| 测试环境 | Windows 11 + PowerShell 5.1；JDK 17.0.20.1（Temurin）、Maven 3.9.9、Node 22.19.0、pnpm 10.34.9；MySQL 8.0.46（库 `takeout_course`）；浏览器 Microsoft Edge 156（无头 + CDP） |
| 被测对象 | `code/backend`（组长交付，未修改）、`code/frontend/user-h5`、`code/frontend/admin-web` |
| 执行人 | 钱文博（组员，接口/权限/静态部署/浏览器四类测试）；后端单元与整合测试由组长在 H2 环境完成（50 项） |
| 执行日期 | 2026-10-27 |
| 说明 | 本报告只写实际执行过的内容；未执行项单列在第 5 节，**不作为通过项** |

## 1 测试策略

1. **接口级**：直接打真实后端（真实 MySQL），覆盖主流程、异常边界、权限与越权；脚本化、可重复执行，结果落 JSON 证据。
2. **构建与静态部署级**：验证两套前端可构建、产物可脱离 dev server 独立运行（静态托管 + 同源反代，等价 Nginx 规则）。
3. **浏览器级**：Edge 无头 + CDP 真实渲染页面、注入真实登录态，断言页面文字、截图留证，并做 320px / 1280px 布局检查。
4. 不为“跑通”而放宽断言；发现脚本本身有问题时先修脚本再重跑（本次修正过 2 处，见第 4 节）。

## 2 用例与结果汇总

| 套件 | 脚本 | 项数 | 通过 | 失败 | 证据 |
| --- | --- | ---: | ---: | ---: | --- |
| 主流程 / 浏览 / 交易 / 管理 / 统计 | `scripts/smoke-api.mjs` | 37 | 37 | 0 | `evidence/api-smoke.json` |
| 权限与越权（双身份交叉） | `scripts/smoke-authz.mjs` | 22 | 22 | 0 | `evidence/api-authz.json` |
| 异常与边界（空车、停售、数量、非法状态、幂等、取消规则） | `scripts/smoke-exceptions.mjs` | 16 | 16 | 0 | `evidence/api-exceptions.json` |
| 构建产物静态托管 + 反代 | `scripts/check-static-deploy.mjs` | 13 | 13 | 0 | `evidence/static-deploy.json` |
| 浏览器渲染与响应式 | `scripts/browser-check.mjs` | 14 | 14 | 0 | `evidence/browser-check.json` + `evidence/shots/` |
| **合计** | — | **102** | **102** | **0** | — |

另：组长在 H2 + MockMvc 环境执行 50 项自动化测试（`docs/leader/week4/backend-self-test.md`），本次不重复计入。

## 3 关键验证点

| 验证点 | 结果 |
| --- | --- |
| 客户端伪造金额不被采信 | 传 `amount=0.01`，后端按 18×2=36 记账并落库 |
| 下单后购物车清空 | 提交后 `shoppingCart/list` 为空 |
| 订单状态闭环 | 2→3→4→5，用户端详情同步，写入派送/完成时间 |
| 统计口径 | 完成后工作台营业额 36、有效单 1、报表 `turnoverList=36.00` 一致 |
| 业务码与 HTTP 状态 | `code=1` 成功、`code=0` 业务失败、401 用于未认证；前端拦截器按 `code` 判断并提示 `msg` |
| 越权 | 22 项全部被拒绝（“不存在或无权访问”），且被访问方数据未被改动 |
| 停售商品 | 管理端停售后用户端列表不再返回、加购被拒（“菜品不存在或已停售”） |
| 数量边界 | 0 与 100 均被拒（“数量必须为1至99”） |
| 非法状态迁移 | 已完成订单再次接单/派送被拒（“订单状态错误”） |
| 支付幂等 | 重复支付返回同一 `paymentVO`，无二次变更 |
| 取消规则 | 待付款/待接单可取消，取消后 `status=6`、`payStatus=2`（模拟退款）；已取消再次取消被拒 |
| 静态部署 | 首页、入口 JS、食材图、登录、受保护接口、SPA 回退全部正常 |
| 响应式 | 390 / 1280 / 320 三种宽度均无横向滚动；320px 下分类名与“加入购物车”按钮完整可见 |
| 路由守卫 | 未登录访问 `#/cart` 跳转 `#/login?redirect=/cart` |

## 4 测试过程中发现并处理的问题

| 编号 | 问题 | 处理 |
| --- | --- | --- |
| T-01 | 越权脚本取错字段（`order.number` vs 契约 `orderNumber`），导致“B 替 A 支付”因缺参数失败，属**假通过** | 改为 `order.orderNumber`，重跑后返回真正的归属拒绝 |
| T-02 | “用户可取消已支付订单”最初被误判为缺陷 | 查实现 `cancelOrder`：允许待付款/待接单取消并走模拟退款，属设计口径；改为断言取消后 `status=6/payStatus=2` |
| T-03 | 320px 窄屏首页出现横向滚动（`scrollWidth=382 > 320`），“加入购物车”被裁切 | 侧边栏/缩略图窄屏收缩、行内元素允许换行，修复后 `320=320` |
| T-04 | 反代规则把 `/assets/*.js` 也转给后端，入口 JS 404、页面白屏 | 按扩展名区分：仅 `/assets/*.svg` 反代（缺陷 F-07） |

## 5 未执行项（不计入通过）

| 项 | 原因 | 建议 |
| --- | --- | --- |
| 浏览器中的**交互操作**（点击加购、填表单、弹窗确认） | 无头浏览器的自动化只做到“渲染 + 断言 + 截图”，未做点击流 | 人工点一遍主流程，或用 Playwright 补点击级自动化 |
| 真实手机 / 局域网访问 | 未做真机 | 第 8 周按部署环境验证 |
| 真实 Nginx 验收 | 本机未安装 Nginx | 第 8 周安装后套 `deploy/nginx.conf` 验收 |
| 并发与性能 | 不在课程范围 | 不做，报告中不声称 |
| 员工改密、图片上传 | 契约未提供接口（F-06 等） | 待组长确认是否需要 |

## 6 复现命令

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\scripts\env.ps1
.\scripts\start-all.ps1                 # MySQL + 后端 8080 + 前端 5173/5174

node scripts\smoke-api.mjs              # 37
node scripts\smoke-authz.mjs            # 22
node scripts\smoke-exceptions.mjs       # 16
node scripts\check-static-deploy.mjs    # 13（需先起 serve-dist.mjs 8081/8082）
node scripts\browser-check.mjs          # 14（需 Edge，会写证据与截图）
```

## 7 结论

- 主流程、权限、异常、静态部署、浏览器渲染五类共 **102 项自动断言全部通过**，本地可一键复现。
- 后端在**真实 MySQL** 上完成交易闭环，补上了组长报告中“真实库未验证”的空档；前端在真实浏览器中可渲染、可调用真实接口、窄屏不溢出。
- 仍存在 6 处契约/实现差异（F-01~F-06，其中 F-01 已由前端适配）与 1 处部署前缀冲突（F-07 已在配置层修复），需组长确认后统一口径。
- **未执行项**已如实列出，本报告不代表课程最终验收通过；第 8 周部署验收需另出记录。
