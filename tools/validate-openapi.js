// OpenAPI 契约自检：
//   1) YAML 是否可解析；2) 所有 $ref 是否可解析；3) 是否存在重复 operationId；
//   4) 每个操作是否声明 responses；5) 前端 src/api/*.js 里的实际调用路径是否全部出现在契约中。
// 用法：node tools/validate-openapi.js
const fs = require('node:fs')
const path = require('node:path')
const yaml = require('./yaml/node_modules/js-yaml')

const root = path.resolve(__dirname, '..')
const specPath = path.join(root, 'docs/api/openapi.yaml')
const errors = []
const warnings = []

let spec
try {
  spec = yaml.load(fs.readFileSync(specPath, 'utf8'))
} catch (e) {
  console.error('YAML 解析失败：', e.message)
  process.exit(1)
}

// ---------- 1. $ref 解析 ----------
function resolveRef(ref) {
  if (!ref.startsWith('#/')) return null
  return ref
    .slice(2)
    .split('/')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), spec)
}

function walk(node, at, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${at}[${i}]`, visit))
    return
  }
  visit(node, at)
  for (const [k, v] of Object.entries(node)) walk(v, `${at}.${k}`, visit)
}

let refCount = 0
walk(spec, '#', (node, at) => {
  if (typeof node.$ref === 'string') {
    refCount++
    const target = resolveRef(node.$ref)
    if (target === undefined) errors.push(`无法解析的 $ref: ${node.$ref} (位于 ${at})`)
    if (target === null) warnings.push(`外部 $ref 未校验: ${node.$ref}`)
  }
})

// ---------- 2. 操作完整性 ----------
const httpMethods = ['get', 'post', 'put', 'patch', 'delete']
const endpoints = []
const seen = new Map()
for (const [p, item] of Object.entries(spec.paths || {})) {
  for (const m of httpMethods) {
    const op = item[m]
    if (!op) continue
    endpoints.push({ method: m.toUpperCase(), path: p, op })
    if (!op.summary) warnings.push(`${m.toUpperCase()} ${p} 缺少 summary`)
    if (!op.responses || Object.keys(op.responses).length === 0) {
      errors.push(`${m.toUpperCase()} ${p} 未声明 responses`)
    }
    if (op.operationId) {
      if (seen.has(op.operationId)) errors.push(`operationId 重复: ${op.operationId}`)
      seen.set(op.operationId, true)
    }
    // path 参数必须全部声明
    const declared = (op.parameters || [])
      .concat(item.parameters || [])
      .map((x) => (x.$ref ? resolveRef(x.$ref) : x))
      .filter(Boolean)
      .map((x) => x.name)
    const inPath = [...p.matchAll(/\{([^}]+)\}/g)].map((x) => x[1])
    for (const name of inPath) {
      if (!declared.includes(name)) errors.push(`${m.toUpperCase()} ${p} 缺少 path 参数声明: ${name}`)
    }
  }
}

// ---------- 3. 前端调用 vs 契约 ----------
function normalize(p) {
  // 契约里的 path 不含 /api 前缀（baseURL 在 servers / axios 中统一加），比较前先统一去掉
  return p
    .replace(/^\/api/, '')
    .replace(/\$\{[^}]+\}/g, '{p}')
    .replace(/\{[^}]+\}/g, '{p}')
}

const specSet = new Set(endpoints.map((e) => `${e.method} ${normalize(e.path)}`))
const apiFiles = []
for (const app of ['user-h5', 'admin-web']) {
  const dir = path.join(root, 'frontend', app, 'src', 'api')
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.js')) apiFiles.push(path.join(dir, f))
  }
}

const callRe = /http\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/g
const called = []
for (const file of apiFiles) {
  const text = fs.readFileSync(file, 'utf8')
  let match
  while ((match = callRe.exec(text)) !== null) {
    const method = match[1].toUpperCase()
    const raw = match[2]
    called.push({ method, raw, specPath: `/api${raw}`, file: path.basename(file) })
  }
}

const missing = called.filter((c) => !specSet.has(`${c.method} ${normalize(c.specPath)}`))

// ---------- 输出 ----------
console.log(`契约文件：${path.relative(root, specPath)}`)
console.log(`OpenAPI 版本：${spec.openapi}；接口数：${endpoints.length}；\$ref 数：${refCount}`)
console.log(`前端 API 调用：${called.length} 个，位于 ${apiFiles.length} 个文件`)
console.log(`契约覆盖：${called.length - missing.length}/${called.length}`)
if (warnings.length) {
  console.log('\n警告：')
  for (const w of warnings) console.log(`  - ${w}`)
}
if (missing.length) {
  console.log('\n以下前端调用在契约中找不到对应接口：')
  for (const m of missing) console.log(`  - ${m.method} ${m.specPath}  (${m.file})`)
  errors.push(`${missing.length} 个前端调用未被契约覆盖`)
}
if (errors.length) {
  console.log('\n错误：')
  for (const e of errors) console.log(`  - ${e}`)
  console.log(`\n契约自检失败（${errors.length} 个错误）`)
  process.exit(1)
}
console.log('\n契约自检通过。')
