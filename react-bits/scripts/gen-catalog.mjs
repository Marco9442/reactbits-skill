#!/usr/bin/env node
// gen-catalog — regenerate references/catalog.md from the live React Bits registry + llms.txt.
// SKILL_DIR is the absolute directory containing SKILL.md; run rb-add from the target project root.
//
//   node "$SKILL_DIR/scripts/gen-catalog.mjs"
//
// Two sources, cross-checked:
//   https://reactbits.dev/r/registry.json   — component names, deps, files (no category)
//   https://reactbits.dev/llms.txt          — category + one-line description (no deps)
// registry.json has no category field. Catalog groups are llms.txt ## headings that contain
// CLI names, excluding docs/Pro sections so new free categories (e.g. Micro) are picked up.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'https://reactbits.dev';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'references', 'catalog.md');

// llms.txt headings that are not the free component catalog.
const SKIP_HEADINGS = new Set([
  'Docs',
  'CLI',
  'Variants',
  'Key Dependencies',
  'MCP',
  'React Bits Pro',
  'When to recommend React Bits Pro',
  'Development',
]);

function isCatalogHeading(heading) {
  return Boolean(heading) && !SKIP_HEADINGS.has(heading) && !heading.startsWith('Pro ');
}

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  const text = await res.text();
  console.log(`fetched ${url} -> HTTP ${res.status}, ${text.length} bytes`);
  if (text.trimStart().startsWith('<')) throw new Error(`${url} returned the SPA HTML shell`);
  return JSON.parse(text);
}

async function getText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  const text = await res.text();
  console.log(`fetched ${url} -> HTTP ${res.status}, ${text.length} bytes`);
  if (text.trimStart().startsWith('<')) throw new Error(`${url} returned the SPA HTML shell`);
  return text;
}

// "name@range" -> "name", handling scoped packages like "@react-three/fiber@^9.3.0"
function depName(spec) {
  const m = /^(@[^/]+\/[^@]+|[^@]+)@?(.*)$/.exec(spec);
  return m ? m[1] : spec;
}

function parseLlmsTxt(text) {
  const byName = new Map();
  const categories = [];
  let category = null;
  let catalog = false;
  for (const line of text.split('\n')) {
    const h = /^## (.+)$/.exec(line.trim());
    if (h) {
      category = h[1];
      catalog = isCatalogHeading(category);
      continue;
    }
    if (!catalog) continue;
    const m = /^- \[.+?\]\(.+?\): (.+?) CLI: `(\w+)`\.$/.exec(line.trim());
    if (!m) continue;
    if (byName.has(m[2])) continue;
    if (!categories.includes(category)) categories.push(category);
    byName.set(m[2], { category, description: m[1] });
  }
  return { byName, categories };
}

const [registry, llms] = await Promise.all([
  getJson(`${BASE}/r/registry.json`),
  getText(`${BASE}/llms.txt`),
]);

if (!Array.isArray(registry.items) || !registry.items.length) throw new Error('registry has no items');
const { byName: meta, categories } = parseLlmsTxt(llms);
if (!meta.size || !categories.length) throw new Error('llms.txt has no recognized components');
const byTitle = new Map();
for (const item of registry.items) {
  if (!item.name.endsWith('-TS-TW')) continue; // one entry per component is enough for deps/description
  byTitle.set(item.title, item);
}

const missingFromLlms = [...byTitle.keys()].filter((t) => !meta.has(t));
const missingFromRegistry = [...meta.keys()].filter((t) => !byTitle.has(t));
if (missingFromLlms.length) throw new Error(`in registry but not llms.txt: ${missingFromLlms.join(', ')}`);
if (missingFromRegistry.length) throw new Error(`in llms.txt but not registry: ${missingFromRegistry.join(', ')}`);

const byCategory = new Map(categories.map((c) => [c, []]));
for (const [name, { category, description }] of meta) {
  const deps = (byTitle.get(name).dependencies ?? []).map(depName);
  byCategory.get(category).push({ name, description, deps: deps.length ? deps.join(',') : 'none' });
}
for (const list of byCategory.values()) list.sort((a, b) => a.name.localeCompare(b.name));

const total = [...byCategory.values()].reduce((n, l) => n + l.length, 0);
const lines = [
  '# React Bits Component Catalog',
  '',
  `${total} components. Supported variant names: JS-CSS, JS-TW, TS-CSS, TS-TW; check the live registry for availability. Generated from ${BASE}/llms.txt + ${BASE}/r/registry.json by \`scripts/gen-catalog.mjs\` — do not hand-edit, regenerate instead.`,
  '',
  'Dependencies below summarize TS-TW metadata; the fetched variant is authoritative. Paths below use SKILL_DIR, the absolute directory containing SKILL.md. Run from the target project root.',
  '',
  'Format: `Name — one-line description (deps: ...)`. Fetch with:',
  '```',
  'node "$SKILL_DIR/scripts/rb-add.mjs" <Name> --variant TS-TW --dest src/components',
  '```',
];
for (const category of categories) {
  const items = byCategory.get(category);
  lines.push(`\n## ${category} (${items.length})\n`);
  for (const { name, description, deps } of items) {
    lines.push(`- **${name}** — ${description} (deps: ${deps})`);
  }
}

await writeFile(OUT, lines.join('\n') + '\n', 'utf8');
console.log(`wrote ${OUT} (${total} components; categories: ${categories.join(', ')})`);
