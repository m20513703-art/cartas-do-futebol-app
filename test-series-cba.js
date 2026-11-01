'use strict';
const assert = require('node:assert/strict');
const engine = require('./series-cba');

function mkTeams(prefix) {
  return Array.from({ length: 20 }, (_, i) => `${prefix} Clube ${String(i + 1).padStart(2, '0')}`);
}
function playToEnd(code, prefix) {
  let state = engine.create({ division: code, club: `${prefix} Clube 01`, teams: mkTeams(prefix), season: 'Teste 2026' });
  assert.equal(state.teams.length, 20);
  assert.equal(new Set(state.teams.map(t => t.name.normalize('NFD').toLowerCase())).size, 20);
  assert.equal(state.rounds.length, 38);
  const schedule = new Map(state.teams.map(t => [t.id, []]));
  for (const round of state.rounds) {
    assert.equal(round.length, 10);
    const appearances = new Set();
    for (const f of round) {
      assert(!appearances.has(f.home)); assert(!appearances.has(f.away));
      appearances.add(f.home); appearances.add(f.away);
      schedule.get(f.home).push([f.away, 'home']);
      schedule.get(f.away).push([f.home, 'away']);
    }
    assert.equal(appearances.size, 20);
  }
  for (const [id, fixtures] of schedule) {
    assert.equal(fixtures.length, 38, `${id} must have 38 games`);
    const versus = new Map();
    for (const [opponent, side] of fixtures) {
      if (!versus.has(opponent)) versus.set(opponent, []);
      versus.get(opponent).push(side);
    }
    assert.equal(versus.size, 19);
    for (const sides of versus.values()) assert.deepEqual(sides.slice().sort(), ['away', 'home']);
  }
  const before = JSON.stringify(state);
  const peek = engine.getNextMatch(state);
  assert(peek && peek.stage === 'league');
  assert.equal(JSON.stringify(state), before, 'getNextMatch must not mutate state');
  for (let i = 0; i < 38 && state.stage === 'league'; i++) {
    const match = engine.getNextMatch(state);
    assert(match, `user match missing at league round ${i + 1}`);
    const prior = JSON.stringify(state);
    const next = code === 'C'
      ? engine.playMatch(state, state.clubId, match.home === state.clubId ? 8 : 0, match.away === state.clubId ? 8 : 0)
      : engine.playMatch(state, state.clubId, i % 4, (i + 1) % 4);
    assert.equal(JSON.stringify(state), prior, 'playMatch must not mutate its input');
    assert.notEqual(JSON.stringify(next), prior);
    state = JSON.parse(JSON.stringify(next)); // serializable state roundtrip between every step
  }
  assert(state.stage === (code === 'C' ? 'playoff' : 'complete'));
  if (code === 'C') {
    assert.equal(engine.getNextMatch(state).stage, 'playoff');
    // Pode ocorrer eliminação do clube na primeira eliminatória; o motor deve
    // fechar os jogos restantes e a temporada sem exigir ações após a eliminação.
    for (let i = 0; i < 3 && state.stage === 'playoff'; i++) {
      const match = engine.getNextMatch(state);
      if (!match) break;
      state = engine.playMatch(state, state.clubId, 1, 0);
      state = JSON.parse(JSON.stringify(state));
    }
    assert.equal(state.stage, 'complete');
    const playoffs = state.playoff.rounds;
    assert.deepEqual(playoffs.map(r => r.fixtures.length), [4, 2, 1]);
    assert(playoffs.every(r => r.fixtures.every(f => f.played && f.winner)));
  }
  const summary = engine.summarize(state);
  assert.equal(summary.stage, 'complete');
  assert.equal(summary.finalTable.length, 20);
  assert.equal(JSON.stringify(state), JSON.stringify(JSON.parse(JSON.stringify(state))));
  const ordered = summary.finalTable;
  assert(ordered.every((r, i) => r.position === i + 1));
  assert(ordered.every(r => r.goalDifference === r.goalsFor - r.goalsAgainst));
  assert(ordered.every(r => r.played === 38));
  if (code === 'C') {
    assert.equal(summary.promotedTeams.length, 4);
    assert.equal(new Set(summary.promotedTeams).size, 4);
    assert.equal(summary.relegatedTeams.length, 4);
    assert.deepEqual(summary.relegatedTeams, ordered.slice(-4).map(r => r.team));
    const semifinalists = state.playoff.rounds.find(r => r.label === 'Semifinais').fixtures.flatMap(f => [f.home, f.away]).map(id => state.teams.find(t => t.id === id).name);
    assert.deepEqual(new Set(summary.promotedTeams), new Set(semifinalists));
    assert(summary.playoffChampion);
  } else if (code === 'B') {
    assert.equal(summary.promotedTeams.length, 4);
    assert.deepEqual(summary.promotedTeams, ordered.slice(0, 4).map(r => r.team));
    assert.equal(summary.relegatedTeams.length, 4);
    assert.deepEqual(summary.relegatedTeams, ordered.slice(-4).map(r => r.team));
  } else {
    assert.equal(summary.relegatedTeams.length, 4);
    assert.deepEqual(summary.relegatedTeams, ordered.slice(-4).map(r => r.team));
    assert.equal(summary.libertadores.length, 5);
    assert.deepEqual(summary.libertadores, ordered.slice(0, 5).map(r => r.team));
    assert.equal(summary.sulAmericana.length, 8);
    assert.deepEqual(summary.sulAmericana, ordered.slice(5, 13).map(r => r.team));
  }
  return summary;
}

