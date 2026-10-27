> **状态：组员第 1~3 周草案（已归档，勿作为依据）**
> 组长刘晟玺已交付正式版本，权威文件见 `docs/leader/week2/database-design.md`；本文件仅保留为过程留痕。
> 最新整合结果与实测证据见 `docs/integration/`（contract-diff / page-api-map / defects / integration-record）。
# 数据库设计评审意见（前端视角）

| 项 | 内容 |
| --- | --- |
| 评审人 | 钱文博（组员，负责两端页面与接口调用） |
| 评审对象 | `docs/database/schema.sql`、`docs/database/data.sql`、`docs/database/ER-and-dictionary.md` |
| 评审依据 | 页面实际需要的字段、契约 `docs/api/openapi.yaml`、SRS 第 3 章 |
| 日期 | 2026-10-26 |
| 状态 | **已按本机 MySQL 8.0.46 实跑验证**，意见待组长答复 |

每条意见给出：问题 → 影响页面 → 建议 → 状态。

## A. 必须在第 4 周前解决（阻塞前端联调）

### 1. 列表接口需要 `categoryName`，不能只返回 `categoryId`

- **问题**：`dish` 与 `setmeal` 只存 `category_id`。若列表只回 `categoryId`，管理端每行都要额外请求分类接口，用户端也无法显示分类名。
- **影响**：`admin-web/views/DishList.vue`、`SetmealList.vue` 的“分类”列；`user-h5/views/Home.vue` 的分类栏。
- **建议**：`GET /admin/dishes`、`GET /admin/setmeals`、`GET /dishes` 由后端 `LEFT JOIN category` 返回 `categoryName`（契约已写入 `Dish.categoryName`）。
- **状态**：契约已要求，待后端确认实现方式（联表 or 二次查询 + 内存拼装）。

### 2. 订单列表需要 `statusText` 与 `itemCount`

- **问题**：`orders.status` 是数字枚举，页面需要中文状态；列表还常需要“共 N 件”。
- **影响**：`OrderList.vue`（两端）、`Dashboard.vue` 状态分布。
- **建议**：后端统一由枚举转换输出 `statusText`；`itemCount` 用 `SELECT SUM(number) FROM order_detail` 聚合，或在 `orders` 冗余 `item_count` 列。
- **状态**：契约已写入；建议优先考虑 SQL 聚合，避免冗余列与明细不一致。

### 3. 金额必须是字符串传输

- **问题**：`DECIMAL(10,2)` 在 Jackson 默认序列化为数字，前端 `Number` 参与计算会产生浮点误差。
- **影响**：购物车合计、订单总额、营业额展示。
- **建议**：DTO 中 `price`/`amount` 使用 `String` 或 `@JsonSerialize(using = ToStringSerializer.class)`；契约已声明为两位小数字符串。
- **状态**：契约已要求，待后端实现确认。

## B. 建议修改（不影响第 4 周开工，但影响数据质量）

### 4. `password` 散列算法未定稿

- **问题**：种子数据用 `MD5('123456')`，与 SRS 非功能需求“密码不得明文存储”不冲突，但 MD5 无盐、抗碰撞弱。
- **建议**：若后端引入 Spring Security，改用 BCrypt；种子数据同步重算。若为控制工期继续用 MD5，需在技术方案 D-02 中写明“课程妥协”。
- **状态**：待组长定稿。

### 5. `user.phone` 缺索引，登录查询会全表扫描

- **问题**：用户登录按 `phone` 查询；当前 `user` 只有 `openid` 唯一索引。
- **建议**：加 `KEY idx_user_phone (phone)`。是否唯一由“同号是否允许多账号”决定，课程内建议**唯一**（`UNIQUE KEY uk_user_phone`）。
- **状态**：建议采纳，需与组长确认注册语义。

### 6. 购物车合并依赖“先查后插”，并发下可能产生重复行

- **问题**：`(user_id, dish_id, setmeal_id, dish_flavor)` 没有唯一约束；两次快速点击“加入购物车”可能插入两行。
- **建议**：① 前端按钮加 loading 并禁用（已实现）；② 后端在同一事务内 `SELECT ... FOR UPDATE` 后再决定插入或累加；③ 若可控 `dish_flavor` 非空，可加唯一键。
- **状态**：已在前端规避，后端仍需事务保证。

### 7. 逻辑外键 vs 物理外键

- **问题**：建表脚本未加 `FOREIGN KEY`。
- **影响**：`data.sql` 可重复 `TRUNCATE` 重灌；但误删分类/菜品不会被数据库拦住。
- **建议**：保持不加物理外键，由 Service 层在删除前校验引用（契约中 40907/40908 已定义）；第 7 周测试需覆盖“删除被引用分类/菜品”用例。
- **状态**：同意现状，需测试覆盖。

### 8. `address_book.is_default` 的唯一性只能应用层保证

- **问题**：同一用户可能出现两条 `is_default=1`。
- **建议**：新增/修改默认地址时在事务内 `UPDATE address_book SET is_default=0 WHERE user_id=?`，再置目标为 1；或者用生成列 + 唯一索引（复杂，课程内不建议）。
- **状态**：契约 `isDefault` 语义已写明，待后端实现。

## C. 观察项（本期不阻塞，记录备查）

| 编号 | 观察 | 说明 |
| --- | --- | --- |
| 9 | `dish_flavor.value` 用逗号串存储 | 无法表达“口味加价”；本期无此需求，契约输出为数组 |
| 10 | `orders` 冗余收货信息 | 正确设计（快照），但要保证下单时一次性写入，或后续地址变更不影响历史订单 |
| 11 | `pack_amount`、`tableware_*` 课程内未使用 | 保留字段以便对齐参考素材，前端本期不展示 |
| 12 | `create_user/update_user` 在种子数据中固定为 1 | 上线需按登录员工写入 |
| 13 | 时区 | 建议连接串固定 `serverTimezone=Asia/Shanghai`，避免 `CURRENT_TIMESTAMP` 与前端显示差 8 小时 |

## D. 实测结论（本机）

执行 `.\scripts\db-init.ps1` 结果：

| 指标 | 值 |
| --- | --- |
| 表数量 | 11 |
| 分类 | 6 |
| 菜品 | 17 |
| 套餐 | 3 |
| 员工 | 2 |
| 订单 | 2 |
| 中文写入/读取 | 正常（`utf8mb4` + `--default-character-set=utf8mb4`） |
| 应用账号 `dh_shop` 权限 | SELECT/INSERT/UPDATE/DELETE/CREATE/DROP/INDEX/ALTER/REFERENCES，仅限 `donghua_shop` |

结论：**表结构与种子数据可以支撑第 1~3 周的页面与 Mock 对账**，A 组 3 条需在第 4 周后端开发前答复。
