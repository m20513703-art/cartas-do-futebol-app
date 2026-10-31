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
// A later state-league finish outside top two removes a previous pending state place.
let stateRepeat = P.recordStateLeagueQualification(P.makeProgression('D'), club, 1, 2026).progression;
stateRepeat = P.recordStateLeagueQualification(stateRepeat, club, 3, 2027).progression;
assert(!stateRepeat.rosters.serieD?.includes(club), 'out-of-top-two next season revokes a prior state-league place');
assert(!P.beginNextEdition(JSON.parse(JSON.stringify(stateRepeat))).rosters.serieD?.includes(club));
// A user champion first finishes the final, then chooses a place in the UI.
const pendingChoice = P.awardStateCup(P.makeProgression('D'), club, club, 'Runner FC', null);
assert.equal(pendingChoice.championChoice, null);
assert.equal(pendingChoice.runnerUpGets, null);
assert.equal(pendingChoice.progression.pendingEligibility.copaBrasil, undefined);
assert.equal(pendingChoice.progression.pendingEligibility.serieD, undefined);
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
// The legacy state-league table is the source for two next-edition Série D places.
for (const position of [1, 2]) {
  let stateProgress = P.makeProgression('D');
  const qualification = P.recordStateLeagueQualification(stateProgress, club, position, 2026);
  stateProgress = JSON.parse(JSON.stringify(qualification.progression));
  assert.equal(qualification.qualified, true);
  assert(stateProgress.rosters.serieD.includes(club));
  assert.equal(stateProgress.eligibility.serieD, true, 'current D stays accessible, next state qualification is queued');
  assert.equal(stateProgress.pendingEligibility.serieD, true);
  const following = P.beginNextEdition(JSON.parse(JSON.stringify(stateProgress)));
  assert.equal(following.tier, 'D');
  assert(following.rosters.serieD.includes(club), '1st/2nd state-league finisher enters next D roster');
  assert.equal(following.eligibility.serieD, true);
}
for (const position of [3, 20]) {
  const stateProgress = P.recordStateLeagueQualification(P.makeProgression('D'), club, position, 2026).progression;
  const following = P.beginNextEdition(JSON.parse(JSON.stringify(stateProgress)));
  assert.equal(stateProgress.pendingEligibility.serieD, undefined, 'positions outside top two do not receive state-league D eligibility');
  assert(!following.rosters.serieD?.includes(club), 'non-top-two club is not added as a state-league qualifier');
}
// State-cup award remains distinct and both choices continue to assign the other prize to runner-up.
for (const choice of ['serieD', 'copaBrasil']) {
  const awards = P.awardStateCup(P.makeProgression('D'), club, club, 'Vice', choice);
  const choiceName = choice === 'serieD' ? 'Série D' : 'Copa do Brasil';
  const otherName = choice === 'serieD' ? 'copaBrasil' : 'serieD';
  assert(awards.progression.rosters[choice].includes(club));
  assert(awards.progression.rosters[otherName].includes('Vice'));
  assert.equal(awards.runnerUpGets, otherName);
  const savedAwards = JSON.parse(JSON.stringify(awards.progression));
  const nextEdition = P.beginNextEdition(savedAwards);
  assert.equal(nextEdition.eligibility[choice], true);
  assert(nextEdition.rosters[choice].includes(club));
}
// Copa Paulista and Copa Rio keep separate names and award champion choice + runner-up's other slot.
const Cups = require('./copas');
for (const [type, stateName] of [['copaPaulista', 'Copa Paulista'], ['copaRio', 'Copa Rio de Janeiro (Copa Rio)']]) {
  let stateCup = Cups.create({ type, club, teams: [club, 'Rival A', 'Rival B', 'Rival C'], season: 2027, stateName });
  while (!stateCup.completed) {
    const match = Cups.getNextMatch(stateCup, club);
    stateCup = Cups.playMatch(stateCup, club, match.home === club ? 5 : 0, match.away === club ? 5 : 0);
  }
  assert.equal(stateCup.champion, club, `${type}: user wins cup`);
  stateCup = Cups.chooseStateCup(stateCup, club, 'copaBrasil');
  const cupSummary = Cups.summarize(JSON.parse(JSON.stringify(stateCup)), club);
  const award = P.awardStateCup(P.makeProgression('D'), club, cupSummary.champion, cupSummary.runnerUp, cupSummary.qualification.championChoice);
  assert(award.progression.rosters.copaBrasil.includes(club), `${type}: champion receives Copa do Brasil`);
  assert(award.progression.rosters.serieD.includes(cupSummary.runnerUp), `${type}: runner-up receives Série D`);
  assert.equal(award.progression.pendingEligibility.copaBrasil, true);
  assert.equal(P.beginNextEdition(JSON.parse(JSON.stringify(award.progression))).eligibility.copaBrasil, true, `${type}: winner's qualification survives save and edition rollover`);
}

// Coordinated rollover requires both deliberately separate season tracks and every eligible competition/cup.
const rollCheck = extra => P.rolloverReadiness({
  seasonComplete: true, tournamentSeasonComplete: true,
  tournaments: { serieD: { eligible: true, done: true }, estadual: { eligible: true, done: true }, copaBrasil: { eligible: false } },
  legacyCups: [{ complete: true, champion: 'Rival', choice: null }], club, country: 'Brasil',
  isTournamentFinished: item => item.done, ...extra,
});
assert.equal(rollCheck({}).ready, true);
assert(rollCheck({ seasonComplete: false }).blockers.includes('legacy-season'));
assert(rollCheck({ tournamentSeasonComplete: false }).blockers.includes('national-season'));
assert(rollCheck({ tournaments: { estadual: { eligible: true, done: false } } }).blockers.includes('competition:estadual'));
assert(rollCheck({ legacyCups: [{ complete: false }] }).blockers.includes('legacy-cup:1'));
assert(rollCheck({ legacyCups: [{ complete: true, champion: club, choice: null }] }).blockers.includes('legacy-cup-choice:1'));
const oldCareer = { season: 4, tournamentSeason: 5, seasonComplete: true, stateSeasonComplete: true, tournamentSeasonComplete: true, tournamentResults: { C: { champion: club } }, tournamentArchive: [{ season: 4 }], stateLeagueQualification: { qualified: true } };
const rolled = P.applyCoordinatedRollover(oldCareer, { division: 'Série C', tournamentTier: 'C', league: { teams: [] } });
assert.equal(rolled.season, 6); assert.equal(rolled.tournamentSeason, 6);
assert.deepEqual(rolled.tournamentArchive.at(-1), { season: 5, results: oldCareer.tournamentResults });
assert.deepEqual(rolled.tournamentResults, {});
assert.equal(rolled.seasonComplete, false); assert.equal(rolled.stateSeasonComplete, false); assert.equal(rolled.tournamentSeasonComplete, false);
assert.deepEqual(rolled.stateLeagueQualification, oldCareer.stateLeagueQualification, 'state-league qualification feed survives coordinated rollover');
assert.equal(oldCareer.season, 4, 'rollover does not mutate the prior state');

console.log('Career integration D→C→B→A, Série D state vacancies, Copa Paulista and Copa Rio awards, rollover and JSON persistence passed.');
