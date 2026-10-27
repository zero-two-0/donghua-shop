# 契约差异对照：组员第 3 周草案 vs 组长正式契约

| 项 | 内容 |
| --- | --- |
| 编写 | 钱文博（组员） |
| 目的 | 说明我第 3 周按“前端调用方”视角起草的接口草案，与组长实际交付的后端/契约差在哪里，以及前端如何改到一致 |
| 组长权威版本 | `docs/leader/week3/openapi.yaml`（v1.0.0-draft，63 个 HTTP 路径） |
| 我的旧草案（已作废） | `docs/api/openapi.yaml`（v0.3.0-frozen-draft，41 个路径） |
| 结论 | **以组长契约为准，前端整体改写到其真实路径/外壳/字段**；我的草案仅保留为评审过程记录 |

## 1 差异总表

| 维度 | 我的草案（v0.3） | 组长正式契约（v1.0） | 前端处理 |
| --- | --- | --- | --- |
| 路径风格 | 自定义 REST：`/api/user/cart/items/{id}`、`/api/admin/dishes/{id}/status` | 沿用苍穹外卖：`/user/shoppingCart/add`、`/admin/dish/status/{status}?id=` | 全部改写，见第 2 节映射表 |
| 路径前缀 | `/api` | 无 `/api`（`/user/**`、`/admin/**`） | axios `baseURL` 置空，Vite 代理 `/user`、`/admin`、`/assets` |
| 成功码 | `code: 0` | **`code: 1`**（`Result.success`） | 响应拦截器判断 `code === 1` |
| 错误字段 | `message` | **`msg`** | 统一读 `body.msg` |
| 分页 | `{page,pageSize,total,records}` | `{total,records}`（无回显页号） | 页码由前端维护，列表只读 `total/records` |
| 金额类型 | 字符串 `"18.00"` | **JSON number**（BigDecimal 序列化） | 展示前 `Number(x).toFixed(2)` |
| 购物车 `amount` | 行小计 | **单价**（后端以 Σ amount×number 计算订单额） | 行小计 = 单价 × 数量（见 defects F-01） |
| 登录 | `POST /api/user/auth/login`（手机号+验证码） | `POST /user/user/test-login`（`loginCode: demo-user`） | 登录页改为两个受控身份选择 |
| 员工登录 | `POST /api/admin/auth/login` → `{token, employee}` | `POST /admin/employee/login` → `{id,userName,name,token}` | 令牌与用户概要字段改 `userName/name` |
| 菜品口味 | 契约返回 `flavors[].values[]` 数组 | 实现返回 `flavors[].value`（JSON 数组字符串）；契约写 `Dish` | 前端 `parseFlavorValues()` 兼容 JSON 串 |
| 菜品详情 | `GET /api/dishes/{dishId}` | **无用户端详情接口** | 详情页改用 `/user/dish/list` 全量查后定位（defects F-04） |
| 下单返回 | `{orderId, number, amount, status}` | `{id, orderNumber, orderAmount, orderTime}` | 支付用 `orderNumber`，跳转用 `id` |
| 支付 | `POST /api/user/orders/{id}/mock-payment` | `PUT /user/order/payment {orderNumber,payMethod}` | 改方法/参数；响应为模拟 `packageStr` |
| 订单状态操作 | 统一 `PATCH /admin/orders/{id}/status` | 分动作：`confirm`/`rejection`/`cancel`/`delivery/{id}`/`complete/{id}` | 按状态推导按钮并调用对应动作 |
| 营业状态 | 未设计 | `GET /user/shop/status`、`GET/PUT /admin/shop/{status}` | 用户端打烊横幅、管理端顶部开关 |
| 员工管理 | 未设计 | `/admin/employee/{page,{id},status/{status}}` | 新增员工管理页 |
| 统计 | 自定义 `overview` | `/admin/workspace/businessData`、`/admin/order/statistics`、`/admin/report/turnoverStatistics` | 工作台改为三块真实统计 |
| Mock | axios adapter + 内存数据 | 组长要求以真实服务联调 | **删除 Mock 层**，改 Vite 代理直连 |

