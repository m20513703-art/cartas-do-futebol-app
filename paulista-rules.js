'use strict';

// Rules supplied by the user for São Paulo's 2026 state competitions.
// This module contains competition data/mechanics only; it intentionally exports no UI prose.
const DIVISIONS = Object.freeze({
  A1: Object.freeze({ clubs: 16, phase1: 'partial-round-robin', matchesPerClub: 8, qualifiers: 8, quarterfinals: 'single', semifinals: 'single', final: 'two-legs', tie: { quarterfinals: 'penalties', semifinals: 'penalties', final: 'aggregate-penalties' }, relegated: 2, relegationDestination: 'A2' }),
  A2: Object.freeze({ clubs: 16, phase1: 'single-round-robin', qualifiers: 8, quadrangularGroups: Object.freeze({ A: Object.freeze([1, 3, 6, 8]), B: Object.freeze([2, 4, 5, 7]) }), groupsLegs: 2, groupQualifiers: 2, semifinals: 'two-legs', promoted: 2, final: 'single', tie: { semifinals: 'best-campaign', final: 'unspecified' }, relegated: 2, relegationDestination: 'A3' }),
  A3: Object.freeze({ clubs: 16, phase1: 'single-round-robin', qualifiers: 8, quarterfinals: 'two-legs', semifinals: 'two-legs', final: 'two-legs', tie: 'penalties', promoted: 2, relegated: 2, relegationDestination: 'A4' }),
  A4: Object.freeze({ clubs: 16, phase1: 'single-round-robin', qualifiers: 8, quarterfinals: 'two-legs', semifinals: 'two-legs', final: 'two-legs', tie: 'best-campaign', promoted: 2, relegated: 2, relegationDestination: 'Segunda Divisão Sub-23/Bezinha' }),
  BEZINHA: Object.freeze({ clubs: 24, groups: 4, clubsPerGroup: 6, phase1: 'double-round-robin', matchesPerClub: 10, groupQualifiers: 4, roundOf16: 'knockout', roundOf16Tie: 'aggregate-penalties', quarterfinals: 'knockout-unspecified-legs', quarterfinalsTie: 'unspecified', semifinals: 'knockout-unspecified-legs', semifinalsTie: 'unspecified', final: 'championship-final-unspecified-legs', championRule: 'final-winner', promoted: 2, promotionDestination: 'A4', participants: 'federation-registered-approved' })
});

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function validateTeams(teams) {
  if (!Array.isArray(teams) || teams.some(x => typeof x !== 'string' || !x.trim())) throw new TypeError('teams must be a list of non-empty names');
  if (new Set(teams.map(x => x.trim().toLowerCase())).size !== teams.length) throw new Error('Duplicate club in competition participants');
}
function roundRobin(teams, legs = 1) {
  validateTeams(teams);
  const list = teams.slice();
  if (list.length % 2) list.push(null);
  const n = list.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const matches = [];
    for (let i = 0; i < n / 2; i++) {
      const x = list[i], y = list[n - 1 - i];
      if (x && y) matches.push({ home: r % 2 ? y : x, away: r % 2 ? x : y, leg: 1 });
    }
    rounds.push(matches);
    list.splice(1, 0, list.pop());
  }
  if (legs === 2) rounds.push(...rounds.map(ms => ms.map(m => ({ home: m.away, away: m.home, leg: 2 }))));
  return rounds.flatMap((ms, i) => ms.map(m => ({ ...m, round: i + 1, played: false, score: null })));
}
function shuffledPartial(teams, matchesPerClub = 8) {
  validateTeams(teams);
  if (teams.length < 2 || matchesPerClub < 1 || matchesPerClub >= teams.length) throw new RangeError('Invalid partial schedule size');
  // A deterministic round-robin prefix supplies the number of fixtures; no pot
  // assignment is asserted because the participant pot mapping was not supplied.
  return roundRobin(teams).filter(f => f.round <= matchesPerClub);
}
function campaignTable(rows) {
  return rows.slice().sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || a.club.localeCompare(b.club));
}
function a2Groups(topEight) {
  if (!Array.isArray(topEight) || topEight.length !== 8) throw new RangeError('A2 quadrangular requires eight qualifiers');
  return { A: [1, 3, 6, 8].map(p => topEight[p - 1]), B: [2, 4, 5, 7].map(p => topEight[p - 1]) };
}
function aggregateTie(division, stage, aggregateGoals, campaignRankHome, campaignRankAway) {
  if (aggregateGoals.home !== aggregateGoals.away) return aggregateGoals.home > aggregateGoals.away ? 'home' : 'away';
  const d = DIVISIONS[division];
  if (!d) throw new TypeError('Unknown division');
  const rule = division === 'A1' ? (stage === 'final' ? 'aggregate-penalties' : 'penalties') : division === 'A2' ? (stage === 'semifinal' ? 'best-campaign' : 'unspecified') : d.tie;
  if (rule === 'penalties' || rule === 'aggregate-penalties') return 'penalties';
  if (rule === 'best-campaign') {
    if (!Number.isInteger(campaignRankHome) || !Number.isInteger(campaignRankAway) || campaignRankHome === campaignRankAway) return 'unresolved';
    return campaignRankHome < campaignRankAway ? 'home' : 'away';
  }
  return 'unresolved';
}
function outcomes(division, rank, clubCount = 16, stageResult = {}) {
  const d = DIVISIONS[division]; if (!d) throw new TypeError('Unknown division');
  if (!Number.isInteger(rank) || rank < 1 || rank > clubCount) throw new RangeError('Invalid campaign rank');
  const out = { promoted: false, relegated: false, nextDivision: null };
  // Access is decided by knockout outcome, not first-phase table rank.
  const reachedAccessFinal = stageResult.finalist === true;
  const wonPromotionSemi = stageResult.semiFinalWinner === true;
  if (division === 'A1' && rank > clubCount - d.relegated) { out.relegated = true; out.nextDivision = 'A2'; }
  if (division === 'A2') { if (wonPromotionSemi) { out.promoted = true; out.nextDivision = 'A1'; } if (rank > clubCount - d.relegated) { out.relegated = true; out.nextDivision = 'A3'; } }
  if (division === 'A3') { if (reachedAccessFinal) { out.promoted = true; out.nextDivision = 'A2'; } if (rank > clubCount - d.relegated) { out.relegated = true; out.nextDivision = 'A4'; } }
  if (division === 'A4') { if (reachedAccessFinal) { out.promoted = true; out.nextDivision = 'A3'; } if (rank > clubCount - d.relegated) { out.relegated = true; out.nextDivision = 'BEZINHA'; } }
  return out;
}
function qualifiers(division, table) {
  const d = DIVISIONS[division]; if (!d) throw new TypeError('Unknown division');
  const ordered = campaignTable(table);
  if (division === 'A1' || division === 'A3' || division === 'A4') return ordered.slice(0, d.qualifiers);
  if (division === 'A2') return a2Groups(ordered.slice(0, d.qualifiers));
  return [];
}
function resolveA2Group(groupTable) {
  if (!Array.isArray(groupTable) || groupTable.length !== 4) throw new RangeError('A2 quadrangular requires four clubs');
  const ordered = campaignTable(groupTable);
  return { semifinalists: ordered.slice(0, 2), positions: ordered };
}
function playoffPairings(division, qualifiersList) {
  if (division === 'A1') {
    if (!Array.isArray(qualifiersList) || qualifiersList.length !== 8) throw new RangeError('A1 quarterfinals require eight qualifiers');
    return [[0, 7], [1, 6], [2, 5], [3, 4]].map(([a, b]) => [qualifiersList[a], qualifiersList[b]]);
  }
  if (division === 'A2') {
    if (!Array.isArray(qualifiersList) || qualifiersList.A?.length !== 2 || qualifiersList.B?.length !== 2) throw new RangeError('A2 semifinals require the top two from each group');
    return [[qualifiersList.A[0], qualifiersList.B[1]], [qualifiersList.B[0], qualifiersList.A[1]]];
  }
  if (division === 'A3' || division === 'A4') {
    if (!Array.isArray(qualifiersList) || qualifiersList.length !== 8) throw new RangeError('Quarterfinals require eight qualifiers');
    return [[0, 7], [1, 6], [2, 5], [3, 4]].map(([a, b]) => [qualifiersList[a], qualifiersList[b]]);
  }
  throw new TypeError('Unknown division');
}
function resolveTie(division, stage, aggregateGoals, campaigns = {}) {
  const decision = aggregateTie(division, stage, aggregateGoals, campaigns.homeRank, campaigns.awayRank);
  return decision === 'penalties' ? { winner: null, requiresPenalties: true } : { winner: decision === 'home' || decision === 'away' ? decision : null, requiresPenalties: false, unresolved: decision === 'unresolved' };
}
function nextAfterStage(division, stage, winners) {
  if (!Array.isArray(winners)) throw new TypeError('winners must be a list');
  if ((division === 'A1' && stage === 'quarterfinals') || ((division === 'A3' || division === 'A4') && stage === 'quarterfinals')) return { stage: 'semifinals', clubs: winners };
  if (division === 'A1' && stage === 'semifinals') return { stage: 'final', clubs: winners };
  if (division === 'A2' && stage === 'groups') return { stage: 'semifinals', clubs: winners };
  if ((division === 'A2' && stage === 'semifinals') || ((division === 'A3' || division === 'A4') && stage === 'semifinals')) return { stage: 'final', clubs: winners, promoted: division === 'A2' ? winners : undefined };
  if ((division === 'A1' || division === 'A3' || division === 'A4') && stage === 'final') return { stage: 'complete', champion: winners[0], promoted: division === 'A3' || division === 'A4' ? (winners.slice(0, 2)) : undefined };
  if (division === 'A2' && stage === 'final') return { stage: 'complete', champion: winners[0], promoted: undefined };
  throw new TypeError('Unsupported stage transition');
}
function relegateBottomTwo(division, table) {
  if (!['A1', 'A2', 'A3', 'A4'].includes(division)) return [];
  return campaignTable(table).slice(-2);
}

