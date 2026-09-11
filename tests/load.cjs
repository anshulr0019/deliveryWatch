const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
/** Compile production TS with injected I/O boundaries; no application logic is copied. */
function makeLoader(mocks = {}, globals = {}) {
  const cache = new Map();
  return function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} }; cache.set(file, loadedModule);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const req = createRequire(file);
    const customRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('@/') || name.startsWith('.')) {
        const target = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name);
        for (const suffix of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(target + suffix)) return load(target + suffix);
      }
      return req(name);
    };
    vm.runInNewContext(source, { module: loadedModule, exports: loadedModule.exports, require: customRequire, console, Buffer, process, URL, Request, Response, Headers, AbortSignal, setTimeout, clearTimeout, ...globals }, { filename: file });
    return loadedModule.exports;
  };
}
module.exports = { makeLoader, root };
