#!/usr/bin/env node
/**
 * 依赖方向检查：src/ 里的 import 必须符合 03-architecture.md 的分层表。
 * 用法：node scripts/check-layers.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src');

/** 每个目录允许引用哪些层。data 指 src 之外的 data/ 数据表。 */
const ALLOWED = {
  main: ['app', 'world', 'devices', 'render', 'ui', 'events', 'data'],
  app: ['app', 'world', 'devices', 'render', 'ui', 'events', 'data'],
  world: ['world', 'events', 'data'],
  devices: ['devices', 'world', 'events', 'data'],
  render: ['render', 'world', 'devices', 'events', 'data'],
  ui: ['ui', 'world', 'devices', 'events', 'data'],
  events: [],
};

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function layerOf(file) {
  const rel = path.relative(srcDir, file);
  if (!rel.includes(path.sep)) return path.basename(rel, '.ts');
  return rel.split(path.sep)[0];
}

function resolveTarget(spec, fromFile) {
  const resolved = path.resolve(path.dirname(fromFile), spec);
  const rel = path.relative(srcDir, resolved);
  if (rel.startsWith('..')) return 'data';
  if (!rel.includes(path.sep)) return path.basename(rel, '.ts');
  return rel.split(path.sep)[0];
}

function importsOf(source) {
  const specs = new Set();
  for (const pattern of [/\bfrom\s+['"]([^'"]+)['"]/g, /\bimport\s+['"]([^'"]+)['"]/g]) {
    for (const match of source.matchAll(pattern)) specs.add(match[1]);
  }
  return [...specs].filter((spec) => spec.startsWith('.'));
}

const files = await collect(srcDir);
const violations = [];

for (const file of files) {
  const from = layerOf(file);
  const allowed = ALLOWED[from];
  if (!allowed) {
    violations.push(`${path.relative(root, file)}：未知层 ${from}`);
    continue;
  }
  const source = await readFile(file, 'utf8');
  for (const spec of importsOf(source)) {
    const target = resolveTarget(spec, file);
    if (!allowed.includes(target)) {
      violations.push(`${path.relative(root, file)}：${from} 不允许引用 ${target}（${spec}）`);
    }
  }
}

if (violations.length > 0) {
  console.error(`依赖方向违规 ${violations.length} 处：`);
  for (const line of violations) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`依赖方向检查通过：${files.length} 个文件`);
