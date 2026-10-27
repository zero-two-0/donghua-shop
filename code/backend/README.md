# 东华大学在线点餐系统：正式 Java 后端

本目录是刘晟玺负责的课程后端交付源码，采用 Java 17、Spring Boot 2.7.3、MyBatis、MySQL 8 和 Maven 三模块。运行本目录工程，不需要进入原参考仓库。用户 H5 与管理 Web 由另一成员负责，本目录不以旧 Python/H5 演示代替后端。

## 1 工程与交付入口

| 位置 | 内容 |
| --- | --- |
| `sky-common/` | Result / PageResult、异常、JWT、身份上下文等公共能力 |
| `sky-pojo/` | DTO、Entity、VO |
| `sky-server/` | Controller、Service、Mapper/XML、运行配置和测试 |
| [OpenAPI 3](../../docs/week3/openapi.yaml) | 正式前后端契约；静态版本化文件 |
| [数据库设计](../../docs/week2/database-design.md) / [SQL 附件](../../docs/week2/schema.sql) | 空库设计与数据字典；本次不对现有数据库自动执行 |
| [实现说明](../../docs/week4/backend-implementation.md) / [实际测试报告](../../docs/week4/backend-self-test.md) | 本人增量、实际验证及未验证范围 |
| [协作规范](../../docs/collaboration.md) | 两人交接、PR 与阻塞记录 |

## 2 前置条件

- JDK 17、Maven 3.6+；运行 `java -version`、`mvn -version` 核对。若 Maven 不在 PATH，请使用自己环境中 Maven 可执行文件的绝对路径，不需要全局安装新版本。
- 正式运行需已准备并授权使用的 MySQL 8 课程数据库。先审阅 SQL 与设计，再按授权初始化空库；这里不提供自动执行到现有库的命令，也不宣称已完成真实 MySQL 验收。
- 当前课程配置使用进程内 Spring Cache 和内存营业状态，**不要求运行 Redis**。源码/依赖中保留的 Redis 与 WebSocket 不代表缓存持久化、推送鉴权已完成验收。
- 测试的外部依赖范围和 H2 用法看实际测试报告；H2 结果不能替代 MySQL 8 方言、约束、事务及并发验收。

## 3 配置

主配置为 `sky-server/src/main/resources/application.yml`，默认启用 `course` profile。使用进程环境变量传入连接信息，不提交真实口令或个人配置。

| 环境变量 | 用途 / 默认行为 |
| --- | --- |
| `SERVER_PORT` | HTTP 端口，默认 8080 |
| `DB_URL` | JDBC URL；默认连接本机 `takeout_course`，字符集 UTF-8、时区 Asia/Shanghai |
| `DB_USERNAME` | 数据库用户名，默认 root；实际运行建议使用课程专用账号 |
| `DB_PASSWORD` | 数据库密码，默认空；由运行环境提供 |
| `COURSE_ADMIN_PASSWORD` | 可选；course 启动时若不存在 `admin`，用此密码建立管理员；空值不创建；已有账号不重置 |
| `SKY_JWT_ADMINSECRETKEY` | 可选，Spring 属性 `sky.jwt.admin-secret-key`；固定员工 JWT 签名密钥 |
| `SKY_JWT_USERSECRETKEY` | 可选，Spring 属性 `sky.jwt.user-secret-key`；固定用户 JWT 签名密钥，须与员工密钥不同 |

未设置 JWT 密钥时，程序为两域各自随机生成密钥，重启后旧令牌失效；固定密钥需使用独立的高熵值并只保存在运行环境。当前用户/员工令牌有效期均为 2 小时。不要把令牌、密码或密钥写入交接截图与日志。

`COURSE_ADMIN_PASSWORD` 会触发真实数据库插入，只在已获准的课程空库初始化场景启用，长度须为 8–128 位。当前密码采用随机盐 PBKDF2WithHmacSHA256，不兼容旧 MD5 账号；不要复用个人密码。该变量不是运行每次覆盖管理员密码的开关。

## 4 构建与测试

在本目录执行：

```bash
mvn test
mvn package
```

