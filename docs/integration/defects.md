# 联调缺陷台账（组员侧登记）

| 项 | 内容 |
| --- | --- |
| 登记人 | 钱文博（组员） |
| 环境 | 真实后端（Spring Boot 2.7.3 + MySQL 8.0.46）+ 两套前端 |
| 契约基线 | `docs/leader/week3/openapi.yaml` v1.0.0-draft |
| 说明 | 登记的是**从调用方视角发现的契约/实现差异**，不是替组长下结论；每条都附可复现证据 |

## 汇总

| 编号 | 标题 | 级别 | 归属 | 状态 |
| --- | --- | --- | --- | --- |
| F-01 | 购物车 `amount` 语义是单价而非小计，契约未写明 | P1（金额展示） | 契约 + 前端 | 前端已适配，契约待补注 |
| F-02 | 模拟支付重复调用为幂等成功，契约未说明 | P2 | 契约 | 待组长补描述 |
| F-03 | `GET /user/dish/list` 契约写 `Dish[]`，实现返回 `DishVO[]`（含 flavors） | P2 | 契约 | 前端按实现兼容 |
| F-04 | 用户端缺“菜品详情”接口 | P2 | 契约/后端 | 前端用列表定位；建议增补 |
| F-05 | 管理端菜品“口味”字段是 JSON 字符串，前端需自行解析/序列化 | P2 | 契约 | 前端已封装 `parseFlavorValues` |
| F-06 | 员工无改密接口，编辑页只能改资料 | P3 | 契约 | 前端标注限制 |
| F-07 | 前端构建产物与后端菜品图同用 `/assets/` 前缀，反代规则会误伤入口 JS | P1（部署） | 部署配置 / 后端路径 | 已在 Nginx 模板按扩展名区分；建议后端改名彻底解决 |

---

## F-01 购物车 amount = 单价（不是行小计）

- **页面/接口**：购物车 `/cart`、结算 `/order/confirm`；`GET /user/shoppingCart/list`、`PUT /user/shoppingCart/{id}?number=`
- **现象**：商品单价 18，数量改为 2 后，`data[].number=2` 但 `data[].amount` 仍为 `18`；契约字段名 `amount` 与常见“小计”含义不符。
- **后端依据**：`OrderServiceImpl` 下单时按 `Σ amount × number` 计算总额（`total = total.add(cart.getAmount().multiply(BigDecimal.valueOf(cart.getNumber())))`），加购时 `cart.setAmount(price)`，即 amount 存的是**单价**。
- **影响**：若前端把 amount 当小计展示，购物车金额显示为实际的一半（数量 > 1 时）。
- **前端处理**：新增 `lineAmount(item) = amount × number`，购物车行、结算页行金额、合计均按此公式；合计与后端下单金额一致（实测 18 × 2 = 36 与订单 `orderAmount=36` 吻合）。
- **建议**：契约把该字段改名为 `unitPrice`/`price`，或在 description 明确“单价，非小计”。改名前前端已在代码注释中标注。
- **证据**：`docs/integration/evidence/api-smoke.json` 中「购物车」组第 4 项。

## F-02 模拟支付幂等

- **页面/接口**：`PUT /user/order/payment`
- **现象**：对已支付订单再次调用，返回 `code=1` 且 `packageStr` 相同（`SIMULATED:<订单号>`），不会二次扣款，也不会报错。
- **判断**：这是**有意设计**（防双击），不是缺陷；但契约仅给了 409 的通用描述，未写明幂等语义，前端无法据此决定是否提示“已支付”。
- **前端处理**：提交按钮 loading 防重复点击；支付失败按 `msg` 提示。
- **建议**：在 OpenAPI 该接口 description 补一句“已支付订单重复调用返回同一 paymentVO，不产生二次变更”。
- **证据**：smoke 项「重复支付按设计幂等」。

## F-03 dish/list 契约与实现返回类型不一致

- **接口**：`GET /user/dish/list`
- **契约**：`ListDishResult.data: array of Dish`（`Dish` 无 `flavors` 字段）
- **实现**：`DishController.list` 返回 `Result<List<DishVO>>`，`DishVO` 含 `flavors`
- **影响**：前端若严格按契约只能拿到无口味的数据；实际按实现能拿到口味，页面才能做口味选择。
- **前端处理**：按实现兼容（`dish.flavors` 可选，缺失则不显示口味组）。
- **建议**：契约改为 `DishVO[]`（与 `/admin/dish/page` 一致），或明确 `Dish` 允许扩展字段。
- **证据**：smoke 项「GET /user/dish/list」返回 `hasFlavors: true`；源码 `controller/user/DishController.java`。

