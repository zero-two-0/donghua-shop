# 页面-接口对应表

| 项 | 内容 |
| --- | --- |
| 编写 | 钱文博（组员） |
| 契约基线 | `docs/leader/week3/openapi.yaml` v1.0.0-draft（组长） |
| 前端代码 | `code/frontend/user-h5`、`code/frontend/admin-web` |
| 验证方式 | 真实后端（MySQL 8 + JDK17）跑通，证据见 `docs/integration/evidence/api-smoke.json` 与 `frontend-self-test.md` |
| 状态图例 | ✅ 已接入并实测通过　⏳ 已接入未逐页面测　⚠️ 有限制（见缺陷表） |

## 1 用户端 H5（Vue 3 + Vant 4，端口 5173）

| 页面 | 需求 | 接口（方法 路径） | 关键请求/响应字段 | 状态 | 证据 |
| --- | --- | --- | --- | --- | --- |
| 登录 `/login` | R-U-01 | `POST /user/user/test-login` | 请求 `loginCode`；响应 `data.token`、`data.id`、`data.openid` | ✅ | smoke 项「POST /user/user/test-login」「非法 loginCode 被拒绝」 |
| 首页 `/home` | R-U-02 | `GET /user/category/list?type=1/2`<br>`GET /user/dish/list?categoryId&keyword`<br>`GET /user/setmeal/list?categoryId`<br>`GET /user/shop/status` | 分类 `id/name/type`；菜品 `id/name/price/image/description/status/flavors`；营业状态 `data` 0/1 | ✅ | smoke 浏览组 6 项 |
| 菜品详情 `/dish/:id` | R-U-03 | `GET /user/dish/list`（全量后按 id 定位）<br>`POST /user/shoppingCart/add` | `flavors[].value`（JSON 串）→ 解析为选项；加购传 `dishId`+`dishFlavor` | ⚠️ | 受限：无用户端详情接口（F-04） |
| 套餐详情 `/setmeal/:id` | R-U-03 | `GET /user/setmeal/list`<br>`GET /user/setmeal/dish/{id}` | 套餐 `id/name/price`；组成 `DishItemVO.name/copies` | ✅ | smoke 项「GET /user/setmeal/dish/{id}」 |
| 购物车 `/cart` | R-U-04 | `GET /user/shoppingCart/list`<br>`PUT /user/shoppingCart/{id}?number=`<br>`DELETE /user/shoppingCart/{id}`<br>`DELETE /user/shoppingCart/clean` | `id/name/image/dishId/setmealId/dishFlavor/number/amount`（amount = 单价） | ⚠️ | 行小计按 单价×数量 计算（F-01） |
| 确认订单 `/order/confirm` | R-U-05 | `GET /user/addressBook/list`<br>`POST /user/order/submit`<br>`PUT /user/order/payment` | 提交 `addressBookId/remark/payMethod`；响应 `id/orderNumber/orderAmount`；支付传 `orderNumber` | ✅ | smoke 订单组 6 项（含客户端传 0.01 被后端按 36 记账） |
| 订单列表 `/orders` | R-U-06 | `GET /user/order/historyOrders?page&pageSize&status` | `total/records[]`：`id/number/status/amount/orderDishes/orderDetailList/orderTime/consignee/address` | ✅ | smoke 项「historyOrders」 |
| 订单详情 `/orders/:id` | R-U-06 | `GET /user/order/orderDetail/{id}`<br>`PUT /user/order/cancel/{id}`<br>`POST /user/order/repetition/{id}`<br>`GET /user/order/reminder/{id}` | 状态、明细、`cancelReason`、`checkoutTime` | ⏳ | 取消/再来一单/催单接口已接入，未逐页点击 |
| 地址列表 `/addresses` | R-U-07 | `GET /user/addressBook/list`<br>`PUT /user/addressBook/default`<br>`DELETE /user/addressBook?id=` | 默认地址唯一；删除默认地址行为需按后端反馈提示 | ✅ | smoke 地址组 3 项 |
| 地址编辑 `/addresses/edit/:id?` | R-U-07 | `POST /user/addressBook`<br>`PUT /user/addressBook`<br>`GET /user/addressBook/{id}` | `consignee/phone/detail/districtName/label`；更新需带 `id` | ✅ | smoke 项「POST /user/addressBook」 |
| 个人中心 `/profile` | R-U-08 | `GET /user/shop/status` | 展示测试身份与营业状态 | ⏳ | 无独立 profile 接口，按契约仅展示本地身份 |

## 2 商家管理 Web（Vue 3 + Element Plus，端口 5174）

