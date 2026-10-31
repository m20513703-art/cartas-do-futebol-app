'use strict';
const assert = require('node:assert/strict');
const cups = require('./copas');

function playToEnd(initial, score = () => [1, 1]) {
  let state = initial;
  let guard = 0;
  while (!state.completed) {
    assert.ok(++guard <= 6, 'progression should terminate');
    const match = cups.getNextMatch(state, state.club);
    assert.ok(match, 'eligible user match should be exposed');
    const [hg, ag] = score(match, guard);
    state = cups.playMatch(state, state.club, hg, ag);
  }
  return state;
}

// The input array and state remain immutable; a 16-club bracket reaches a winner.
const inputTeams = ['MM FC', ...Array.from({ length: 15 }, (_, i) => `Equipe ${i + 1}`)];
const inputCopy = structuredClone(inputTeams);
let cup = cups.create({ type: 'copaBrasil', club: 'MM FC', teams: inputTeams, season: 2026 });
assert.deepEqual(inputTeams, inputCopy);
assert.equal(cup.rounds[0].matches.length, 8);
assert.equal(cup.teams.length, 16);
assert.equal(cup.teams.filter(t => t.fictional).length, 0);
const first = cups.getNextMatch(cup, 'MM FC');
const untouched = JSON.stringify(cup);
cup = cups.playMatch(cup, 'MM FC', 2, 0);
assert.equal(JSON.stringify(JSON.parse(untouched)), untouched);
assert.equal(first.status, 'pending');
assert.equal(cup.rounds[0].matches.find(m => m.home === 'MM FC' || m.away === 'MM FC').status, 'played');
let ended = cup;
while (!ended.completed) {
  const next = cups.getNextMatch(ended, 'MM FC');
  ended = cups.playMatch(ended, 'MM FC', next.home === 'MM FC' ? 1 : 0, next.away === 'MM FC' ? 1 : 0);
}
const penaltyCup = cups.create({ type: 'copaBrasil', club: 'MM FC', teams: ['MM FC'], season: 2026 });
const penaltyMatch = cups.getNextMatch(penaltyCup, 'MM FC');
const afterPenalty = cups.playMatch(penaltyCup, 'MM FC', 1, 1);
const penaltyResult = afterPenalty.rounds[0].matches.find(m => m.id === penaltyMatch.id);
assert.ok(penaltyResult.penalties);
assert.notEqual(penaltyResult.penalties.home, penaltyResult.penalties.away);
assert.match(penaltyResult.result, /pên\./);
const sum = cups.summarize(ended, 'MM FC');
assert.equal(sum.completed, true);
assert.ok(sum.champion && sum.runnerUp);
assert.equal(sum.userMatches.length, 4);
assert.equal(sum.results.length, 15);
assert.equal(sum.userMatches[0].result, '2–0');
assert.equal(cups.getNextMatch(ended, 'MM FC'), null);
assert.deepEqual(JSON.parse(JSON.stringify(ended)), ended, 'state should survive JSON roundtrip');
assert.throws(() => cups.playMatch(ended, 'MM FC', 1, 0), /terminou/);

// Early user elimination triggers simulation through the final and marks elimination.
let eliminated = cups.create({ type: 'libertadores', club: 'Perdedor FC', teams: ['Perdedor FC'], season: '2026' });
const elimMatch = cups.getNextMatch(eliminated, 'Perdedor FC');
eliminated = cups.playMatch(eliminated, 'Perdedor FC', elimMatch.home === 'Perdedor FC' ? 0 : 5, elimMatch.away === 'Perdedor FC' ? 0 : 5);
assert.equal(eliminated.completed, true);
assert.equal(cups.summarize(eliminated, 'Perdedor FC').eliminated, true);
assert.equal(eliminated.rounds.length, 4);
assert.ok(eliminated.rounds.flatMap(r => r.matches).every(m => m.status === 'played'));
assert.ok(eliminated.teams.some(t => t.fictional), 'auto-added clubs are marked fictitious');

// State tournament has 4 clubs and supports a fresh, independent season.
let estadual = cups.create({ type: 'estadual', club: 'MM FC', teams: ['MM FC', 'Rival A', 'Rival B', 'Rival C'], season: 2026, stateName: 'São Paulo' });
assert.equal(estadual.rounds[0].matches.length, 2);
estadual = playToEnd(estadual, () => [3, 0]);
assert.equal(estadual.completed, true);
assert.ok(estadual.qualification.requiresChampionChoice);
assert.equal(estadual.qualification.championChoice, null);
assert.throws(() => cups.chooseStateCup(estadual, 'Clube errado', 'serieD'), /Somente/);
if (estadual.champion === 'MM FC') {
  estadual = cups.chooseStateCup(estadual, 'MM FC', 'serieD');
  assert.equal(estadual.qualification.championGets, 'serieD');
  assert.equal(estadual.qualification.runnerUpGets, 'copaBrasil');
  assert.throws(() => cups.chooseStateCup(estadual, 'MM FC', 'copaBrasil'), /já foi/);
}
const novoAno = cups.create({ type: 'estadual', club: 'MM FC', teams: ['MM FC', 'Rival A', 'Rival B', 'Rival C'], season: 2027, stateName: 'São Paulo' });
assert.equal(novoAno.season, '2027');
assert.equal(novoAno.completed, false);
assert.equal(novoAno.rounds.length, 1);
assert.equal(novoAno.qualification, null);

// Guardrails and other supported competition sizes.
for (const type of ['copaBrasil', 'libertadores', 'sulAmericana']) {
  const s = cups.create({ type, club: 'MM FC', teams: ['MM FC'], season: 2026 });
  assert.equal(s.teams.length, 16);
  assert.ok(s.teams.filter(t => t.fictional).length >= 15);
}
assert.throws(() => cups.create({ type: 'estadual', club: 'MM FC', teams: [], season: 2026 }), /stateName/);
assert.throws(() => cups.create({ type: 'liga', club: 'MM FC', teams: [], season: 2026 }), /type/);
for (const [type, stateName] of [['copaPaulista', 'Copa Paulista'], ['copaRio', 'Copa Rio de Janeiro (Copa Rio)']]) {
  let namedCup = cups.create({ type, club: 'MM FC', teams: ['MM FC', 'Rival A', 'Rival B', 'Rival C'], season: 2026, stateName });
  namedCup = playToEnd(namedCup, () => [3, 0]);
  assert(namedCup.qualification?.requiresChampionChoice, `${type} records champion/runner-up vacancy choice`);
  if (namedCup.champion === 'MM FC') {
    namedCup = cups.chooseStateCup(namedCup, 'MM FC', 'copaBrasil');
    assert.equal(namedCup.qualification.championGets, 'copaBrasil');
    assert.equal(namedCup.qualification.runnerUpGets, 'serieD');
  }
}
assert.throws(() => cups.playMatch(novoAno, 'MM FC', -1, 0), /inteiros não negativos/);
assert.throws(() => cups.getNextMatch(novoAno, 'Outro FC'), /não corresponde/);
console.log('OK: copas.js — progressão, eliminação, pênaltis, temporadas, resultados, JSON e escolha de vaga.');
