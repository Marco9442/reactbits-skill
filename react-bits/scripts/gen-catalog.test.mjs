import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from './gen-catalog.mjs';

const item = (title, description, dependencies = []) => ({
  name: `${title}-TS-TW`, title, description, dependencies,
});
const llms = '## Animations\n\n- [Blur Text](https://reactbits.dev/animations/blur-text): Official description. CLI: `BlurText`.\n';
const blurText = item('BlurText', 'Registry description.', ['motion@^12.0.0']);
const evilEye = item('EvilEye', 'Procedural evil eye shader.', ['ogl@^1.0.11']);

test('keeps official categories and descriptions when sources agree', () => {
  const result = buildCatalog({ items: [blurText] }, llms);
  assert.equal(result.total, 1);
  assert.deepEqual(result.categories, ['Animations']);
  assert.deepEqual(result.missingFromLlms, []);
  assert.match(result.content, /## Animations \(1\)/);
  assert.match(result.content, /\*\*BlurText\*\* — Official description\. \(deps: motion\)/);
  assert.doesNotMatch(result.content, /Uncategorized/);
});

test('includes a registry-only component without losing existing entries', () => {
  const result = buildCatalog({ items: [blurText, evilEye] }, llms);
  assert.equal(result.total, 2);
  assert.deepEqual(result.missingFromLlms, ['EvilEye']);
  assert.match(result.content, /\*\*BlurText\*\* — Official description\. \(deps: motion\)/);
  assert.match(result.content, /## Uncategorized \(1\)\n\n- \*\*EvilEye\*\* — Procedural evil eye shader\. \(deps: ogl\)/);
});

test('moves a component to its official category once llms.txt catches up', () => {
  const updatedLlms = `${llms}\n## Backgrounds\n\n- [Evil Eye](https://reactbits.dev/backgrounds/evil-eye): Documented eye shader. CLI: \`EvilEye\`.\n`;
  const result = buildCatalog({ items: [blurText, evilEye] }, updatedLlms);
  assert.equal(result.total, 2);
  assert.deepEqual(result.missingFromLlms, []);
  assert.match(result.content, /## Backgrounds \(1\)\n\n- \*\*EvilEye\*\* — Documented eye shader\. \(deps: ogl\)/);
  assert.doesNotMatch(result.content, /Uncategorized/);
});

test('still rejects documented components missing from the registry', () => {
  assert.throws(() => buildCatalog({ items: [evilEye] }, llms), /in llms.txt but not registry: BlurText/);
});

test('does not silently accept empty or unrecognized sources', () => {
  assert.throws(() => buildCatalog({ items: [] }, llms), /registry has no items/);
  assert.throws(() => buildCatalog({ items: [blurText] }, 'invalid'), /llms.txt has no recognized components/);
  assert.throws(() => buildCatalog({ items: [blurText] }, `## Pro Components\n${llms.split('\n').at(2)}`), /llms.txt has no recognized components/);
});

test('requires a registry description and keeps fallback text on one line', () => {
  assert.throws(() => buildCatalog({ items: [blurText, item('EvilEye', '')] }, llms), /registry component has no description: EvilEye/);
  const result = buildCatalog({ items: [blurText, item('EvilEye', ' Eye\n shader. ', ['@react-three/fiber@^9.3.0'])] }, llms);
  assert.match(result.content, /\*\*EvilEye\*\* — Eye shader\. \(deps: @react-three\/fiber\)/);
});
