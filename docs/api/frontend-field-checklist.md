> **状态：组员第 1~3 周草案（已归档，勿作为依据）**
> 组长刘晟玺已交付正式版本，权威文件见 `docs/leader/week3/openapi.yaml`；本文件仅保留为过程留痕。
> 最新整合结果与实测证据见 `docs/integration/`（contract-diff / page-api-map / defects / integration-record）。
# 前端字段清单（页面 × 字段 × 来源接口）

| 项 | 内容 |
| --- | --- |
| 编写 | 钱文博（组员） |
| 用途 | 第 3 周契约评审：逐页核对“页面要显示的每个字段，契约里是否都有” |
| 对应契约 | `docs/api/openapi.yaml` v0.3.0-frozen-draft |
| 图例 | ✅ 契约已覆盖　⚠️ 需后端补充/确认　❌ 契约缺失 |
| 日期 | 2026-10-26 |

## 1 用户端 H5

### 1.1 登录页 `/login`

| 字段 | 来源 | 必填 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| phone | 用户输入 | 是 | ✅ | `^1\d{10}$` 前端校验 |
| code | 用户输入 | 是 | ✅ | 固定 1234（Mock 与后端一致） |
| token | `POST /user/auth/login` → `data.token` | — | ✅ | localStorage 保存 |
| expiresIn | 同上 | — | ✅ | 前端暂不做过期倒计时，靠 401 兜底 |
| user.name / user.phone | 同上 → `data.user` | — | ✅ | 登录后写入 store |

### 1.2 首页（分类 + 菜品） `/home`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| 分类 id / name | `GET /categories?type=1` | ✅ | 侧边栏 |
| 菜品 id / name / description | `GET /dishes` | ✅ | 列表主信息 |
| price | 同上 | ✅ | 字符串，直接展示 |
| image | 同上 | ✅ | 可为 null，前端占位 |
| status | 同上 | ✅ | 用户端只返回在售；仍用于禁用加购 |
| categoryId / categoryName | 同上 | ✅ | `categoryName` 供详情页展示 |
| 分页 page/pageSize/total/records | 同上 | ✅ | 首页固定 pageSize=50，暂不做上拉加载 |

### 1.3 菜品详情 `/dish/:id`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| 菜品全部字段 | `GET /dishes/{dishId}` | ✅ | — |
| flavors[].name / values[] | 同上 | ✅ | 数据库存逗号串，后端转数组 |
| 小计 | 前端计算（单价 × 数量）仅作显示 | ⚠️ | 提交时不传金额，最终以购物车 `amount` 为准 |

### 1.4 购物车 `/cart`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| id / name / image | `GET /user/cart` | ✅ | — |
| dishId / setmealId | 同上 | ✅ | 二选一，用于合并判断 |
| dishFlavor | 同上 | ✅ | 展示已选口味 |
| number | 同上 | ✅ | 1~99 |
| amount | 同上 | ✅ | 行小计，后端计算 |
| 合计 | 前端累加各行 amount | ✅ | 不做单价重算 |

### 1.5 确认订单 `/order/confirm`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| 地址列表 | `GET /user/addresses` | ✅ | 默认选中 `isDefault=1` |
| consignee / phone / districtName / detail | 同上 | ✅ | 展示完整收货信息 |
| 商品清单 | `GET /user/cart` | ✅ | — |
| remark | 用户输入 | ✅ | ≤100 字 |
| orderId / number / amount / status | `POST /user/orders` | ✅ | 下单返回 |
| checkoutTime / payStatus / status | `POST /user/orders/{id}/mock-payment` | ✅ | 支付返回 |

### 1.6 订单列表 `/orders`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| number / orderTime | `GET /user/orders` | ✅ | — |
| status / statusText | 同上 | ✅ | **statusText 必须由后端给**，前端不做枚举翻译（避免两端文案不一致） |
| amount | 同上 | ✅ | — |
| consignee / address | 同上 | ✅ | 卡片摘要 |
| itemCount | 同上 | ✅ | “等 N 件” |
| items[0].name | 同上 | ✅ | 摘要取第一件商品名 |

