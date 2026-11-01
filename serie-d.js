'use strict';

// Independent, JSON-serializable Série D season engine. No UI or persistence side effects.
const VERSION = 1;
const GROUPS = 'ABCDEFGH'.split('');
const TEAM_COUNT = 120;
const CLUB_POOLS = require('./club-pools');

function assert(condition, message) { if (!condition) throw new TypeError(message); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function cleanName(value, label) {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} must be a non-empty string`);
  return value.trim();
}
function normalizeTeams(club, teams) {
  assert(Array.isArray(teams), 'teams must be an array');
  const names = [club];
  const seen = new Set([club.toLocaleLowerCase('pt-BR')]);
  for (const value of teams) {
    let name;
    if (typeof value === 'string') name = cleanName(value, 'team name');
    else {
      assert(value && typeof value === 'object' && !Array.isArray(value), 'each team must be a name or an object with a name');
      name = cleanName(value.name, 'team.name');
    }
    const key = name.toLocaleLowerCase('pt-BR');
    if (!seen.has(key)) { names.push(name); seen.add(key); }
    if (names.length === TEAM_COUNT) break;
  }
  const candidates = CLUB_POOLS.brazilNational();
  for (const name of candidates) {
    if (names.length >= TEAM_COUNT) break;
    const key = name.toLocaleLowerCase('pt-BR');
    if (!seen.has(key)) { names.push(name); seen.add(key); }
  }
  let safety = 1;
  while (names.length < TEAM_COUNT) {
    const name = `Associação Atlética ${String(safety++).padStart(3, '0')}`;
    const key = name.toLocaleLowerCase('pt-BR');
    if (!seen.has(key)) { names.push(name); seen.add(key); }
  }
  return names.map((name, index) => ({ id: `club-${String(index + 1).padStart(3, '0')}`, name,
    fictional: index > 0 && !teams.some(t => (typeof t === 'string' ? t : t && t.name) === name) }));
}
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function simulatedScore(seed, fixtureId) {
  const h = hash(`${seed}|${fixtureId}`);
  // Deterministic modest football scores, independent of runtime randomness.
  return [h % 5, Math.floor(h / 17) % 5];
}
function tieBreak(seed, fixtureId) {
  let home = 3 + hash(`${seed}|${fixtureId}|home-pens`) % 3;
  let away = 3 + hash(`${seed}|${fixtureId}|away-pens`) % 3;
  if (home === away) {
    // Sudden-death decision is explicit and stable; the recorded score reflects the decider.
    if (hash(`${seed}|${fixtureId}|sudden-death`) % 2) home++;
    else away++;
  }
  return { home, away };
}
function makeFixture(id, stage, round, group, homeId, awayId) {
  return { id, stage, round, group, homeId, awayId, homeGoals: null, awayGoals: null,
    status: 'pending', winnerId: null, decision: null, penalties: null };
}
function scheduleGroups(state) {
  state.fixtures = [];
  state.byes = [];
  for (const group of state.groups) {
    const rotation = group.teamIds.concat([null]); // 16 slots gives each team one bye in 15 rounds.
    for (let r = 1; r <= 15; r++) {
      for (let i = 0; i < 8; i++) {
        const a = rotation[i], b = rotation[15 - i];
        if (a === null || b === null) {
          state.byes.push({ group: group.id, round: r, clubId: a || b,
            clubName: state.clubs.find(c => c.id === (a || b)).name });
          continue;
        }
        // Alternate home advantage deterministically.
        const homeId = r % 2 ? a : b, awayId = r % 2 ? b : a;
        state.fixtures.push(makeFixture(`G${group.id}-R${String(r).padStart(2, '0')}-${i + 1}`, 'group', r, group.id, homeId, awayId));
      }
      const last = rotation.pop(); rotation.splice(1, 0, last);
    }
  }
}
function scoreFixture(state, fixture, homeGoals, awayGoals, userPlayed) {
  fixture.homeGoals = homeGoals; fixture.awayGoals = awayGoals;
  fixture.status = userPlayed ? 'played' : 'simulated';
  if (fixture.stage !== 'group') {
    if (homeGoals === awayGoals) {
      const pens = tieBreak(state.season, fixture.id);
      fixture.penalties = { home: pens.home, away: pens.away };
      fixture.winnerId = pens.home > pens.away ? fixture.homeId : fixture.awayId;
      fixture.decision = 'penalties';
    } else {
      fixture.winnerId = homeGoals > awayGoals ? fixture.homeId : fixture.awayId;
      fixture.decision = 'goals';
    }
  }
}
function groupTable(state, groupId) {
  const members = state.groups.find(g => g.id === groupId).teamIds;
  const table = new Map(members.map(id => [id, { clubId: id, club: state.clubs.find(c => c.id === id).name,
    played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 }]));
  for (const f of state.fixtures) {
    if (f.stage !== 'group' || f.group !== groupId || f.status === 'pending') continue;
    const h = table.get(f.homeId), a = table.get(f.awayId);
    h.played++; a.played++; h.gf += f.homeGoals; h.ga += f.awayGoals; a.gf += f.awayGoals; a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { h.wins++; h.points += 3; a.losses++; }
    else if (f.homeGoals < f.awayGoals) { a.wins++; a.points += 3; h.losses++; }
    else { h.draws++; a.draws++; h.points++; a.points++; }
  }
  for (const row of table.values()) row.gd = row.gf - row.ga;
  return [...table.values()].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.wins - a.wins || a.club.localeCompare(b.club, 'pt-BR') || a.clubId.localeCompare(b.clubId));
}
function userHasFixture(state, round) {
  return state.fixtures.some(f => f.stage === 'group' && f.round === round && (f.homeId === state.playerClubId || f.awayId === state.playerClubId));
}
function simulateGroupRound(state, round) {
  for (const f of state.fixtures) if (f.stage === 'group' && f.round === round && f.status === 'pending') {
    const [h, a] = simulatedScore(state.season, f.id); scoreFixture(state, f, h, a, false);
  }
}
function makeKnockoutStage(state, name, winners, stageIndex) {
  const matches = [];
  for (let i = 0; i < winners.length; i += 2) {
    matches.push(makeFixture(`K${stageIndex}-${String(i / 2 + 1).padStart(2, '0')}`, name, stageIndex, null, winners[i], winners[i + 1]));
  }
  state.knockout.stages.push({ name, matches });
}
function initializeKnockout(state) {
  const qualifiers = Object.fromEntries(GROUPS.map(g => [g, groupTable(state, g).slice(0, 2).map(r => r.clubId)]));
  state.knockout = { stages: [], stageIndex: 0, qualifiers, promotions: [], championId: null, finished: false };
  const entrants = [];
  for (let i = 0; i < 8; i++) {
    entrants.push(qualifiers[GROUPS[i]][0], qualifiers[GROUPS[(i + 1) % 8]][1]);
  }
  makeKnockoutStage(state, 'Oitavas de final', entrants, 1);
  state.phase = 'knockout';
  if (!entrants.includes(state.playerClubId)) simulateRemainingKnockout(state);
}
function nextStageName(name) {
  return name === 'Oitavas de final' ? 'Quartas de final' : name === 'Quartas de final' ? 'Semifinal' : name === 'Semifinal' ? 'Final' : null;
}
function advanceKnockout(state) {
  const stage = state.knockout.stages[state.knockout.stageIndex];
  if (!stage || stage.matches.some(f => f.status === 'pending')) return;
  if (stage.name === 'Final') {
    state.knockout.championId = stage.matches[0].winnerId;
    state.knockout.finished = true;
    return;
  }
  const winners = stage.matches.map(f => f.winnerId);
  const name = nextStageName(stage.name);
  const stageIndex = state.knockout.stages.length + 1;
  makeKnockoutStage(state, name, winners, stageIndex);
  state.knockout.stageIndex++;
  if (name === 'Semifinal') {
    const semifinal = state.knockout.stages[state.knockout.stageIndex];
    const ids = [...new Set(semifinal.matches.flatMap(f => [f.homeId, f.awayId]))];
    state.knockout.promotions = ids.map(clubId => ({ clubId, club: state.clubs.find(c => c.id === clubId).name, promotedTo: 'Série C' }));
  }
}
function simulatePendingKnockoutStage(state) {
  const stage = state.knockout.stages[state.knockout.stageIndex];
  if (!stage) return;
  for (const f of stage.matches) if (f.status === 'pending') {
    const [h, a] = simulatedScore(state.season, f.id); scoreFixture(state, f, h, a, false);
  }
  advanceKnockout(state);
}
function simulateRemainingKnockout(state) {
  while (!state.knockout.finished) simulatePendingKnockoutStage(state);
}
function finishGroupsIfReady(state) {
  if (state.phase !== 'groups' || state.currentRound <= 15) return;
  initializeKnockout(state);
}
function advancePastUserByes(state) {
  while (state.phase === 'groups' && state.currentRound <= 15 && !userHasFixture(state, state.currentRound)) {
    simulateGroupRound(state, state.currentRound);
    state.currentRound++;
  }
  finishGroupsIfReady(state);
}
function validateState(state) {
  assert(state && typeof state === 'object' && state.version === VERSION && Array.isArray(state.clubs) && Array.isArray(state.fixtures), 'invalid Série D state');
}
function create({ club, teams, season }) {
  assert(arguments[0] && typeof arguments[0] === 'object', 'create expects an options object');
  club = cleanName(club, 'club');
  assert((typeof season === 'string' && season.trim()) || (typeof season === 'number' && Number.isFinite(season)), 'season must be a non-empty string or finite number');
  const clubs = normalizeTeams(club, teams);
  const state = { version: VERSION, season: String(season), playerClubId: clubs[0].id, clubs,
    groups: GROUPS.map((id, index) => ({ id, teamIds: clubs.slice(index * 15, index * 15 + 15).map(c => c.id) })),
    fixtures: [], byes: [], currentRound: 1, phase: 'groups', knockout: null };
  scheduleGroups(state);
  advancePastUserByes(state);
  return state;
}
function getNextMatch(state, club) {
  validateState(state); club = cleanName(club, 'club');
  assert(state.clubs.some(c => c.id === state.playerClubId && c.name === club), 'club must match the player club in this state');
  if (state.phase === 'groups') return clone(state.fixtures.find(f => f.stage === 'group' && f.round === state.currentRound && (f.homeId === state.playerClubId || f.awayId === state.playerClubId) && f.status === 'pending') || null);
  if (state.phase === 'knockout' && !state.knockout.finished) {
    const stage = state.knockout.stages[state.knockout.stageIndex];
    return clone(stage.matches.find(f => f.status === 'pending' && (f.homeId === state.playerClubId || f.awayId === state.playerClubId)) || null);
  }
  return null;
}
function playMatch(input, club, homeGoals, awayGoals) {
  validateState(input); club = cleanName(club, 'club');
  assert(input.clubs.some(c => c.id === input.playerClubId && c.name === club), 'club must match the player club in this state');
  assert(Number.isInteger(homeGoals) && homeGoals >= 0 && homeGoals <= 20, 'homeGoals must be an integer from 0 to 20');
  assert(Number.isInteger(awayGoals) && awayGoals >= 0 && awayGoals <= 20, 'awayGoals must be an integer from 0 to 20');
  const state = clone(input), fixture = getNextMatch(state, club);
  assert(fixture, 'there is no playable match for this club');
  const stored = state.fixtures.find(f => f.id === fixture.id) || state.knockout.stages[state.knockout.stageIndex].matches.find(f => f.id === fixture.id);
  scoreFixture(state, stored, homeGoals, awayGoals, true);
  if (state.phase === 'groups') {
    const round = state.currentRound;
    simulateGroupRound(state, round);
    state.currentRound++;
    advancePastUserByes(state);
  } else {
    const stage = state.knockout.stages[state.knockout.stageIndex];
    for (const f of stage.matches) if (f.status === 'pending') {
      const [h, a] = simulatedScore(state.season, f.id); scoreFixture(state, f, h, a, false);
    }
    const playerWon = stored.winnerId === state.playerClubId;
    advanceKnockout(state);
    if (!playerWon && !state.knockout.finished) simulateRemainingKnockout(state);
  }
  return state;
}
function summarize(state, club) {
  validateState(state); club = cleanName(club, 'club');
  assert(state.clubs.some(c => c.id === state.playerClubId && c.name === club), 'club must match the player club in this state');
  const groups = Object.fromEntries(GROUPS.map(g => [g, groupTable(state, g)]));
  const allKnockout = state.knockout ? state.knockout.stages : [];
  const playerClub = state.clubs.find(c => c.id === state.playerClubId);
  return {
    season: state.season, club: playerClub.name, clubId: playerClub.id, phase: state.phase,
    clubs: state.clubs.length, groups: groups,
    groupMatchesScheduled: state.fixtures.length,
    groupMatchesCompleted: state.fixtures.filter(f => f.status !== 'pending').length,
    groupFixtures: clone(state.fixtures), byes: clone(state.byes),
    knockout: state.knockout ? { stages: clone(allKnockout), qualifiers: clone(state.knockout.qualifiers),
      promotions: clone(state.knockout.promotions), championId: state.knockout.championId,
      champion: state.knockout.championId ? state.clubs.find(c => c.id === state.knockout.championId).name : null,
      finished: state.knockout.finished } : null,
    nextMatch: getNextMatch(state, club)
  };
}
module.exports = { create, getNextMatch, playMatch, summarize };
