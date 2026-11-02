const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('App.js', 'utf8');
const cba = require('./series-cba');
const serieD = require('./serie-d');
const cups = require('./copas');
const CareerClub = require('./career-club');

assert.match(app, /tab==='Classificação'&&<>/);
assert.match(app, /game\.tournaments\|\|\{\}\)\.filter/);
assert.match(app, /\(info\.summary\.table\|\|\[\]\)\.map\(/);
assert.doesNotMatch(app, /info\.summary\.table\?\.slice\(0,8\)/);
assert.match(app, /Object\.entries\(info\.summary\.groups\|\|\{\}\)\.map\(/);
assert.match(app, /item\.state\.rounds\|\|\[\]\)\.map\(round/);
assert.match(app, /Nome do seu clube/);
assert.match(app, /city:customCareer\.city/);
assert.doesNotMatch(app, /REGRAS DE CARREIRA \(SIMPLIFICADAS\)|TEMPORADA BRASILEIRA 2026|Outras competições/);

const listed = ['Capital', 'Gama', 'Meu Clube'];
const created = CareerClub.buildCustomClubCareer('  Águia FC ', '  Brasília  ', listed);
assert.equal(created.club, 'Águia FC');
assert.equal(created.city, 'Brasília');
assert.deepEqual(created.leagueTeams, ['Águia FC', 'Capital', 'Gama']);
assert.deepEqual(listed, ['Capital', 'Gama', 'Meu Clube']); // shared list is untouched
assert.throws(() => CareerClub.buildCustomClubCareer('  ', 'Brasília', listed));

const teams = Array.from({length: 20}, (_, i) => `Equipe ${i+1}`);
const league = cba.create({ division: 'Série A', club: 'Equipe 1', teams, season: '2026' });
assert.equal(cba.summarize(league, 'Equipe 1').table.length, 20);
const d = serieD.create({ club: 'Meu Clube', teams: Array.from({length: 120}, (_, i) => `Equipe ${i+1}`), season: '2026' });
const groups = serieD.summarize(d, 'Meu Clube').groups;
assert.equal(Object.keys(groups).length, 8);
for (const table of Object.values(groups)) assert.equal(table.length, 15);
const cup = cups.create({type:'libertadores',club:'Meu Clube',teams:['Rival 1','Rival 2','Rival 3'],season:'2026'});
assert.ok(cup.rounds.length > 0);
console.log('Classification and custom club regression tests passed');