## 2 接口映射表（草案 → 正式）

| 我的草案 | 组长正式接口 | 说明 |
| --- | --- | --- |
| `POST /api/user/auth/login` | `POST /user/user/test-login` | 受控身份，不接受任意 userId |
| `GET /api/categories` | `GET /user/category/list?type=` | 只返回启用分类 |
| `GET /api/dishes` | `GET /user/dish/list?categoryId&keyword` | 无分页，返回数组（含 flavors） |
| `GET /api/dishes/{id}` | — | 缺失，见 F-04 |
| `GET /api/setmeals` | `GET /user/setmeal/list?categoryId` | 同上 |
| （未设计） | `GET /user/setmeal/dish/{id}` | 套餐组成 |
| `GET /api/user/cart` | `GET /user/shoppingCart/list` | — |
| `POST /api/user/cart/items` | `POST /user/shoppingCart/add` | 每次 +1，不接受 number |
| `PATCH /api/user/cart/items/{id}` | `PUT /user/shoppingCart/{id}?number=` | 数量走 query |
| `DELETE /api/user/cart/items/{id}` | `DELETE /user/shoppingCart/{id}` | — |
| `DELETE /api/user/cart` | `DELETE /user/shoppingCart/clean` | — |
| `/api/user/addresses...` | `/user/addressBook`（POST/PUT/DELETE?id）+ `/list`、`/{id}`、`/default` | 默认地址单独接口 |
| `POST /api/user/orders` | `POST /user/order/submit` | 金额由后端重算（已验证：客户端传 0.01 仍按 36 记账） |
| `POST .../mock-payment` | `PUT /user/order/payment` | 幂等（F-02） |
| `GET /api/user/orders` | `GET /user/order/historyOrders?page&pageSize&status` | 单状态筛选 |
| `GET /api/user/orders/{id}` | `GET /user/order/orderDetail/{id}` | — |
| （未设计） | `PUT /user/order/cancel/{id}`、`POST /user/order/repetition/{id}`、`GET /user/order/reminder/{id}` | 取消/再来一单/催单 |
| `/api/admin/categories*` | `/admin/category`（POST/PUT/DELETE?id）+ `/page`、`/list`、`/status/{status}?id=` | — |
| `/api/admin/dishes*` | `/admin/dish`（POST/PUT/DELETE?ids=）+ `/page`、`/{id}`、`/list`、`/status/{status}?id=` | 删除支持批量 ids |
| `/api/admin/setmeals*` | `/admin/setmeal`（同上） | — |
| `GET /api/admin/orders` | `GET /admin/order/conditionSearch?number&phone&status&beginTime&endTime&userId` | 多了 phone/userId 条件 |
| `PATCH .../status` | `confirm`/`rejection`/`cancel`/`delivery/{id}`/`complete/{id}` | 动作化，语义更清晰 |
| `GET /api/admin/reports/overview` | `/admin/workspace/businessData` + `/admin/order/statistics` + `/admin/report/turnoverStatistics` | 拆成三块 |

## 3 结论

1. 两套契约的**业务规则一致**（状态枚举、金额服务端计算、资源归属），差异集中在**路径风格、外壳字段、金额类型**，属于可机械映射的差异，没有不可调和的语义冲突。
2. 我的草案在“用户端取消订单/再来一单/营业状态/员工管理”上覆盖不足，组长版本更完整；反之我的草案在“统一错误码细分（40906 等）”上更细，组长版本用 `msg` 文本 + HTTP 状态表达，前端按文本展示即可。
3. 后续一律以 `docs/leader/week3/openapi.yaml` 为唯一契约；我的 `docs/api/openapi.yaml` 标记为作废草案，只作过程留痕。
