const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const c = vm.createContext({console});
for (const file of ['lib/numeric-1.2.6.js', 'js/params.js', 'js/transforms.js']) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.startsWith('js/')) {
    assert(text.startsWith('"use strict";'));
    assert(text.includes('Generated browser output:'));
  }
  vm.runInContext(text, c, {filename: file});
}

// Initialization explicitly owns globals, regardless of the call receiver.
const receiver = {};
c.init_params.call(receiver);
assert(!Object.hasOwn(receiver, 'shape_params'));
assert.equal(c.shape_params.dimensions, 5);
assert.equal(c.n, 5);
assert.equal(c.cached_coeff.length, 32);
assert(c.cached_coeff.every(value => value === 0));

// Transform traversal must neither create nor overwrite a global loop counter.
vm.runInContext('transforms=[plain_transform()]; base_orientation=numeric.identity(n+1);', c);
assert(!Object.hasOwn(c, 'i'));
c.compute_full_transform();
assert(!Object.hasOwn(c, 'i'));
c.i = 927;
c.compute_full_transform();
assert.equal(c.i, 927);

// Type annotations do not replace runtime validation of unknown data.
const t = c.plain_transform();
t.axis1 = 4;
const before = JSON.stringify(t);
const result = c.normalized_transform_stack([t], 3, false)[0];
assert.equal(result.axis1, 2);
assert.equal(result.s.length, 3);
assert.equal(JSON.stringify(t), before);
assert.notEqual(result.s, t.s);
for (const bad of [null, {}, [null], [{...t, type: 0}], [{...t, axis1: '0'}], [{...t, s: [0,1,1,1,1]}]]) {
  assert.throws(() => c.normalized_transform_stack(bad, 5, true));
}
for (const bad of ['30', null, false, NaN, Infinity]) assert.throws(() => c.require_resolution(bad));
