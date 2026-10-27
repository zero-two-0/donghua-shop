# 本机私密配置模板。复制为 env.local.ps1 后填写真实口令。
# env.local.ps1 已被 .gitignore 忽略；仓库中不保存任何真实口令，脚本从这些环境变量读取。
$Env:DH_DB_ROOT_PASSWORD   = '<MySQL root 口令>'
$Env:DH_DB_APP_PASSWORD    = '<旧草案库 donghua_shop 应用口令>'
$Env:SKY_DB_APP_PASSWORD   = '<课程库 takeout_course 应用账号 sky_app 的口令>'
$Env:COURSE_ADMIN_PASSWORD = '<首次启动后端时创建的 admin 口令，8-128 位>'
