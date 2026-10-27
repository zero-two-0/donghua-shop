# 第 4 周后端实际自测报告

负责人：刘晟玺。执行日期：2026-10-26。本次是按授权提前完成的本人后端产出，不代表第 4 周已实际结束、队友已评审或课程已验收。

## 1 实测结论

**Maven 三模块构建与打包成功；50 项测试全部通过，失败 0、错误 0、跳过 0。** 正式代码位于 [后端工程](../../code/backend/README.md)。

另执行 [契约检查脚本](../../scripts/check_contract.py)：63 个 Java HTTP 接口与 OpenAPI 一致，72 个具体 Schema，引用、operationId、path/query 参数、POJO 字段和请求体声明检查通过。该检查是静态核对，不等于 63 个接口都已经逐一动态验收。

[机器可读验证摘要](evidence/verification-summary.json) 从实际 Surefire XML 提取测试数量，记录构建时间、环境及 JAR/契约 SHA-256。完整构建报告位于本机 `code/backend/sky-server/target/surefire-reports/`；`target/` 为可重建产物，不应提交 Git。

## 2 环境与复现命令

| 项目 | 本次环境 |
| --- | --- |
| Java / Maven | Java 17.0.18 / Maven 3.9.11 |
| 后端框架 | Spring Boot 2.7.3、MyBatis、PageHelper starter 1.4.7 |
| 集成测试 | Spring Boot Mock Web 环境、MockMvc、真实 Controller/Service/Mapper 与事务管理器；不绑定本机端口 |
| 数据库 | H2 2.1.214，MySQL 模式，进程内测试库；使用从 SQL 设计派生的测试数据 |
| 外部服务 | 无需真实微信、支付、OSS、MySQL 或 Redis；没有连接/修改真实业务库 |
| 构建完成时间 | Maven 输出 `2026-10-26T22:26:11+08:00`，保留输出原时区 |

在 `code/backend/` 执行的最终命令：

```bash
/Users/mac/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn \
  -o -s maven-settings.xml \
  -Dmaven.repo.local=/Users/mac/Documents/takeout/.cache/m2 \
  package
```

本机 Maven 不在 PATH，故使用已有 Maven 的绝对路径；项目内缓存用于避免写入全局配置。首次补齐依赖曾使用同一命令去掉 `-o` 联网下载。其他机器可在相同目录执行 `mvn -s maven-settings.xml package`；离线模式要求依赖已缓存。`package` 包含编译与测试，没有跳过测试。

在项目根目录执行：

```bash
python3 scripts/check_contract.py
```

静态脚本需要 Python 3 与 PyYAML。最终构建摘要：

```text
Tests run: 50, Failures: 0, Errors: 0, Skipped: 0
sky-common ... SUCCESS
sky-pojo   ... SUCCESS
sky-server ... SUCCESS
BUILD SUCCESS
```

## 3 测试组成

| 测试类 | 数量 | 主要证明范围 | 结果 |
| --- | ---: | --- | --- |
| `ApiIntegrationTest` | 5 | 真实 Spring/MyBatis/H2、鉴权、CRUD、完整交易链路、HTTP 静态资源 | 通过 |
| `AuthenticationTest` | 3 | PBKDF2 随机盐及匹配、Bearer、身份域隔离和上下文清理 | 通过 |
| `BusinessServiceTest` | 29 | 购物车、地址归属、订单计价/状态/模拟支付及异常路径；Mapper 为受控 Mock | 通过 |
| `CatalogValidationTest` | 7 | 员工/分类/套餐状态参数与资源存在、菜品缺省停售及创建必要字段 | 通过 |
| `ReportServiceTest` | 5 | 日期范围、空日期补零、金额/完成率/客单价；Mapper 为受控 Mock | 通过 |
| `SpringDataRedisTest` | 1 | Redis 模板键序列化与值往返；连接工厂为 Mock，没有真实 Redis 连接 | 通过 |
| **总计** | **50** | 测试方法数不等于接口数或业务场景穷举数 | **全部通过** |

## 4 集成测试已实际覆盖的场景

| 编号 | 场景及关键断言 | 实际证据 |
| --- | --- | --- |
| IT01 | 登录、两次加购、提交订单、重复模拟支付、员工接单/派送/完成、详情与分页 | 菜品单价 18、数量 2，客户端伪造总价 0.01，后端仍保存 36；订单明细数量 2，下单后清车；非法跳过接单被拒绝 |
| IT02 | 身份隔离和非法输入 | 无令牌 401；用户令牌不能访问管理端；第二测试用户不能读/设默认/删第一用户地址；非法测试标识、菜品套餐同时加购被拒；坏 JSON 400；缺失或越界分页 400 |
| IT03 | 分类、菜品与口味、地址 CRUD | 实际执行 Mapper SQL；起停、查询、更新、删除；只改菜名不清口味；用户伪造 userId 不生效；地址更新、默认及删除符合本人归属 |
| IT04 | 员工、套餐 CRUD 与缓存、统计查询 | 新增密码保存 PBKDF2、详情和分页不返回密码、登录与性别更新；套餐关联保存、局部更新不清明细、起停/分页/删除和浏览缓存刷新；当日完成订单营业额为 36.00、工作台请求成功 |
| IT05 | Spring MVC 静态资源请求 | MockMvc 经过 DispatcherServlet 返回 `/openapi.yaml` 和 `/assets/dish-1.svg`，均 HTTP 200；契约包含下单路径 |