## F-04 用户端无菜品详情接口

- **现象**：契约只有 `/user/dish/list`（按分类/关键词），没有 `/user/dish/{id}`。
- **影响**：菜品详情页（`/dish/:id`）只能先拉全量列表再按 id 查找；菜品规模大时请求浪费，且若该菜品已停售会查不到（页面显示“不存在或已停售”）。
- **前端处理**：已按“全量列表 + 本地定位”实现，并在页面标注。
- **建议**：增补 `GET /user/dish/{id}`（返回 `DishVO`，停售时返回明确错误），成本很小。

## F-05 口味字段为 JSON 字符串

- **现象**：`dish_flavor.value` 存 `["不辣","微辣","中辣"]` 字符串；管理端新增/修改需要前端自己 `JSON.stringify`。
- **影响**：两端都要解析/序列化，容易写错格式（写成“不辣,微辣”也能存但不一致）。
- **前端处理**：`parseFlavorValues()` 兼容 JSON 数组与逗号分隔两种历史写法；保存时统一 `JSON.stringify(数组)`；管理端表单用“逗号分隔”输入，保存前转换。
- **建议**：契约给 `DishFlavor.value` 加 `pattern`/示例，或在后端做统一转换（DTO 用 `List<String>`）。

## F-06 员工改密无接口

- **现象**：`/admin/employee` 只有增改（改不含密码）、详情、启停，没有改密接口。
- **前端处理**：员工编辑页隐藏密码字段并提示“改密需后端提供独立接口”，不伪造入口。
- **建议**：如课程需要，增补 `PUT /admin/employee/password`（旧密码 + 新密码），或在 SRS 标注不做。

---

## 已确认无误的关键点（反向核对）

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 客户端伪造金额不被采信 | 传 `amount: 0.01`，后端按 18×2=36 记账 | smoke「后端重算金额 ≠ 客户端金额」 |
| 下单后清空购物车 | 提交后 `shoppingCart/list` 为空 | smoke「下单后购物车已清空」 |
| 用户令牌不能访问管理端 | HTTP 401 | smoke「用户令牌访问管理端被拒绝」 |
| 未登录访问受保护接口 | HTTP 401 | smoke「无令牌访问购物车返回 401」 |
| 营业状态双向生效 | 管理端 PUT 0 → 用户端 0；PUT 1 → 用户端 1 | smoke 最后两项 |
| 状态闭环 2→3→4→5 | 用户端详情最终 `status=5`，含 `deliveryTime` | smoke「用户复查订单状态为 5」 |
| 统计口径与订单一致 | 完成后 `turnover=36`、`validOrderCount=1` | smoke 统计组 |

## F-07 前端产物与后端图片同用 `/assets/` 前缀

- **场景**：`dist` 静态托管 + 同源反代（`deploy/nginx.conf`）
- **现象**：按“`/assets/` 全部反代给后端”的写法部署后，`GET /assets/index-xxx.js` 返回 **404**，页面白屏。
- **原因**：Vite 默认把入口与分包输出到 `/assets/`，后端菜品图也在 `/assets/`（`dish-1.svg`、`setmeal-1.svg`），二者同前缀冲突。
- **实测**：修正前 `static-deploy.json` 中两项 FAIL（用户端、管理端入口 JS 均 404）；按扩展名区分（仅 `/assets/*.svg` 反代）后 13/13 通过。
- **修复**：`deploy/nginx.conf` 改为 `location ~ ^/assets/.+\.svg$ { proxy_pass ...; }`，其余 `/assets/*` 走静态；`scripts/serve-dist.mjs` 同步修改。
- **长期建议**：后端把课程图片换到 `/static-assets/` 或 OSS，前端 DB 里的 `image` 路径同步调整（涉及契约与数据，需组长确认）。
- **证据**：`docs/integration/evidence/static-deploy.json`、`docs/deployment/nginx-static.md` 第 2 节。