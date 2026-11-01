'use strict';
const assert = require('node:assert/strict');
const { create, getNextMatch, playMatch, summarize } = require('./serie-d');

const supplied = Array.from({ length: 24 }, (_, i) => `Clube Cadastrado ${String(i + 1).padStart(2, '0')}`);
let state = create({ club: 'Meu Clube', teams: supplied, season: 2026 });
assert.equal(state.clubs.length, 120);
assert.equal(new Set(state.clubs.map(c => c.name.toLocaleLowerCase('pt-BR'))).size, 120);
assert.equal(state.groups.length, 8);
assert.deepEqual(state.groups.map(g => g.teamIds.length), Array(8).fill(15));
assert.equal(state.fixtures.length, 840);
assert.equal(state.byes.length, 120);
assert.ok(state.clubs.some(c => c.name === 'Palmeiras' || c.name === 'Flamengo'), 'real club pool fills generated opponents');
assert.ok(!state.clubs.some(c => /clube fictício/i.test(c.name)), 'no generic fictitious opponents');
assert.equal(state.clubs.find(c => c.name === 'Clube Cadastrado 01').fictional, false);

// Verify every group is a single round robin: 15 rounds, 7 matches/round, each pair once.
for (const group of state.groups) {
  const fixtures = state.fixtures.filter(f => f.group === group.id);
  assert.equal(fixtures.length, 105);
  const pairs = new Set();
  for (const f of fixtures) {
    const pair = [f.homeId, f.awayId].sort().join('|');
    assert.ok(!pairs.has(pair), `duplicate fixture pair in group ${group.id}`);
    pairs.add(pair);
  }
  assert.equal(pairs.size, 105);
  for (let round = 1; round <= 15; round++) {
    assert.equal(fixtures.filter(f => f.round === round).length, 7);
    assert.equal(state.byes.filter(b => b.group === group.id && b.round === round).length, 1);
  }
}
for (const club of state.clubs) {
  const played = state.fixtures.filter(f => f.group && (f.homeId === club.id || f.awayId === club.id));
  assert.equal(played.length, 14);
}

assert.throws(() => create({ club: '', teams: [], season: 2026 }), /club/);
assert.throws(() => create({ club: 'X', teams: [], season: null }), /season/);
assert.throws(() => getNextMatch(state, 'Not my club'), /player club/);
assert.throws(() => playMatch(state, 'Meu Clube', -1, 0), /homeGoals/);
assert.throws(() => playMatch(state, 'Meu Clube', 0, 1.5), /awayGoals/);
const before = JSON.stringify(state);
const first = getNextMatch(state, 'Meu Clube');
assert.ok(first && first.status === 'pending');
assert.equal(JSON.stringify(state), before, 'getNextMatch does not mutate input');

// Play a full group campaign, deliberately making the player group winner.
let playerGroupMatches = 0;
while (state.phase === 'groups') {
  const match = getNextMatch(state, 'Meu Clube');
  assert.ok(match, 'player has a playable match while in the group phase');
  const isHome = match.homeId === state.playerClubId;
  const inputCopy = JSON.stringify(state);
  const next = playMatch(state, 'Meu Clube', isHome ? 3 : 0, isHome ? 0 : 3);
  assert.equal(JSON.stringify(state), inputCopy, 'playMatch does not mutate input');
  assert.notEqual(next, state);
  playerGroupMatches++;
  state = JSON.parse(JSON.stringify(next)); // serializable round-trip after every turn
}
assert.equal(playerGroupMatches, 14);
let report = summarize(state, 'Meu Clube');
assert.equal(report.groupMatchesScheduled, 840);
assert.equal(report.groupMatchesCompleted, 840);
for (const group of state.groups) {
  const table = report.groups[group.id];
  assert.equal(table.length, 15);
  assert.ok(table.every(row => row.played === 14));
  for (let i = 1; i < table.length; i++) {
    const p = table[i - 1], q = table[i];
    assert.ok(p.points > q.points || p.points === q.points && (p.gd > q.gd || p.gd === q.gd &&
      (p.gf > q.gf || p.gf === q.gf && (p.wins > q.wins || p.wins === q.wins && p.club.localeCompare(q.club, 'pt-BR') <= 0))));
  }
}
assert.equal(report.groups.A[0].clubId, state.playerClubId);
assert.equal(state.knockout.stages[0].matches.length, 8);
assert.equal(state.knockout.qualifiers.A.length, 2);