// A4 onward is deliberately represented only as participant governance; its
// annually determined format cannot be simulated until the Technical Council provides it.
function bezaineEdition(approvedClubs, editionRegulations = null) {
  if (!Array.isArray(approvedClubs)) throw new TypeError('approvedClubs must be a list');
  return { clubs: approvedClubs.slice(), participantsApprovedByFederation: true, editionRegulations, playable: !!editionRegulations };
}
function fixturesForStage(division, stage, clubs) {
  const legs = division === 'A1' ? (stage === 'final' ? 2 : 1) : division === 'A2' ? (stage === 'semifinals' ? 2 : 1) : 2;
  return roundRobin(clubs, legs);
}
function resolveA2FinalTie() { return 'unresolved'; }
function resolveBestCampaignTie(rankHome, rankAway) {
  if (!Number.isInteger(rankHome) || !Number.isInteger(rankAway) || rankHome === rankAway) return null;
  return rankHome < rankAway ? 'home' : 'away';
}
function outcomesForPromotion(division, result) {
  if (division === 'A2') return { promoted: !!result.semiFinalWinner, destination: result.semiFinalWinner ? 'A1' : null };
  if (division === 'A3' || division === 'A4') return { promoted: !!result.finalist, destination: result.finalist ? division === 'A3' ? 'A2' : 'A3' : null };
  return { promoted: false, destination: null };
}