### 1.7 订单详情 `/orders/:id`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| items[].name / dishFlavor / number / amount | `GET /user/orders/{orderId}` | ✅ | 明细 |
| payStatus / checkoutTime | 同上 | ✅ | 支付状态与时间 |
| estimatedDeliveryTime / deliveryTime | 同上 | ✅ | 可为 null，前端按 null 隐藏 |
| cancelReason | 同上 | ✅ | 已取消订单展示 |

### 1.8 地址列表 / 编辑 `/addresses`、`/addresses/edit/:id?`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| consignee / phone / detail / label | `GET /user/addresses` | ✅ | — |
| districtName 等行政区 | 同上 | ✅ | 本期只支持固定“上海市/松江区”，不做三级联动 |
| isDefault | 同上 | ✅ | 默认地址标签 |

### 1.9 个人中心 `/profile`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| name / phone / avatar | `GET /user/profile` | ✅ | — |
| addressCount / orderCount | 同上 | ✅ | 可与列表数量不一致（统计口径），以接口为准 |

## 2 商家管理 Web

### 2.1 登录 `/login`

| 字段 | 来源 | 状态 |
| --- | --- | --- |
| username / password | 用户输入 | ✅ |
| token / employee{id,name,username,phone} | `POST /admin/auth/login` | ✅ |

### 2.2 工作台 `/dashboard`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| todayOrderCount / todayTurnover | `GET /admin/reports/overview` | ✅ | — |
| totalOrderCount / totalTurnover | 同上 | ✅ | — |
| todayValidOrderCount | 同上 | ⚠️ | 契约已定义但当前页面未展示，保留字段 |
| statusDistribution[].status/statusText/count | 同上 | ✅ | 状态分布表 |

### 2.3 分类管理 `/categories`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| id / name / type / sort / status | `GET /admin/categories` | ✅ | 类型显示为“菜品分类/套餐分类” |
| 分页字段 | 同上 | ✅ | — |

### 2.4 菜品管理 `/dishes`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| name / categoryName / price / description / status / updateTime | `GET /admin/dishes` | ✅ | 分类列依赖 `categoryName` |
| status 切换结果 | `PATCH /admin/dishes/{id}/status` | ✅ | 返回更新后菜品 |
| 表单字段 | `POST/PUT /admin/dishes` | ✅ | name、categoryId、price、image、description、status |

### 2.5 套餐管理 `/setmeals`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| name / categoryName / price / status / description | `GET /admin/setmeals` | ✅ | — |
| dishes[] | `GET /admin/setmeals/{id}` | ⚠️ | 契约已定义组合明细；本期页面不编辑组合，列表显示 `dishCount` 需后端或用 dishes.length |
| 组合编辑 | — | ❌ | 第 5 周范围，不在本期实现 |

### 2.6 订单管理 `/orders`

| 字段 | 来源 | 状态 | 备注 |
| --- | --- | --- | --- |
| number / status / statusText / amount / orderTime | `GET /admin/orders` | ✅ | — |
| consignee / phone / address | 同上 | ✅ | 列表直接展示，避免逐个查详情 |
| items[] | `GET /admin/orders/{id}` | ✅ | 详情抽屉 |
| 状态按钮可用性 | 前端按状态机推导 + 后端二次校验 | ✅ | 非法迁移返回 40909 |
| 拒单/取消原因输入 | `PATCH /admin/orders/{id}/status` 的 `reason` | ✅ | 迁移到 6 必填 |

## 3 汇总

| 端 | 页面数 | 已覆盖字段项 | 待确认/缺失 |
| --- | --- | --- | --- |
| 用户端 H5 | 8 | 全部主流程字段 | 1 项（小计口径，已在契约注明） |
| 管理端 Web | 6 | 全部主流程字段 | 2 项（`todayValidOrderCount` 未展示、套餐组合未实现） |

结论：**除“套餐组合编辑”属于第 5 周范围外，页面所需字段在契约中均有对应定义**。
其中 `categoryName`、`statusText`、`itemCount` 三项依赖后端联表/枚举转换，是本清单对后端的主要要求，已在 `docs/api/review-notes.md` 第 1~3 条中正式提出。
