// End-to-end: run a favicon built by the real seam through the portfolio's
// real checker. Proves the creator's output meets the canonical contract.
//
// Run:  node tests/e2e-canonical.mjs <path-to-check-favicon.mjs>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

// The portfolio repo checks out next to this one in the dev workspace.
const CHECKER = process.argv[2] ||
  'd:/dev/danielmroczek.github.io/scripts/check-favicon.mjs';

// Browser shims sufficient for the libs under Node.
const mainWindow = {
  svgpath: undefined,
};
globalThis.window = mainWindow;

// In Node there is no DOMParser; the e2e focuses on the assembled string, so
// we use pre-converted canonical subpaths (the DOM-facing conversion is
// covered in path-lib/build-favicon tests).
await import('../docs/lib/path-lib.js');
await import('../docs/lib/favicon.js');
const { buildFaviconSvg } = mainWindow.faviconLib;
assert.ok(mainWindow.faviconPathLib, 'path-lib did not load');

// Real svgpath — loaded from the vendored browser bundle (the same file
// index.html loads), keeping the test zero-dependency.
const bundle = readFileSync(new URL('../docs/svgpath.min.js', import.meta.url), 'utf8');
const vm = await import('node:vm');
const sandbox = vm.createContext({ console });
vm.runInContext(`${bundle}\n;globalThis.__svgpath = svgpath;`, sandbox);
mainWindow.svgpath = sandbox.__svgpath;
assert.ok(typeof mainWindow.svgpath === 'function', 'vendored svgpath bundle did not expose a global');

// A house-like icon made of stroke subpaths (in 24-unit space), same shape a
// Lucide icon would produce after shape→path conversion.
const strokeSubpaths = [
  'M3 9L12 2L21 9V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20Z',
  'M9 22V12H15V22',
];

const svg = buildFaviconSvg({
  color1: '#3b82f6',
  color2: '#8b5cf6',
  gradientAngle: 315,
  borderRadius: 4,
  iconColor: '#f5f5f5',
  strokeWidth: 2,
  strokeLinecap: 'round',
  iconX: 5,
  iconY: 5,
  iconSize: 22,
  iconRotation: 45,
  strokeSubpaths,
  fillSubpaths: [],
});

console.log('--- generated favicon ---');
console.log(svg);
console.log('-------------------------');

const dir = mkdtempSync(join(tmpdir(), 'favicon-e2e-'));
const file = join(dir, 'favicon.svg');
writeFileSync(file, svg);

try {
  const output = execFileSync('node', [CHECKER, file], { encoding: 'utf8' });
  console.log(output);
  // The checker prints "No hard violations." on success — only the ✗ marker
  // (with its hard-violation count) means failure.
  if (output.includes('✗')) {
    console.error('E2E FAILED: checker reported hard violations');
    process.exit(1);
  }
  console.log('E2E OK — canonical checker accepts the creator output');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
