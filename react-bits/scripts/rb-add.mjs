#!/usr/bin/env node
// rb-add — fetch React Bits components from the public shadcn registry.
// SKILL_DIR is the absolute directory containing SKILL.md; run rb-add from the target project root.
//
//   node "$SKILL_DIR/scripts/rb-add.mjs" Aurora BlurText --variant TS-TW --dest src/components
//   node "$SKILL_DIR/scripts/rb-add.mjs" --list
//   node "$SKILL_DIR/scripts/rb-add.mjs" Aurora --install
//
// The registry is a static shadcn registry:
//   index      https://reactbits.dev/r/registry.json
//   component  https://reactbits.dev/r/<Name>-<JS|TS>-<CSS|TW>.json
//
// reactbits.dev is an SPA: unknown paths return HTTP 200 with an HTML shell,
// so every response must be JSON-validated. Status code alone proves nothing.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';

const BASE = 'https://reactbits.dev';
const VARIANTS = ['JS-CSS', 'JS-TW', 'TS-CSS', 'TS-TW'];

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) {
    throw new Error(`${url} returned the SPA HTML shell (component does not exist)`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON (${res.status}, ${text.length} bytes)`);
  }
}

// Deps are "name@range" strings; some components use scoped packages
// ("@react-three/fiber@^9.3.0"). Splitting on "@" naively yields "".
export function parseDep(spec) {
  const m = /^(@[^/]+\/[^@]+|[^@]+)@(.*)$/.exec(spec);
  return m ? { name: m[1], range: m[2] } : { name: spec, range: '' };
}

async function loadIndex() {
  const reg = await getJson(`${BASE}/r/registry.json`);
  if (!Array.isArray(reg.items) || !reg.items.length) throw new Error('registry has no items');
  const byTitle = new Map();
  for (const item of reg.items) {
    const variant = item.name.slice(item.title.length + 1);
    if (!byTitle.has(item.title)) byTitle.set(item.title, { title: item.title, variants: {} });
    byTitle.get(item.title).variants[variant] = item;
  }
  return byTitle;
}

function resolveName(index, input) {
  if (index.has(input)) return input;
  const hit = [...index.keys()].find((t) => t.toLowerCase() === input.toLowerCase().replace(/-/g, ''));
  if (hit) return hit;
  const near = [...index.keys()].filter((t) => t.toLowerCase().includes(input.toLowerCase())).slice(0, 5);
  throw new Error(`unknown component "${input}"${near.length ? ` — did you mean: ${near.join(', ')}?` : ''}`);
}

async function add(name, { variant, dest, index }) {
  const title = resolveName(index, name);
  const entry = index.get(title);
  if (!entry.variants[variant]) {
    throw new Error(`${title} has no ${variant} variant (has: ${Object.keys(entry.variants).join(', ')})`);
  }
  const item = await getJson(`${BASE}/r/${title}-${variant}.json`);
  if (!Array.isArray(item.files) || !item.files.length) throw new Error(`${title}-${variant} has no files`);

  const written = [];
  for (const file of item.files) {
    if (typeof file.path !== 'string' || !file.path || typeof file.content !== 'string') {
      throw new Error(`${title}-${variant}: invalid file path or content`);
    }
    const out = resolve(dest, file.path);
    const rel = relative(resolve(dest), out);
    if (!rel || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) {
      throw new Error(`${title}-${variant}: file path escapes destination: ${file.path}`);
    }
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, file.content, 'utf8');
    written.push({ path: out, bytes: Buffer.byteLength(file.content, 'utf8') });
  }
  return { title, description: item.description, written, deps: (item.dependencies ?? []).map(parseDep) };
}

const argv = process.argv.slice(2);
const usage = 'usage: rb-add <Component...> [--variant TS-TW] [--dest path] [--install] [--list]';
let variant = 'TS-TW';
let dest = 'src/components';
let doInstall = false;
let list = false;
const names = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--help' || arg === '-h') {
    console.log(usage);
    process.exit(0);
  } else if (arg === '--variant' || arg === '--dest') {
    const value = argv[++i];
    if (!value || value.startsWith('--')) {
      console.error(`${arg} requires a value`);
      process.exit(1);
    }
    if (arg === '--variant') variant = value;
    else dest = value;
  } else if (arg === '--install') doInstall = true;
  else if (arg === '--list') list = true;
  else if (arg.startsWith('-')) {
    console.error(`unknown option: ${arg}`);
    process.exit(1);
  } else names.push(arg);
}
if (!list && !names.length) {
  console.error(usage);
  process.exit(1);
}

if (!VARIANTS.includes(variant)) {
  console.error(`--variant must be one of ${VARIANTS.join(', ')}`);
  process.exit(1);
}

const index = await loadIndex();

if (list) {
  for (const title of [...index.keys()].sort()) console.log(title);
  console.log(`\n${index.size} components`);
  process.exit(0);
}

const deps = new Map();
let failed = 0;

for (const name of names) {
  try {
    const r = await add(name, { variant, dest, index });
    for (const d of r.deps) deps.set(d.name, d.range);
    const files = r.written.map((w) => `${w.path} (${w.bytes}B)`).join(', ');
    console.log(`ok   ${r.title.padEnd(20)} ${files}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name.padEnd(20)} ${err.message}`);
  }
}

if (deps.size) {
  const specs = [...deps].map(([n, r]) => (r ? `${n}@${r}` : n));
  console.log(`\ndependencies: ${specs.join(' ')}`);
  if (doInstall) {
    console.log('installing...');
    execFileSync('npm', ['install', ...specs], { stdio: 'inherit' });
  } else {
    console.log(`\n  npm install ${specs.map((spec) => `'${spec.replaceAll("'", "'\"'\"'")}'`).join(' ')}`);
  }
}

process.exit(failed ? 1 : 0);