| 页面 | 需求 | 接口 | 关键字段 | 状态 | 证据 |
| --- | --- | --- | --- | --- | --- |
| 登录 `/login` | R-A-01 | `POST /admin/employee/login` | `username/password` → `token/name/userName/id` | ✅ | smoke 项「admin/employee/login」 |
| 工作台 `/dashboard` | R-A-06 | `GET /admin/workspace/businessData?date`<br>`GET /admin/order/statistics`<br>`GET /admin/report/turnoverStatistics?begin&end` | `turnover/validOrderCount/orderCompletionRate/unitPrice/newUsers`；`toBeConfirmed/confirmed/deliveryInProgress`；`dateList/turnoverList` 逗号串 | ✅ | smoke 统计组 3 项 |
| 订单管理 `/orders` | R-A-05 | `GET /admin/order/conditionSearch`<br>`GET /admin/order/details/{id}`<br>`PUT /admin/order/confirm`<br>`PUT /admin/order/rejection`<br>`PUT /admin/order/cancel`<br>`PUT /admin/order/delivery/{id}`<br>`PUT /admin/order/complete/{id}` | 筛选 `number/phone/status/beginTime/endTime`；动作载荷 `{id,rejectionReason}` / `{id,cancelReason}` / `{id,status:3}` | ✅ | smoke 项「conditionSearch/confirm/delivery/complete」+ 闭环状态 5 |
| 分类管理 `/categories` | R-A-02 | `GET /admin/category/page`<br>`GET /admin/category/list`<br>`POST/PUT /admin/category`<br>`DELETE /admin/category?id=`<br>`POST /admin/category/status/{status}?id=` | `type/name/sort/status` | ⏳ | 接口已接入；页面点击待面测 |
| 菜品管理 `/dishes` | R-A-03 | `GET /admin/dish/page`<br>`GET /admin/dish/{id}`<br>`POST/PUT /admin/dish`<br>`DELETE /admin/dish?ids=`<br>`POST /admin/dish/status/{status}?id=` | `name/categoryId/categoryName/price/image/description/status/flavors[]`（flavors.value 为 JSON 串） | ⏳ | smoke 项「dish/page」「dish/{id} 含口味」 |
| 套餐管理 `/setmeals` | R-A-04 | `GET /admin/setmeal/page`<br>`GET /admin/setmeal/{id}`<br>`POST/PUT /admin/setmeal`<br>`DELETE /admin/setmeal?ids=`<br>`POST /admin/setmeal/status/{status}?id=` | `setmealDishes[{dishId,name,price,copies}]` | ⏳ | 组合编辑已按契约实现 |
| 员工管理 `/employees` | R-A-01 扩展 | `GET /admin/employee/page`<br>`GET /admin/employee/{id}`<br>`POST/PUT /admin/employee`<br>`POST /admin/employee/status/{status}?id=` | `username/name/phone/sex/idNumber/status`；新增需 8 位以上密码 | ⏳ | 响应不含密码 |
| 顶栏营业开关 | R-A-06 扩展 | `GET /admin/shop/status`、`PUT /admin/shop/{status}` | 1 营业 / 0 打烊 | ✅ | smoke 项「shop/0 后用户端为 0」「shop/1 恢复」 |

## 3 公共能力

| 能力 | 实现位置 | 说明 | 状态 |
| --- | --- | --- | --- |
| 统一外壳 `code/msg/data` | 两端 `src/api/http.js` | `code===1` 成功；否则抛 `ApiError(code,msg,status)` | ✅ |
| Bearer 令牌 | 同上 | 用户 `sky_user_token`、员工 `sky_admin_token` 分开存，互不通用 | ✅（smoke 验证用户令牌访问管理端被拒） |
| 401 处理 | 同上 + 路由守卫 | 清令牌并跳对应登录页，保留 `redirect` | ✅ |
| 金额格式 | `utils/format.js`、`constants/order.js` | 后端 number → 两位小数展示 | ✅ |
| 开发代理 | 两个 `vite.config.js` | `/user`、`/admin`、`/assets` → `SKY_BACKEND`（默认 8080） | ✅（实测 5173/5174 均可穿透） |
| Mock | 已移除 | 组长后端已交付，Mock 会与契约漂移；改为真实联调 | ✅ |

## 4 未覆盖 / 待确认

| 项 | 说明 | 责任 |
| --- | --- | --- |
| 菜品口味在用户端的展示形态 | 后端返回 JSON 串 `["不辣","微辣"]`，契约未说明；前端按数组解析 | 组长确认后可简化 |
| 用户端缺菜品详情接口 | 详情页需拉全量列表定位，菜品多时浪费带宽 | 组长评估是否增补 |
| 图片上传 | 课程无 OSS 接口，菜品图片字段填后端静态资源 `/assets/*.svg` | 双方，部署阶段确认 |
| 员工改密 | 契约无改密接口，编辑页只改资料 | 组长确认是否需要 |
