> **状态：组员第 1~3 周草案（已归档，勿作为依据）**
> 组长刘晟玺已交付正式版本，权威文件见 `docs/leader/code/backend（组长后端已实际交付）`；本文件仅保留为过程留痕。
> 最新整合结果与实测证据见 `docs/integration/`（contract-diff / page-api-map / defects / integration-record）。
# 前端素材兼容性检查记录

| 项 | 内容 |
| --- | --- |
| 检查人 | 钱文博（组员） |
| 检查日期 | 2026-10-26 |
| 检查目的 | 第 2 周任务：验证计划书中提到的“可复用素材”在本机是否真的可用，据此决定复用或重建 |
| 结论摘要 | **两个候选素材均不可直接复用**：uni-app 用户端工程不在本机、无法验证 H5 构建；管理端旧模板为 Vue 2 + Element UI，与任务书要求的 Vue 3 + Element Plus 不一致。本期改为按信息架构新建 Vue 3 工程，页面设计与交互参考素材思路，不迁移源码。 |

## 1 检查项与结果

| # | 检查项 | 期望 | 本机实际 | 结论 |
| --- | --- | --- | --- | --- |
| 1 | 苍穹外卖后端工程 `sky-take-out` | 存在且可构建 | 计划书给出的路径 `/Users/mac/Documents/skyTakeOut/sky-take-out` 是**组长 Mac 上的路径**，本机（Windows）不存在 | 不可用（未获取素材） |
| 2 | 管理端页面 `project-sky-admin-vue-ts` | 存在，Vue 3 + Element Plus | 本机不存在；计划书说明其为 Vue 2 + Element UI | 不可用（版本不符 + 素材缺失） |
| 3 | 用户端 `project-rjwm-weixin-uniapp-develop-wsy` | 存在，可构建 H5 | 本机不存在，无法执行 `npm run build:h5` 验证 | 不可用（无法验证构建） |
| 4 | 苍穹外卖学习总结文档 | 存在 | 本机不存在 | 仅可参考计划书转述 |
| 5 | 本机已有的点餐类旧工程 | 可作参考 | 存在 `DonghuaShopSpring-original-backup.zip`：Spring MVC + JSP 单体（`edu.dhu.shop`，含 Goods/Cart/Order/User 控制器与 JSP 视图），Java 8 时代的作业 | **仅参考**：数据模型思路可借鉴，前端为 JSP 服务端渲染，与本项目前后端分离架构不同，代码不可复用 |
| 6 | 本机前端工具链 | 可构建 Vue 3 工程 | Node 22.19.0、pnpm 10.34.9、Vite 6.4.5 均可用；已实测构建成功 | 可用 |
| 7 | 手机浏览器演示条件 | 可访问 | Vite dev server 绑定 `127.0.0.1`，同一局域网手机需改为 `--host 0.0.0.0` 或使用桌面浏览器设备模拟 | 可用（需指定 host，已在技术方案记录） |
| 8 | 小程序条件 | 账号/认证 | 不具备，且任务书允许 H5 | 已按 H5 方案执行 |

## 2 证据

### 2.1 素材路径不存在（Windows 本机）

计划书第 1 章给出的四个素材路径全部以 `/Users/mac/...` 开头，属于 macOS 路径。在本机 PowerShell 中检查：

```text
PS> Test-Path '/Users/mac/Documents/skyTakeOut/sky-take-out'
False
```

→ 说明素材只存在于组长机器上，组员侧只能在拿到素材后另做检查，不能凭“计划书里有”就认定可复用。

### 2.2 旧工程技术栈核对（zip 内容）

`DonghuaShopSpring-original-backup.zip` 结构摘要：

```text
src/main/java/edu/dhu/shop/
  bean/{Goods,CartItem,Order,User}.java
  controller/{Home,Goods,Cart,Order,User}Controller.java
  service/{GoodsService,ShopService,UserService}.java
  dao/DBUtil.java
src/main/webapp/WEB-INF/views/{index,goods,goodsDetail,cart,order,login,register}.jsp
src/main/resources/spring-mvc.xml
```

- 视图是服务端 JSP，页面逻辑与数据访问强耦合在 Controller 中；
- 无前后端分离的 JSON 接口层，也没有 Node 构建产物；
- 打包形态为 `war`（外置 Tomcat）。

→ 与本项目“Vue 3 前端 + Spring Boot JSON 接口”的架构不同，**不可作为前端素材复用**，仅在“菜品/购物车/订单”实体划分上可作为参考。

### 2.3 新工程构建实测（替代方案成立）

```text
frontend/user-h5     vite build  → ✓ built in 7.38s，26 个文件 607.8 KB
frontend/admin-web   vite build  → ✓ built in 10.40s，19 个文件 1624.5 KB
```

同时在两端实现了与契约一致的 Mock 层，说明“新建工程 + Mock 先行”的路线可以在第 4 周前不依赖后端独立推进。

## 3 决策

| 决策 | 内容 | 依据 |
| --- | --- | --- |
| D-01 | 用户端新建 Vue 3 + Vant 工程，不复用 uni-app 工程 | uni-app 素材缺失且 H5 构建未验证；任务书允许 Vue3 + Vant |
| D-02 | 管理端新建 Vue 3 + Element Plus 工程，只参考旧模板信息架构（左侧菜单 + 列表 + 弹窗表单） | Vue 2 已停止维护，迁移成本高于重写 |
| D-03 | 旧 JSP 工程只作实体与业务规则的参考，不复制代码 | 架构不匹配，且属于他人/往届代码，复用需说明来源 |
| D-04 | 若第 2 周内能拿到组长机器上的素材，再补做一次“可构建性 + 接口差异”检查 | 当前结论基于“本机没有素材”，需保留复查入口 |

## 4 遗留动作

1. 请组长确认素材是否可打包提供（或确认本组不依赖素材，全部自研）。
2. 若提供素材，本记录第 1 节需补测：`npm install` 是否成功、H5 构建是否通过、接口路径与本项目契约的差异清单。
3. 任何复用都需在课程技术报告中写明来源与改动范围，避免把参考项目已有能力写成自研成果。
