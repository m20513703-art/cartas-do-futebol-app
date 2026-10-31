'use strict';

function makeProgression(tier = 'D', rosters = {}) {
  return { tier, rosters: rosters || {}, eligibility: { serieD: tier === 'D', C: tier === 'C', B: tier === 'B', A: tier === 'A', estadual: true, copaBrasil: false, libertadores: false, sulAmericana: false }, pendingTier: null, pendingEligibility: {} };
}
function addClub(roster, club) { return [...new Set([club, ...(roster || []).filter(x => typeof x === 'string' && x.trim() && x.trim().toLowerCase() !== club.trim().toLowerCase())])]; }
function completeLeague(prog, key, summary, club) {
  const next = { ...prog, rosters: { ...(prog.rosters || {}) }, eligibility: { ...(prog.eligibility || {}) }, pendingEligibility: { ...(prog.pendingEligibility || {}) } };
  if (key === 'serieD') {
    const promoted = summary.knockout?.promotions?.map(x => x.club) || [];
    next.rosters.C = promoted;
    next.pendingTier = promoted.includes(club) ? 'C' : 'D';
  } else if (key === 'C') {
    next.rosters.B = summary.promotedTeams || [];
    next.rosters.serieD = [...new Set([...(summary.relegatedTeams || []), ...(next.stateLeagueQualifications || []).filter(x => x.status === 'next-edition').map(x => x.club)])];
    next.pendingTier = summary.clubOutcome?.nextDivision || 'C';
  } else if (key === 'B') {
    next.rosters.A = summary.promotedTeams || [];
    next.rosters.C = summary.relegatedTeams || [];
    next.pendingTier = summary.clubOutcome?.nextDivision || 'B';
  } else if (key === 'A') {
    next.rosters.B = summary.relegatedTeams || [];
    next.pendingTier = summary.clubOutcome?.nextDivision || 'A';
    next.pendingEligibility.libertadores = (summary.libertadores || []).includes(club);
    next.pendingEligibility.sulAmericana = (summary.sulAmericana || []).includes(club);
    next.rosters.libertadores = summary.libertadores || [];
    next.rosters.sulAmericana = summary.sulAmericana || [];
  }
  return next;
}
function recordStateLeagueQualification(prog, club, position, season = null) {
  const next = { ...prog, rosters: { ...(prog.rosters || {}) }, eligibility: { ...(prog.eligibility || {}) }, pendingEligibility: { ...(prog.pendingEligibility || {}) } };
  // Legacy state-league season standings feed the next edition of the separate
  // national-tournament progression. No qualification is granted outside 1st/2nd.
  const qualified = Number.isInteger(position) && position >= 1 && position <= 2;
  const priorQualification = (next.stateLeagueQualifications || []).some(x => x.club === club && x.status === 'next-edition');
  next.stateLeagueQualifications = (next.stateLeagueQualifications || []).filter(x => x.club !== club);
  if (qualified) {
    next.rosters.serieD = addClub(next.rosters.serieD, club);
    next.pendingEligibility.serieD = true;
    next.stateLeagueQualifications.push({ club, position, season, competition: 'estadual', destination: 'Série D', status: 'next-edition' });
  } else if (priorQualification) {
    next.rosters.serieD = (next.rosters.serieD || []).filter(name => name.trim().toLowerCase() !== club.trim().toLowerCase());
    if (!next.rosters.serieD.length) delete next.rosters.serieD;
  }
  return { progression: next, qualified, position, season };
}
function awardStateCup(prog, club, champion, runnerUp, championChoice = null) {
  const next = { ...prog, rosters: { ...(prog.rosters || {}) }, eligibility: { ...(prog.eligibility || {}) }, pendingEligibility: { ...(prog.pendingEligibility || {}) } };
  let choice = championChoice;
  if (champion !== club && !choice) choice = 'serieD';
  if (champion === club && choice) {
    const award = choice === 'serieD' ? 'serieD' : 'copaBrasil';
    next.pendingEligibility[award] = true;
    next.rosters[award] = addClub(next.rosters[award], club);
  }
  if (runnerUp === club) {
    const award = choice === 'serieD' ? 'copaBrasil' : 'serieD';
    next.pendingEligibility[award] = true;
    next.rosters[award] = addClub(next.rosters[award], club);
  }
  return { progression: next, championChoice: choice, runnerUpGets: choice === 'serieD' ? 'copaBrasil' : 'serieD' };
}
function unfinishedCompetitions(tournaments, isFinished) {
  return Object.entries(tournaments || {}).filter(([key, item]) => item?.eligible && !isFinished(item, key)).map(([key]) => key);
}
function beginNextEdition(prog) {
  const tier = prog.pendingTier || prog.tier || 'D';
  const pending = prog.pendingEligibility || {};
  const next = makeProgression(tier, prog.rosters);
  next.eligibility = { ...next.eligibility, ...pending, serieD: tier === 'D' || !!pending.serieD, C: tier === 'C' || !!pending.C, B: tier === 'B' || !!pending.B, A: tier === 'A' || !!pending.A, estadual: true, copaBrasil: !!pending.copaBrasil, libertadores: !!pending.libertadores, sulAmericana: !!pending.sulAmericana };
  next.pendingTier = null;
  next.pendingEligibility = {};
  return next;
}
module.exports = { makeProgression, completeLeague, recordStateLeagueQualification, awardStateCup, beginNextEdition, unfinishedCompetitions };
