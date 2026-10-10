// Shared test helper: load the REAL vendored svgpath bundle (the same file
// index.html loads) into a vm sandbox and return the `svgpath` global.
//
// Keeps every test zero-dependency and makes baked-coordinate assertions
// meaningful — svgpath must actually transform path data for the lib code
// to produce final canvas coordinates.
//
// Usage:
//   import { loadVendoredSvgpath } from './lib/load-svgpath.mjs';
//   mainWindow.svgpath = loadVendoredSvgpath();
//
// Callers keep ownership of the `window` shim; this helper only wires the
// svgpath global into it afterwards.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function loadVendoredSvgpath() {
  const bundle = readFileSync(new URL('../../docs/svgpath.min.js', import.meta.url), 'utf8');
  const sandbox = vm.createContext({ console });
  vm.runInContext(`${bundle}\n;globalThis.__svgpath = svgpath;`, sandbox);
  const svgpath = sandbox.__svgpath;
  assert.ok(typeof svgpath === 'function', 'vendored svgpath bundle did not expose a global');
  return svgpath;
}