IT01–IT05 按场景归组；统计请求在交易测试中执行。HTTP 业务调用主要通过 MockMvc 进入真实控制器、业务和 H2；静态资源另外通过实际本机 HTTP 请求验证，没有启动前端浏览器。

## 5 本轮发现并修复的问题

| 问题 | 修复与回归 |
| --- | --- |
| 旧分页插件导致 Spring Boot 2.7 循环依赖 | starter 升到 1.4.7，未放开循环依赖；Spring 上下文实际启动通过 |
| JWT 库修改不可变 claims Map 报错 | JWT 工具复制 claims 后签名，登录/鉴权回归通过 |
| 原 Redis 测试无上下文却访问未注入对象 | 改为明确的模板序列化测试，不伪称 Redis 联通 |
| 口味批量插入误带审计注解，XML 多余符号 | 移除无审计字段对象的注解，修正 XML；真实菜品口味 SQL 测试通过 |
| 购物车重复加购、地址越权、结算信任客户端金额 | 归属与数量校验、后端重算及快照、事务清车；单元和集成验证 |
| 订单状态无条件更新和错误完成入口 | 订单与支付状态条件更新，用户/管理权限分离、管理完成流程；重复支付与非法迁移回归 |
| 局部更新丢失口味/套餐菜品、员工性别遗漏 | 未提交关联集合保持原值，明确空数组才清空；Mapper 补性别；集成断言验证 |
| 分页、启停及菜品缺省状态不一致 | HTTP 分页边界校验；状态范围与存在校验；菜品缺省停售；对应回归通过 |

H2 的 `VALUE` 关键字与 MySQL 不同，仅在测试 URL 中加入 `NON_KEYWORDS=USER,VALUE`；未据此改动正式 MySQL schema，也未忽略 SQL 错误。

## 6 构建产物与静态检查

- 生成 `code/backend/sky-server/target/sky-server-1.0-SNAPSHOT.jar`，包含 Spring Boot `JarLauncher`、主类 `com.sky.SkyApplication`；检查了 manifest 与静态契约打包内容，尚未对真实 MySQL 单独启动该 JAR 验收。集成测试使用 Mock Web 环境，因此不把本次构建写成端口监听或真实 HTTP 部署验收。
- 文档主契约、Java 静态资源契约和 JAR 内契约字节一致；哈希见验证摘要。
- 本轮交付 Markdown 本地链接检查通过；Java/XML/YAML 密钥特征扫描未发现所扫描的私钥、阿里云标识或硬编码 secret 字面量。此为有限模式检查，不替代完整安全审计。
- 当前目录不是 Git 仓库，最终 `git status --short` 返回该事实；本轮没有初始化、提交、推送或创建虚构 PR。

## 7 未验证范围与真实限制

| 项目 | 当前状态 / 后续验收 |
| --- | --- |
| 真实 MySQL8 | 没有执行 SQL 初始化或迁移，没有验证真实 MySQL 方言、约束、隔离和索引执行计划；H2 不能代替此项 |
| Redis / WebSocket | 无真实 Redis 测试；当前 simple 缓存、内存营业状态且重启重置。course 不注册 WebSocket 端点，催单推送未启用 |
| 高并发与幂等 | 订单状态 CAS 已有测试；首次并发加购无唯一约束，并发提交无请求幂等键/购物车锁，不能宣称并发提交恰好一次 |
| 地址并发 | 设置默认地址的普通事务/归属已测，并发竞争唯一默认未做约束与压力验证 |
| 第三方与生产认证 | 仅受控课程两测试身份、模拟支付；无正式注册找回、真实微信支付、退款与对象存储验收 |
| 全接口与异常穷举 | 63 个接口静态匹配，动态测试为上述关键场景；不声称所有输入/异常/历史复用路径都已覆盖 |
| 前端、性能及部署 | 尚未浏览器联调、跨域部署、兼容、负载或 Nginx 验收；第 5–8 周按计划留真实证据 |
| 团队过程 | 未代填队友评审、接口冻结、远程 PR、会议签字、教师批准或课程最终验收 |

以上已完成项可作为第 4 周本人后端交付证据；真实环境和团队过程按 [八周计划](../../组长版_项目总体方案与个人分工.md) 继续验收。