module.exports = { DIVISIONS, BEZINHA_GROUPS, BEZINHA_2026, roundRobin, shuffledPartial, campaignTable, a2Groups, aggregateTie, outcomes, planSeason, qualifiers, resolveA2Group, playoffPairings, resolveTie, nextAfterStage, relegateBottomTwo, bezaineEdition, fixturesForStage, resolveA2FinalTie, resolveBestCampaignTie, outcomesForPromotion, bezainePhase1Fixtures, bezaineQualifiers, bezaineRoundOf16, bezaineStageRule };
const BEZINHA_GROUPS = Object.freeze({
  '1': Object.freeze(['América-SP', 'Assisense', 'José Bonifácio', 'Riopretano', 'Santa Fé', 'Tupã']),
  '2': Object.freeze(['Santacruzense', 'Grêmio Catanduvense', 'Independente de Limeira', 'Mogi Mirim', 'São Carlos', 'Matonense']),
  '3': Object.freeze(['Flamengo de Guarulhos', 'Guarulhos', 'Osasco Audax', 'Paulínia', 'Sporting Club Paulinense', 'Votoraty']),
  '4': Object.freeze(['Manthiqueira', 'Barcelona Capela', 'Grêmio Mauaense', 'Itaquaquecetuba (IAC)', 'Mauá', 'União Mogi'])
});
const BEZINHA_2026 = Object.freeze({ season: 2026, groups: BEZINHA_GROUPS });
function bezainePhase1Fixtures(groups = BEZINHA_GROUPS) {
  return Object.fromEntries(Object.entries(groups).map(([group, teams]) => [group, roundRobin(teams, 2)]));
}
function bezaineQualifiers(groupTables) {
  const result = {};
  for (const group of Object.keys(BEZINHA_GROUPS)) {
    const rows = groupTables?.[group];
    if (!Array.isArray(rows) || rows.length !== 6) throw new RangeError(`Bezinha group ${group} requires a six-club table`);
    result[group] = campaignTable(rows).slice(0, 4);
  }
  return result;
}
function bezaineRoundOf16(groupTables) {
  const qualified = bezaineQualifiers(groupTables);
  const names = Object.values(qualified).flat().map(x => typeof x === 'string' ? x : x.club);
  if (names.length !== 16) throw new Error('Bezinha round of 16 requires sixteen qualifiers');
  return { clubs: names, tie: 'aggregate-penalties', fixtures: null };
}
function bezaineStageRule(stage) {
  const rules = { roundOf16: { tie: 'aggregate-penalties' }, quarterfinals: { legs: null, tie: null }, semifinals: { legs: null, tie: null }, final: { legs: null, tie: null, winnerIsChampion: true, finalistsPromoted: 2, promotionDestination: 'A4', promotionSeason: 2027 } };
  if (!rules[stage]) throw new TypeError('Unknown Bezinha stage');
  return { stage, ...rules[stage] };
}
function planSeason(division, teams) {
  const d = DIVISIONS[division]; if (!d) throw new TypeError('Unknown division');
  if (division === 'BEZINHA') return { division, status: { expectedClubs: 24, suppliedClubs: 24, rosterComplete: true }, groups: clone(BEZINHA_GROUPS), fixtures: bezainePhase1Fixtures(), phase1MatchesPerClub: 10, formatCompleteForLaterStages: false };
  validateTeams(teams);
  const status = { expectedClubs: d.clubs, suppliedClubs: teams.length, rosterComplete: teams.length === d.clubs };
  if (division === 'A1') return { division, status, phase: 'phase1', fixtures: shuffledPartial(teams, d.matchesPerClub), potMapping: 'not-supplied', phase1FixturesPerClub: d.matchesPerClub };
  return { division, status, phase: 'phase1', fixtures: roundRobin(teams, 1), phasesAfterLeague: clone(d) };
}
