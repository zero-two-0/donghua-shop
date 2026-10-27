// 汇总组长交付的 OpenAPI：接口清单 + 关键 Schema，用于与本项目前端对齐。
const fs = require('node:fs')
const yaml = require('./yaml/node_modules/js-yaml')

const spec = yaml.load(fs.readFileSync(process.argv[2], 'utf8'))
const out = []
const P = (s) => out.push(s)

P(`openapi: ${spec.openapi}  title: ${spec.info?.title}  version: ${spec.info?.version}`)
P(`servers: ${(spec.servers || []).map((s) => s.url).join(' | ')}`)
P(`security: ${JSON.stringify(spec.security || [])}`)
P(`tags: ${(spec.tags || []).map((t) => t.name).join(', ')}`)
P('')

const methods = ['get', 'post', 'put', 'patch', 'delete']
P('=== 接口清单 ===')
for (const [path, item] of Object.entries(spec.paths || {})) {
  for (const m of methods) {
    const op = item[m]
    if (!op) continue
    const sec = op.security === undefined ? '(继承全局)' : JSON.stringify(op.security)
    const params = (op.parameters || [])
      .map((p) => `${p.in}:${p.name}${p.required ? '*' : ''}`)
      .join(', ')
    const body = op.requestBody
      ? ' body=' + JSON.stringify(Object.keys(op.requestBody.content || {}).map((k) => op.requestBody.content[k].schema))
      : ''
    P(`${m.toUpperCase().padEnd(6)} ${path}`)
    P(`        summary: ${op.summary || ''}`)
    P(`        tags: ${(op.tags || []).join(',')} | security: ${sec}`)
    if (params) P(`        params: ${params}`)
    if (body) P(`        ${body}`)
    const codes = Object.keys(op.responses || {}).join(',')
    P(`        responses: ${codes}`)
  }
}

P('')
P('=== 组件 Schema（字段/类型/必填） ===')
const deref = (o) => {
  if (o && o.$ref) {
    const n = o.$ref.split('/').pop()
    return { name: n, schema: spec.components.schemas[n] }
  }
  return { name: null, schema: o }
}
for (const [name, s] of Object.entries(spec.components?.schemas || {})) {
  P(`-- ${name}${s.description ? '  // ' + String(s.description).replace(/\n/g, ' ') : ''}`)
  const props = s.properties || (s.allOf ? [] : {})
  if (s.allOf) {
    P(`   allOf: ${s.allOf.map((x) => x.$ref || JSON.stringify(x.type)).join(' + ')}`)
  }
  for (const [k, v] of Object.entries(props)) {
    const t = v.type || (v.$ref ? v.$ref.split('/').pop() : (v.allOf ? 'allOf' : (v.oneOf ? 'oneOf' : '?')))
    const extra = []
    if (v.format) extra.push(v.format)
    if (v.enum) extra.push('enum=' + v.enum.join('|'))
    if (v.items) extra.push('items=' + (v.items.$ref ? v.items.$ref.split('/').pop() : v.items.type || '?'))
    if (v.$ref) extra.push('ref')
    P(`   ${k}: ${t}${extra.length ? ' (' + extra.join(', ') + ')' : ''}${s.required && s.required.includes(k) ? ' *必填' : ''}`)
  }
}
fs.writeFileSync(process.argv[3], out.join('\n'), 'utf8')
console.log('written', process.argv[3], out.length, 'lines')