for (const [code, prefix] of [['C', 'TesteC'], ['B', 'TesteB'], ['A', 'TesteA']]) {
  const summary = playToEnd(code, prefix);
  console.log(`${summary.division}: 20 times, 38 rodadas, classificações e fim de temporada OK`);
}

// Verifica promoções e rebaixamentos efetivos do clube controlado, não apenas listas de posições.
function driveClubOutcome(code, clubName, mode) {
  let state = engine.create({ division: code, club: clubName, teams: mkTeams(`Outcome${code}`), season: `Outcome-${mode}` });
  const winScore = (match) => match.home === state.clubId ? [8, 0] : [0, 8];
  const loseScore = (match) => match.home === state.clubId ? [0, 8] : [8, 0];
  while (state.stage === 'league') {
    const match = engine.getNextMatch(state);
    const [hg, ag] = mode === 'win' ? winScore(match) : loseScore(match);
    state = engine.playMatch(state, state.clubId, hg, ag);
  }
  if (code === 'C' && state.stage === 'playoff') {
    while (state.stage === 'playoff') {
      const match = engine.getNextMatch(state);
      if (!match) throw new Error('O líder promovível deve ter jogo na próxima fase.');
      const [hg, ag] = winScore(match);
      state = engine.playMatch(state, state.clubId, hg, ag);
    }
  }
  return engine.summarize(state).clubOutcome;
}
const winningC = driveClubOutcome('C', 'OutcomeC Clube 01', 'win');
assert.equal(winningC.nextDivision, 'B', 'Série C semifinalista must advance to B');
const winningB = driveClubOutcome('B', 'OutcomeB Clube 01', 'win');
assert.equal(winningB.nextDivision, 'A', 'Série B top club must advance to A');
for (const [code, prefix, next] of [['B', 'OutcomeB', 'C'], ['A', 'OutcomeA', 'B']]) {
  const relegated = driveClubOutcome(code, `${prefix} Clube 20`, 'lose');
  assert.equal(relegated.nextDivision, next, `${code} bottom club must be relegated to ${next}`);
}
console.log('Transições efetivas de promoção/rebaixamento: C→B, B→A, B→C e A→B OK');

// Criação com clube repetido ou entrada duplicada completa 20 clubes sem duplicar nomes.
const dup = engine.create({ division: 'Série B', club: ' Clube Único ', teams: ['Clube Único', 'Clube Único', 'Outro Clube'] });
assert.equal(dup.teams.length, 20);
assert.equal(new Set(dup.teams.map(t => t.name.toLowerCase())).size, 20);
assert(dup.teams.filter(t => t.fictional).length === 0);
assert(!dup.teams.some(t => /fictício/i.test(t.name)));
for (const code of ['A','B','C']) { const s=engine.create({division:code,club:'Meu Clube '+code,teams:[],season:2026}); assert.equal(s.teams.length,20); assert.equal(new Set(s.teams.map(t=>t.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''))).size,20); assert(!s.teams.some(t=>/clube fictício/i.test(t.name))); }
// A Série C não deve expor destinos de promoção/rebaixamento antes da decisão.
let early = engine.create({ division: 'C', club: 'Preliminar', teams: mkTeams('Preliminar') });
const earlySummary = engine.summarize(early);
assert(!('promotedTeams' in earlySummary));
assert(!('relegatedTeams' in earlySummary));
console.log('Validações adicionais: duplicatas, clubes fictícios e sigilo de qualificações OK');

// Clube fora dos oito: concluir automaticamente mata-mata sem travar temporada.
for (const scenario of ['lose']) {
  let s = engine.create({division:'C', club:'Teste Não Classificado', teams:[], season:'Sem playoff'});
  while (s.stage === 'league') {
    const m = engine.getNextMatch(s, s.clubId);
    s = engine.playMatch(s, s.clubId, m.home === s.clubId ? 0 : 8, m.away === s.clubId ? 0 : 8);
  }
  assert.equal(s.stage, 'complete', 'Série C sem o jogador no top 8 deve completar playoff simulado');
  const outcome = engine.summarize(s, s.clubId);
  assert.equal(outcome.clubOutcome.nextDivision, 'D');
  assert.equal(outcome.promotedTeams.length, 4);
  assert.equal(engine.getNextMatch(s, s.clubId), null);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
}
console.log('Série C sem classificação: playoffs simulados, rebaixamento e salvamento OK');
