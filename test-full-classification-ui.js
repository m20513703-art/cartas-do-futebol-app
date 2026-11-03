const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('App.js', 'utf8');
const cba = require('./series-cba');
const serieD = require('./serie-d');
const cups = require('./copas');
const CareerClub = require('./career-club');
const Brazil2026 = require('./brazil-2026-data');

// Current league table is separate from competition-specific tables/brackets.
assert.match(app, /tab==='Classificação'&&/);
assert.match(app, /game\.league\.teams\.map\(\(r,i\)=>/);
assert.match(app, /Object\.entries\(game\.tournaments\|\|\{\}\)\.filter/);
assert.match(app, /item\.kind==='cba'&&<>[\s\S]*?info\.summary\.table\|\|\[\]/);
assert.match(app, /Fase de grupos · classificação por grupos da própria Série D/);
assert.match(app, /classificationOpen\[key\]&&Object\.entries\(info\.summary\.groups\|\|\{\}\)\.map/);
assert.match(app, /classificationOpen\[key\]&&\(item\.state\.rounds\|\|\[\]\)\.map\(round=>/);
assert.doesNotMatch(app, /item\.kind==='cup'[\s\S]{0,300}?info\.summary\.table/);
assert.match(app, /VER CLASSIFICAÇÃO COMPLETA/);
assert.match(app, /VER CHAVE E RESULTADOS/);
assert.match(app, /classificationOpen\[key\]\?/);
assert.match(app, /Nome do seu clube/);
assert.doesNotMatch(app, /REGRAS DE CARREIRA \(SIMPLIFICADAS\)|TEMPORADA BRASILEIRA 2026|Outras competições/);

// Creation uses all supplied state participants; Brasil's makeTeams is not truncated to eight.
assert.match(app, /return ClubPools\.unique\(ordered\)\.slice\(0,country==='Brasil'\?ordered\.length:8\)/);
assert.match(app, /let teams=makeTeams\('Brasil',state,div\)/);
assert.match(app, /const leagueNames=customCareer\.leagueTeams;const league=\{name:div,division:div,teams:seasonTable\(leagueNames\),fixtures:createFixtures\(leagueNames\),round:1\}/);

// Verify every supplied division's actual roster, and that creating the club adds only that club.
let checkedDivisions = 0;
for (const [uf, divisions] of Object.entries(Brazil2026.stateClubs)) {
  for (const [division, supplied] of Object.entries(divisions)) {
    const before = JSON.stringify(supplied);
    const custom = `New Test Club ${uf} ${division}`;
    const created = CareerClub.buildCustomClubCareer(custom, 'Cidade', supplied);
    assert.equal(created.leagueTeams[0], custom);
    assert.equal(created.leagueTeams.length, supplied.length + 1, `${uf}/${division}: no truncation or replacement`);
    for (const team of supplied) assert.ok(created.leagueTeams.includes(team), `${uf}/${division}: preserve ${team}`);
    assert.equal(JSON.stringify(supplied), before, `${uf}/${division}: preserve source list`);
    checkedDivisions++;
  }
}
assert.equal(checkedDivisions, 55, 'exercise all supplied state divisions');

// A custom club is inserted without replacing or mutating the supplied opponent list.
const listed = ['Capital', 'Gama', 'Meu Clube'];
const created = CareerClub.buildCustomClubCareer('  Águia FC ', '  Brasília  ', listed);
assert.equal(created.club, 'Águia FC');
assert.equal(created.city, 'Brasília');
assert.ok(created.leagueTeams.includes(created.club));
for (const team of listed) assert.ok(created.leagueTeams.includes(team), `preserve supplied participant: ${team}`);
assert.equal(created.leagueTeams.filter(team => team === created.club).length, 1);
assert.deepEqual(listed, ['Capital', 'Gama', 'Meu Clube']);
assert.throws(() => CareerClub.buildCustomClubCareer('  ', 'Brasília', listed));

// Lowest populated state division is data-driven; unavailable state data remains unavailable.
for (const uf of ['SP', 'RJ', 'MG', 'AC']) {
  const populated = Object.entries(Brazil2026.stateClubs[uf] || {}).filter(([, teams]) => Array.isArray(teams) && teams.length > 0);
  assert.ok(populated.length > 0, `${uf} fixture has populated divisions`);
  const lowest = populated.at(-1);
  assert.ok(lowest[1].length > 0, `${uf} lowest populated division has known participants`);
  assert.equal(Brazil2026.divisions(uf).at(-1), lowest[0], `${uf} lists lowest division last`);
}
assert.deepEqual(Brazil2026.divisions('ZZ'), [], 'unknown UF must not fabricate divisions');
assert.deepEqual(Brazil2026.clubs('ZZ', 'unknown'), [], 'unknown division must not fabricate participants');

const teams = Array.from({length: 20}, (_, i) => `Equipe ${i+1}`);
const league = cba.create({ division: 'Série A', club: 'Equipe 1', teams, season: '2026' });
assert.equal(cba.summarize(league, 'Equipe 1').table.length, 20);
const d = serieD.create({ club: 'Meu Clube', teams: Array.from({length: 120}, (_, i) => `Equipe ${i+1}`), season: '2026' });
const groups = serieD.summarize(d, 'Meu Clube').groups;
assert.equal(Object.keys(groups).length, 8);
for (const table of Object.values(groups)) assert.equal(table.length, 15);
const cup = cups.create({type:'libertadores',club:'Meu Clube',teams:['Rival 1','Rival 2','Rival 3'],season:'2026'});
assert.ok(cup.rounds.length > 0);
console.log(`Classification UI, state data and full-roster tests passed (${checkedDivisions} divisions).`);
