// Read-only instrumentation for the release audit. Run with Node --import;
// it records actual calls without changing dependency policy or behavior.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const evidence = { pid: process.pid, argv: process.argv, cachePolicyConstructors: 0, bracesInputs: [] as string[] };
const policyPath = require.resolve('http-cache-semantics');
const Policy = require(policyPath);
require.cache[policyPath]!.exports = new Proxy(Policy, {
  construct(target, args, newTarget) { evidence.cachePolicyConstructors++; return Reflect.construct(target, args, newTarget); },
});
const bracesPath = require.resolve('braces');
const braces = require(bracesPath);
const record = (args: unknown[]) => { if (typeof args[0] === 'string') evidence.bracesInputs.push(args[0]); };
require.cache[bracesPath]!.exports = new Proxy(braces, {
  apply(target, thisArg, args) { record(args); return Reflect.apply(target, thisArg, args); },
  get(target, property, receiver) {
    const fn = Reflect.get(target, property, receiver);
    return ['parse', 'compile', 'expand'].includes(String(property)) && typeof fn === 'function'
      ? new Proxy(fn, { apply(target, thisArg, args) { record(args); return Reflect.apply(target, thisArg, args); } }) : fn;
  },
});
process.on('exit', () => {
  const directory = resolve(process.env.WG_QA_DIR ?? 'test-results/v2-release-gates');
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, `dependency-exposure-${process.pid}.json`), JSON.stringify(evidence, null, 2));
});
