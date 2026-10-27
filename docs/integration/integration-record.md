# 前后端联调记录（组员侧）

| 项 | 内容 |
| --- | --- |
| 执行日期 | 2026-10-27 |
| 参与 | 钱文博（前端接入、脚本联调、缺陷登记）；刘晟玺（后端与契约作者，本轮未同时在线，问题以文档形式登记） |
| 契约版本 | `docs/leader/week3/openapi.yaml` v1.0.0-draft |
| 后端 | `code/backend`（组长交付源码），本机以 JDK 17.0.20.1 构建并运行 |
| 数据库 | MySQL 8.0.46，库 `takeout_course`（组长 `docs/leader/week2/schema.sql` 建表 + 种子数据） |
| 前端 | `code/frontend/user-h5`（5173）、`code/frontend/admin-web`（5174），Vite 代理到 8080 |
| 性质说明 | 这是**组员侧单机联调**：真实后端 + 真实库 + 真实 HTTP。组长未在线共同核对，因此不写成“双方联调通过” |

## 1 环境就绪过程（可复现）

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 建库 | `.\scripts\db-init-backend.ps1` | 11 张表；2 分类 / 2 菜品 / 1 套餐 / 2 用户 / 2 地址；应用账号 `sky_app` |
| 构建后端 | `mvn -B -DskipTests package`（项目内 JDK17 + Maven 3.9.9 + 阿里云镜像） | BUILD SUCCESS，产出 `sky-server-1.0-SNAPSHOT.jar` |
| 启动后端 | `.\scripts\run-backend.ps1` | Tomcat 8080 启动，`/user/shop/status` 返回 `code=1,data=1` |
| 启动前端 | `.\scripts\dev-h5.ps1` / `.\scripts\dev-admin.ps1` | 5173 / 5174 可用，代理穿透测量见 `frontend-self-test.md` |

启动过程中遇到并解决的环境问题：

1. Maven 默认写 `~/.m2/repository` 时出现 `AccessDeniedException` → 改为项目内 `tools/m2-repository`（`conf/settings.xml` 固定）；
2. Tomcat 启动时在系统 `TEMP` 创建目录被拒 → 启动脚本传 `-Djava.io.tmpdir=<项目>\.tmp`；
3. 首次需要管理员账号 → 启动时以 `COURSE_ADMIN_PASSWORD` 创建 `admin`，已存在则不重置。

## 2 主流程结果（真实接口）

脚本：`node scripts/smoke-api.mjs`，证据：`docs/integration/evidence/api-smoke.json`

| 顺序 | 场景 | 通过标准 | 实际结果 |
| --- | --- | --- | --- |
| 1 | 两端登录 → 用户浏览真实商品 | 数据来自实际 Java 服务 | 通过：`demo-user` 登录拿到 JWT；分类/菜品/套餐/口味/套餐组成均来自 MySQL |
| 2 | 加购 → 改数量 → 选址 → 下单 → 模拟支付 | 金额以服务端为准；下单清车；支付后变待接单 | 通过：客户端传 `amount=0.01`，后端按 36 记账；清车；状态 1→2 |
| 3 | 员工接单 → 派送 → 完成 → 用户刷新 | 同一订单 2→3→4→5 | 通过：`conditionSearch` 查到同单，confirm/delivery/complete 依次成功，用户详情 `status=5` 且写入 `deliveryTime` |
| 4 | 新建/修改商品 → 起售停售 → 用户查询 | 管理修改在用户侧体现 | 部分：菜品分页/详情/口味读取通过；“新增菜品”仅接口就绪，未在页面点击 |
| 5 | 未登录 / 过期令牌 / 空购物车 / 重复点击 / 非法状态 | 提示与实际响应一致 | 通过：无令牌 401；非法 loginCode 被拒；重复支付幂等；按钮 loading 防重复提交 |
| 6 | A 建资源，B 用 A 的 ID 请求 | 服务端拒绝越权 | 未执行：需要第二个用户令牌在同一脚本里串跑，本机两身份均可登录，但未做交叉越权用例（组长自测已覆盖，我这侧补做） |
| 7 | 查询统计核对刚完成的订单 | 日期与口径一致 | 通过：`businessData.turnover=36`、`validOrderCount=1`、`turnoverList=36.00` |

## 3 缺陷与结论

- 登记 6 条契约/实现差异：F-01 ~ F-06，见 `docs/integration/defects.md`。
- 其中 F-01（购物车 `amount` 是单价）会直接导致金额显示错误，**已在前端修正**，并建议契约明确字段语义。
- F-04（无用户端菜品详情接口）属契约缺口，前端已用“列表 + 定位”绕过，建议组长增补。

## 4 证据清单

| 证据 | 路径 |
| --- | --- |
| 接口冒烟原始结果（37 项逐项 OK/detail） | `docs/integration/evidence/api-smoke.json` |
| 构建与代理测量 | `docs/integration/frontend-self-test.md` |
| 页面接口对应表 | `docs/integration/page-api-map.md` |
| 缺陷台账 | `docs/integration/defects.md` |
| 运行手册 | `docs/integration/runbook.md` |

## 5 与组长后续需对齐的事项

1. F-01/F-03/F-05 建议同步修订 OpenAPI（字段语义、返回类型、口味编码），前端随后做一次回归；
2. F-04 是否增补用户端菜品详情接口；
3. 第 8 周部署：Nginx 需要反代 `/user`、`/admin`、`/assets`，前端产物为纯静态；本机尚未做 Nginx 验证；
4. 越权用例（场景 6）与浏览器截图留待下次双方在线时补做，并由组长核对后端日志。
