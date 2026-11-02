const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('App.js', 'utf8');
const cba = require('./series-cba');
const serieD = require('./serie-d');

assert.match(app, /classificationOpen\[key\]\?'OCULTAR TABELA COMPLETA':'VER CLASSIFICAÇÃO COMPLETA'/);
assert.match(app, /\(info\.summary\.table\|\|\[\]\)\.map\(/);
assert.doesNotMatch(app, /info\.summary\.table\?\.slice\(0,8\)/);
assert.match(app, /Object\.entries\(info\.summary\.groups\|\|\{\}\)\.map\(/);
assert.match(app, /r\.clubId===info\.summary\.clubId/);

const teams = Array.from({length: 20}, (_, i) => `Equipe ${i+1}`);
const league = cba.create({ division: 'Série A', club: 'Equipe 1', teams, season: '2026' });
assert.equal(cba.summarize(league, 'Equipe 1').table.length, 20);
const d = serieD.create({ club: 'Meu Clube', teams: Array.from({length: 120}, (_, i) => `Equipe ${i+1}`), season: '2026' });
const groups = serieD.summarize(d, 'Meu Clube').groups;
assert.equal(Object.keys(groups).length, 8);
for (const table of Object.values(groups)) assert.equal(table.length, 15);
console.log('Full classification UI regression tests passed');
