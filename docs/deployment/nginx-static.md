# 静态部署（Nginx）方案与实际验证

| 项 | 内容 |
| --- | --- |
| 编写 | 钱文博（组员） |
| 目标 | 两个前端以纯静态产物运行，接口与菜品图由同源反代提供（后端未开 CORS） |
| 配置文件 | [`deploy/nginx.conf`](../deploy/nginx.conf) |
| 本机状态 | **未安装 Nginx**。用 `scripts/serve-dist.mjs` 实现了完全相同的两条规则并实测，13 项全部通过；Nginx 本身留待第 8 周部署阶段验收 |

## 1 部署结构

```text
浏览器
  ├─ :8081 用户 H5   → Nginx root /var/www/donghua-shop/user-h5  (index.html + /assets/*.js|css)
  └─ :8082 管理 Web  → Nginx root /var/www/donghua-shop/admin-web
          │
          ├─ /user/**        → 反代 127.0.0.1:8080
          ├─ /admin/**       → 反代 127.0.0.1:8080
          ├─ /assets/*.svg   → 反代 127.0.0.1:8080（菜品图在 JAR 的 static/assets 里）
          ├─ /openapi.yaml   → 反代
          └─ 其余 /assets/*  → 本地静态文件（Vite 产物）
```

## 2 必须注意的冲突（F-07）

前端 Vite 产物默认输出到 `/assets/`（`index-*.js`、`*-*.css`），而后端菜品图也在 `/assets/`（`dish-1.svg`、`setmeal-1.svg`）。如果像最初那样写一条

```nginx
location ~ ^/(user|admin|assets|openapi\.yaml)/? { proxy_pass http://127.0.0.1:8080; }
```

会把 `/assets/index-xxx.js` 也转给后端，结果**前端入口 JS 404、页面白屏**。本机实测就是这个现象：

```text
FAIL  用户端入口 JS 可访问且 MIME 正确  {"entry":"/assets/index-xq9dWOja.js","status":404}
FAIL  管理端入口 JS 可访问            {"entry":"/assets/index-CQaQRZVd.js","status":404}
```

正确做法是**按扩展名区分**：只有 `/assets/*.svg` 反代给后端，其余走静态文件（见 `deploy/nginx.conf` 与 `scripts/serve-dist.mjs`）。修正后 13/13 通过。

> 长期建议：后端把课程图片改到 `/static-assets/`（或前端改用 CDN/OSS），彻底避免与构建产物同前缀。这属于契约/后端改动，需组长确认，已登记为 F-07。

## 3 实际验证结果

执行：`node scripts/serve-dist.mjs code\frontend\user-h5\dist 8081` + 管理端 8082，然后 `node scripts\check-static-deploy.mjs`

```text
合计 13 项，通过 13，失败 0
```

| 验证项 | 结果 |
| --- | --- |
| 用户端 `/` 返回 index.html | 200 |
| 用户端入口 JS `/assets/index-*.js` | 200，`text/javascript` |
| 用户端反代 `/user/category/list` | 200，`code=1` |
| 用户端反代菜品图 `/assets/dish-1.svg` | 200，`image/svg+xml` |
| 用户端反代登录并取得令牌 | 200，`code=1` |
| 用户端带令牌调用受保护接口 | 200，`code=1` |
| 用户端未带令牌被拒 | 401 |
| 管理端 `/` 返回 index.html | 200 |
| 管理端入口 JS | 200（分包后 `index-*.js` 仅 9.7 KB） |
| 管理端反代员工登录 | 200，`code=1`，name=课程管理员 |
| 管理端带令牌调用受保护接口 | 200，`code=1` |
| 用户令牌访问管理端被拒 | 401 |
| 未知路径回退 index.html | 200 |

证据：`docs/integration/evidence/static-deploy.json`

## 4 前端产物优化（本次一并完成）

管理端原先单包 1.27 MB，首屏要等整个 Element Plus。已加 `manualChunks` 拆包：

| chunk | 大小 | gzip |
| --- | --- | --- |
| `index-*.js`（业务入口） | 9.68 KB | 4.56 KB |
| `element-plus-*.js` | 1 090 KB | 342 KB |
| `vue-vendor-*.js` | 114 KB | 44 KB |
| `axios-*.js` | 51 KB | 19 KB |

业务代码改动时只需重新下载 9.7 KB 入口，vendor 走缓存。

## 5 第 8 周部署待办（尚未完成，不写成已验收）

1. 在目标机安装 Nginx，套用 `deploy/nginx.conf`（修改 `root` 与端口），`nginx -t` 通过后 reload；
2. 后端以 systemd / 计划任务方式常驻，环境变量从部署环境注入（`DB_*`、`COURSE_ADMIN_PASSWORD`、`SKY_JWT_*`）；
3. 验证 HTTPS（课程可用自签或跳过）、静态缓存头、`client_max_body_size`；
4. 用真实浏览器跑一遍主流程并截图，形成部署验收记录；
5. 若采纳 F-07 的改名方案，需同步修改契约、后端静态资源路径与前端图片解析。