// Explicit tie in a user-played knockout match must record the penalty decision.
const tiedMatch = getNextMatch(state, 'Meu Clube');
const tiedState = playMatch(state, 'Meu Clube', 1, 1);
const tiedRecord = tiedState.knockout.stages[0].matches.find(f => f.id === tiedMatch.id);
assert.equal(tiedRecord.decision, 'penalties');
assert.ok(tiedRecord.penalties.home !== tiedRecord.penalties.away);
assert.equal(tiedRecord.winnerId, tiedRecord.penalties.home > tiedRecord.penalties.away ? tiedRecord.homeId : tiedRecord.awayId);

// Lose the first knockout tie. The engine must finish every remaining tie and identify all four promoted semifinalists.
const eliminationMatch = getNextMatch(state, 'Meu Clube');
assert.ok(eliminationMatch);
const eliminationNext = playMatch(state, 'Meu Clube', eliminationMatch.homeId === state.playerClubId ? 0 : 5,
  eliminationMatch.awayId === state.playerClubId ? 0 : 5);
state = JSON.parse(JSON.stringify(eliminationNext));
report = summarize(state, 'Meu Clube');
assert.equal(report.knockout.finished, true);
assert.ok(report.knockout.champion);
assert.equal(report.knockout.promotions.length, 4);
assert.equal(new Set(report.knockout.promotions.map(x => x.clubId)).size, 4);
assert.ok(report.knockout.promotions.every(x => x.promotedTo === 'Série C'));
assert.equal(report.knockout.stages.length, 4);
assert.deepEqual(report.knockout.stages.map(s => s.matches.length), [8, 4, 2, 1]);
assert.ok(report.knockout.stages.flatMap(s => s.matches).every(f => f.status !== 'pending'));
assert.equal(report.knockout.stages.flatMap(s => s.matches).length, 15);
for (const f of report.knockout.stages.flatMap(s => s.matches)) {
  assert.ok(f.winnerId === f.homeId || f.winnerId === f.awayId, 'all knockout fixtures have a declared winner');
  if (f.homeGoals === f.awayGoals) {
    assert.equal(f.decision, 'penalties');
    assert.ok(f.penalties && f.penalties.home !== f.penalties.away, 'draw resolved and recorded by penalties');
    assert.equal(f.winnerId, f.penalties.home > f.penalties.away ? f.homeId : f.awayId);
  } else assert.equal(f.decision, 'goals');
}
assert.equal(getNextMatch(state, 'Meu Clube'), null);
assert.equal(JSON.stringify(JSON.parse(JSON.stringify(state))), JSON.stringify(state));

// Separate winning career confirms the player can play every knockout round through the title.
let winner = create({ club: 'Clube Campeão', teams: supplied, season: 'season-winning-path' });
let playedKnockouts = 0;
while (winner.phase === 'groups') {
  const m = getNextMatch(winner, 'Clube Campeão');
  winner = playMatch(winner, 'Clube Campeão', m.homeId === winner.playerClubId ? 20 : 0,
    m.awayId === winner.playerClubId ? 20 : 0);
}
while (!winner.knockout.finished) {
  const m = getNextMatch(winner, 'Clube Campeão');
  assert.ok(m, 'qualified player has a playable match in every knockout stage');
  winner = playMatch(winner, 'Clube Campeão', m.homeId === winner.playerClubId ? 20 : 0,
    m.awayId === winner.playerClubId ? 20 : 0);
  playedKnockouts++;
  winner = JSON.parse(JSON.stringify(winner));
}
assert.equal(playedKnockouts, 4);
assert.equal(summarize(winner, 'Clube Campeão').knockout.championId, winner.playerClubId);
console.log('Série D tests passed: 120 clubs, groups/fixtures/byes, full player campaigns (elimination and title), knockout outcomes/promotions and JSON round-trips.');
