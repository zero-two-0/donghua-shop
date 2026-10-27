// 下载工具：绕过 schannel（PowerShell/curl 在本机 TLS 凭证受限），统一用 Node 的 fetch + fs 写盘。
// 用法：
//   node tools/fetch.js list <url>
//   node tools/fetch.js get <url> <outPath>
const fs = require('node:fs');
const path = require('node:path');

async function list(url) {
  const r = await fetch(url, { redirect: 'follow' });
  const t = await r.text();
  const links = [...t.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  console.log(`HTTP ${r.status}  ${url}`);
  for (const l of links) console.log(l);
}

async function get(url, out) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText} for ${url}`);
  const total = Number(r.headers.get('content-length') || 0);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const file = fs.createWriteStream(out);
  let got = 0;
  let lastPct = -1;
  const reader = r.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    got += value.length;
    if (!file.write(value)) await new Promise((res) => file.once('drain', res));
    const pct = total ? Math.floor((got / total) * 100) : 0;
    if (pct !== lastPct && pct % 10 === 0) {
      lastPct = pct;
      process.stdout.write(`\r${pct}%  ${(got / 1048576).toFixed(1)}MB / ${(total / 1048576).toFixed(1)}MB`);
    }
  }
  await new Promise((res) => file.end(res));
  process.stdout.write(`\r100%  ${(got / 1048576).toFixed(1)}MB -> ${out}\n`);
}

const [, , cmd, a, b] = process.argv;
if (cmd === 'list') list(a).catch((e) => { console.error(e.message); process.exit(1); });
else if (cmd === 'get') get(a, b).catch((e) => { console.error(e.message); process.exit(1); });
else { console.error('usage: node fetch.js list <url> | get <url> <out>'); process.exit(2); }
