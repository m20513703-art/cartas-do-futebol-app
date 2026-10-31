'use strict';
const assert = require('node:assert/strict');
const D = require('./serie-d');
const CBA = require('./series-cba');
const P = require('./progression');
const club = 'Clube Jornada';
function playD(state) {
  while (state.phase === 'groups') {
    const m = D.getNextMatch(state, club);
    if (!m) throw new Error('Série D user fixture missing');
    const home = m.homeId === state.playerClubId;
    state = D.playMatch(state, club, home ? 8 : 0, home ? 0 : 8);
    state = JSON.parse(JSON.stringify(state));
  }
  while (!state.knockout.finished) {
    const m = D.getNextMatch(state, club);
    if (!m) throw new Error('Série D knockout user fixture missing');
    const home = m.homeId === state.playerClubId;
    state = D.playMatch(state, club, home ? 8 : 0, home ? 0 : 8);
    state = JSON.parse(JSON.stringify(state));
  }
  return state;
}
function playCBA(div, names, wins) {
  let state = CBA.create({ division: div, club, teams: names, season: `career-${div}` });
  while (state.stage === 'league') {
    const m = CBA.getNextMatch(state, club);
    const home = m.home === state.clubId;
    const [hg, ag] = wins ? (home ? [8,0] : [0,8]) : (home ? [0,8] : [8,0]);
    state = CBA.playMatch(state, club, hg, ag);
    state = JSON.parse(JSON.stringify(state));
  }
  while (state.stage === 'playoff') {
    const m = CBA.getNextMatch(state, club);
    if (!m) throw new Error('Serie C play-off user fixture missing');
    const home = m.home === state.clubId;
    state = CBA.playMatch(state, club, home ? 8 : 0, home ? 0 : 8);
    state = JSON.parse(JSON.stringify(state));
  }
  return state;
}
let p = P.makeProgression('D');
let d = playD(D.create({ club, teams: [club], season: '2026' }));
let ds = D.summarize(d, club);
assert.equal(ds.knockout.finished, true);
p = P.completeLeague(p, 'serieD', ds, club);
assert.equal(p.tier, 'D', 'active tier remains D until season rollover');
assert.equal(p.pendingTier, 'C', 'D promotion queues C for next season');
assert.equal(p.eligibility.C, false, 'C must not unlock midway through the current edition');
let saved = JSON.parse(JSON.stringify({ progression: p, lastD: ds }));
p = saved.progression;
p = P.beginNextEdition(p);
assert.equal(p.tier, 'C');
assert.equal(p.eligibility.C, true);
assert.equal(p.pendingTier, null);
const cTeams = p.rosters.C;
let c = playCBA('C', cTeams, true);
const cs = CBA.summarize(c, club);
assert.equal(cs.stage, 'complete');
p = P.completeLeague(p, 'C', cs, club);
assert.equal(p.tier, 'C');
assert.equal(p.pendingTier, 'B');
assert.equal(p.eligibility.B, false);
p = P.beginNextEdition(p);
assert.equal(p.tier, 'B');
let b = playCBA('B', p.rosters.B, true);
p = P.completeLeague(p, 'B', CBA.summarize(b, club), club);
assert.equal(p.pendingTier, 'A');
p = P.beginNextEdition(p);
assert.equal(p.tier, 'A');
let a = playCBA('A', p.rosters.A, true);
const as = CBA.summarize(a, club);
p = P.completeLeague(p, 'A', as, club);
assert.equal(p.pendingTier, 'A');
assert.equal(p.eligibility.libertadores, false, 'continental slot must remain queued until next season');
assert.equal(p.pendingEligibility.libertadores, true);
p = P.beginNextEdition(p);
assert.equal(p.eligibility.libertadores, true);
assert.equal(p.pendingEligibility.libertadores, undefined);
assert(p.rosters.libertadores.includes(club));
// State cup winner's choice is recorded for the next edition, not enabled in-season.
let cup = P.awardStateCup(p, club, club, 'Runner FC', 'copaBrasil');
assert.equal(cup.progression.eligibility.copaBrasil, false, 'new state-cup qualification must stay pending until next edition')
assert.equal(cup.progression.pendingEligibility.copaBrasil, true);
assert.equal(cup.runnerUpGets, 'serieD');
const cupSaved = JSON.parse(JSON.stringify(cup));
assert.equal(cupSaved.progression.pendingEligibility.copaBrasil, true);
const relegated = P.completeLeague(P.makeProgression('C'), 'C', { promotedTeams: [], relegatedTeams: [club], clubOutcome: { nextDivision: 'D' } }, club);
assert.equal(relegated.pendingTier, 'D', 'relegation queues D for the next season');
assert.equal(relegated.tier, 'C');
assert.equal(P.beginNextEdition(relegated).tier, 'D');
const guard = P.unfinishedCompetitions({ C: { eligible: true }, copaBrasil: { eligible: false }, estadual: { eligible: true } }, item => item.done === true);
assert.deepEqual(guard, ['C', 'estadual'], 'only unfinished competitions eligible in current season block rollover');
const choicePending = P.unfinishedCompetitions({ estadual: { eligible: true, done: true, waitingChoice: true } }, item => item.done && !item.waitingChoice);
assert.deepEqual(choicePending, ['estadual'], 'unresolved champion choice blocks season rollover');
console.log('Career integration journey D→C→B→A, pending promotion/relegation, annual qualification rollover and JSON persistence passed.');