模块需从根 POM 一起构建，避免单独运行 server 时找不到 common / pojo。不要通过跳过测试冒充验证通过。依赖首次下载需要 Maven 仓库可达；无网络且本地缓存不足时，如实报告缺失依赖。工程提供不含凭据、指向 Maven Central 的 `maven-settings.xml`；需要显式使用时执行 `mvn -s maven-settings.xml test` / `mvn -s maven-settings.xml package`。已执行的准确命令、版本和结果统一见 [测试报告](../../docs/week4/backend-self-test.md)。

契约与源码静态一致性检查（项目根目录）：

```bash
python3 scripts/check_contract.py
```

## 5 启动与课程身份

在运行环境提供数据库参数、确保目标库已按授权准备完成后：

```bash
java -jar sky-server/target/sky-server-1.0-SNAPSHOT.jar --spring.profiles.active=course
```

这是启动方法，不是已部署成功的证明；真实 MySQL 连接、浏览器和部署验收结果以报告为准。默认基础地址 `http://localhost:8080`。

课程用户登录仅允许两个测试标识，不接入微信，不允许传入任意 userId：

```http
POST /user/user/test-login
Content-Type: application/json

{"loginCode":"demo-user"}
```

另一个独立身份用 `{"loginCode":"demo-user-2"}`，可用于越权隔离测试。首次登录按测试标识建立用户，后续取同一身份。响应 `data.token` 只用于本课程受控演示。

员工登录为 `POST /admin/employee/login`，请求 `username`、`password`；使用已在课程库准备的员工账号。后续受保护接口统一发送：

```http
Authorization: Bearer <token>
```

代码为参考页面兼容保留员工 `token`、用户 `authentication` 历史头，新接入统一使用 Bearer。员工与用户令牌分域，不能互换。响应为 `code/msg/data`，`code=1` 成功，`code=0` 业务失败；无效登录令牌 HTTP 401；分页为 `data.total/records`。

## 6 下单、模拟支付与交接

前端先浏览→加购→创建本人地址→提交订单。金额由后端读取商品现价与数量重算，客户端金额及打包费不参与可信结算；课程实现打包费为 0。订单生成后，通过契约中的支付接口模拟付款：

```http
PUT /user/order/payment
Authorization: Bearer <user-token>
Content-Type: application/json

{"orderNumber":"<提交订单返回的订单号>","payMethod":1}
```

支付只变更本地状态，不发生真实扣款；响应中 `SIMULATED` 是课程标识，不是微信支付签名，前端不得调用微信 SDK。订单状态为 1待付款、2待接单、3已接单、4派送、5完成、6取消；支付状态 0未付、1已付、2模拟退款。员工接单/派送/完成按 OpenAPI 调用；普通用户不能执行管理员完成动作。外部支付回调在课程版禁用。

完整路径、类型、参数位置、示例和失败情况以 OpenAPI 为准。运行后可访问 `/openapi.yaml` 静态契约、`/doc.html` Knife4j 辅助页面；后者来自 Swagger 2 注解，不是自动生成的 OpenAPI 3。静态文件变更应同步到服务资源，交接时检查版本一致。

## 7 复用、本人改动与当前限制

复用来源为苍穹外卖学习工程的三模块结构、实体/DTO/VO、Mapper 和基础业务。本人此次完成课程独立工程配置及 H5 契约适配，补充白名单测试登录、PBKDF2、Bearer、资源归属、购物车数量修正、订单服务端计价/事务/快照、模拟支付及条件状态迁移等；具体证据见实现说明与测试报告。不能把全部复用代码写成原创，参考项目指标也不能作本项目性能数据。

营业状态目前存在进程内，初始营业，重启恢复；不是 Redis 持久化。WebSocket 端点注册配置仅在 `external` profile 启用，默认 `course` 不注册 `/ws/{sid}`；当前催单完成归属/状态校验和事件生成，不提供已验收推送。前端主流程用订单查询。真实 MySQL、Redis、浏览器、推送和 Nginx 的验证范围在报告分别列出；没有经过实测的不标通过。当前仅完成后端交付准备，不声称已完成第 6 周联调或第 8 周部署。
