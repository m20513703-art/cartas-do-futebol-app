'use strict';
const assert = require('node:assert/strict');
const pools = require('./club-pools');
assert.equal(Object.keys(pools.STATE_CLUBS).length, 27);
for (const [uf, names] of Object.entries(pools.STATE_CLUBS)) {
  assert(names.length >= 8, `${uf} needs enough named clubs for a roster`);
  assert.equal(new Set(names.map(x => pools.unique([x])[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''))).size, names.length, `${uf} has duplicate names`);
  assert(!names.some(x => /clube fictício|clube ficticio/i.test(x)), `${uf} has generic placeholder`);
}
assert(pools.brazilNational().length >= 120, 'Brazilian pools must contain enough unique names for Série D');
assert.equal(Object.keys(pools.INTERNATIONAL).length, 20);
for (const [country, names] of Object.entries(pools.INTERNATIONAL)) {
  assert(names.length >= 8, `${country} needs enough club names`);
  const norm = names.map(x => x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''));
  assert.equal(new Set(norm).size, names.length, `${country} has duplicate names`);
  assert(!names.some(x => /clube fictício|clube ficticio/i.test(x)), `${country} has generic placeholder`);
}
console.log('OK: 27 state pools + 20 country pools are populated and duplicate-free.');
