'use strict';

// Motor autocontido das Séries A, B e C. O estado retornado é composto apenas
// por dados JSON; todas as operações públicas devolvem novas estruturas.
const DIVISIONS = { C: 'Série C', B: 'Série B', A: 'Série A' };
const FILLER_CLUBS = [
  'Atlético do Litoral (Fictício)', 'União das Montanhas (Fictício)', 'Esporte Clube das Águas (Fictício)',
  'Ferroviário do Cerrado (Fictício)', 'Real Vale Verde (Fictício)', 'Associação Porto Novo (Fictício)',
  'Nacional da Serra (Fictício)', 'Grêmio das Palmeiras (Fictício)', 'Operário do Sol (Fictício)',
  'Estrela do Norte (Fictício)', 'Clube Aurora (Fictício)', 'Desportivo Pioneiro (Fictício)',
  'Esportivo Santa Aurora (Fictício)', 'União Central (Fictício)', 'Independente do Oeste (Fictício)',
  'Atlético Planalto (Fictício)', 'Associação Nova Esperança (Fictício)', 'Esporte Clube Horizonte (Fictício)',
  'Juventude do Sul (Fictício)', 'Real Campo Azul (Fictício)', 'Futebol Clube Primavera (Fictício)',
  'Portuguesa do Interior (Fictício)', 'Racing de Vila Nova (Fictício)', 'São Bento do Mar (Fictício)',
  'Esporte Clube Riacho (Fictício)', 'União do Pampa (Fictício)', 'Acadêmicos do Brasil (Fictício)',
  'Clube Atlético das Flores (Fictício)', 'Esportivo Três Rios (Fictício)', 'Nacional de Pedra (Fictício)'
];
const TEAM_COUNT = 20;

function cleanName(value) {
  const name = typeof value === 'string' ? value : value && (value.name || value.nome || value.club || value.clube);
  if (!name || !String(name).trim()) throw new TypeError('Cada clube precisa ter um nome.');
  return String(name).trim();
}
function keyName(name) { return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function divisionCode(value) {
  const s = String(value || '').toUpperCase().replace(/SÉRIE|SERIE|DIVISÃO|DIVISAO/g, '').trim();
  const code = s.slice(-1);
  if (!DIVISIONS[code]) throw new RangeError('division deve ser Série C, Série B ou Série A.');
  return code;
}
function hash32(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function scoreFor(seed, side) {
  // Determinístico para tornar temporadas repetíveis e o estado independente de Math.random.
  const x = hash32(`${seed}|${side}`);
  return (x >>> 8) % 5;
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }

function normalizeTeams(club, inputTeams, divisionName) {
  const raw = Array.isArray(inputTeams) ? inputTeams : [];
  const values = [club, ...raw];
  const names = [], seen = new Set();
  for (const value of values) {
    let name;
    try { name = cleanName(value); } catch (_) { continue; }
    const k = keyName(name);
    if (!k || seen.has(k)) continue;
    seen.add(k); names.push({ name, fictional: /\(fictício\)$/i.test(name) });
    if (names.length === TEAM_COUNT) break;
  }
  for (const baseName of FILLER_CLUBS) {
    if (names.length === TEAM_COUNT) break;
    // Namespace generated fictional clubs by division so the fallback roster
    // cannot be mistaken for the same teams in A, B, and C.
    const name = `${baseName} · ${divisionName} · fictício`;
    const k = keyName(name);
    if (!seen.has(k)) { seen.add(k); names.push({ name, fictional: true }); }
  }
  if (names.length < TEAM_COUNT) throw new Error('Não foi possível completar os 20 clubes da divisão.');
  return names.map((t, i) => ({ id: `t${String(i + 1).padStart(2, '0')}`, ...t }));
}

function makeLeagueRounds(teamIds) {
  // Método do círculo: uma partida por equipe em cada rodada e mando invertido no returno.
  const base = teamIds.slice();
  const firstLeg = [];
  for (let r = 0; r < base.length - 1; r++) {
    const fixtures = [];
    for (let i = 0; i < base.length / 2; i++) {
      let a = base[i], b = base[base.length - 1 - i];
      if ((r + i) % 2) [a, b] = [b, a];
      fixtures.push({ home: a, away: b, played: false, result: null });
    }
    firstLeg.push(fixtures);
    base.splice(1, 0, base.pop());
  }
  return firstLeg.concat(firstLeg.map(round => round.map(f => ({ home: f.away, away: f.home, played: false, result: null }))));
}
function emptyTable(teams) {
  const out = {};
  for (const t of teams) out[t.id] = { teamId: t.id, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
  return out;
}
function standings(state) {
  return Object.values(state.table).map(row => ({ ...row, team: state.teams.find(t => t.id === row.teamId).name }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || (keyName(a.team) < keyName(b.team) ? -1 : keyName(a.team) > keyName(b.team) ? 1 : a.teamId.localeCompare(b.teamId)))
    .map((r, i) => ({ position: i + 1, ...r }));
}
function updateTable(table, match) {
  const h = table[match.home], a = table[match.away], hg = match.homeGoals, ag = match.awayGoals;
  h.played++; a.played++; h.goalsFor += hg; h.goalsAgainst += ag; a.goalsFor += ag; a.goalsAgainst += hg;
  if (hg > ag) { h.wins++; h.points += 3; a.losses++; }
  else if (hg < ag) { a.wins++; a.points += 3; h.losses++; }
  else { h.draws++; a.draws++; h.points++; a.points++; }
  h.goalDifference = h.goalsFor - h.goalsAgainst; a.goalDifference = a.goalsFor - a.goalsAgainst;
}
function resultFor(state, fixture, roundNo, index, userScore) {
  let homeGoals, awayGoals;
  if (userScore) { homeGoals = userScore.homeGoals; awayGoals = userScore.awayGoals; }
  else {
    const seed = `${state.season}|${state.division}|${roundNo}|${index}|${fixture.home}|${fixture.away}`;
    homeGoals = scoreFor(seed, 'home'); awayGoals = scoreFor(seed, 'away');
  }
  const match = { home: fixture.home, away: fixture.away, homeGoals, awayGoals };
  fixture.played = true; fixture.result = { homeGoals, awayGoals };
  updateTable(state.table, match);
}
function isUserFixture(f, clubId) { return f.home === clubId || f.away === clubId; }
function resolveWinner(fixture, seedLabel) {
  const { homeGoals: hg, awayGoals: ag } = fixture.result;
  if (hg !== ag) return hg > ag ? fixture.home : fixture.away;
  // Empate em mata-mata: decisão por pênaltis, repetível; sem prorrogação.
  const homePens = 3 + hash32(`${seedLabel}|${fixture.home}|pen`) % 3;
  const awayPens = 3 + hash32(`${seedLabel}|${fixture.away}|pen`) % 3;
  return homePens === awayPens ? (keyName(fixture.home) < keyName(fixture.away) ? fixture.home : fixture.away) : (homePens > awayPens ? fixture.home : fixture.away);
}
function startPlayoff(state) {
  const ranked = standings(state).slice(0, 8).map(r => r.teamId);
  state.stage = 'playoff'; state.playoffRound = 1;
  state.playoff = { rounds: [{ number: 1, label: 'Quartas de final', fixtures: [
    { home: ranked[0], away: ranked[7], played: false, result: null, winner: null },
    { home: ranked[1], away: ranked[6], played: false, result: null, winner: null },
    { home: ranked[2], away: ranked[5], played: false, result: null, winner: null },
    { home: ranked[3], away: ranked[4], played: false, result: null, winner: null }
  ] }], champion: null, promoted: [] };
}
function prepareNextPlayoffRound(state) {
  const rounds = state.playoff.rounds, previous = rounds[rounds.length - 1];
  const winners = previous.fixtures.map(f => f.winner);
  if (winners.length === 1) {
    state.playoff.champion = winners[0];
    const semifinals = rounds.find(r => r.label === 'Semifinais');
    state.playoff.promoted = semifinals ? semifinals.fixtures.flatMap(f => [f.home, f.away]) : [];
    state.stage = 'complete'; state.playoffRound = null; return;
  }
  const label = winners.length === 4 ? 'Semifinais' : 'Final';
  const fixtures = [];
  if (winners.length === 4) {
    const ranking = new Map(standings(state).map(r => [r.teamId, r.position]));
    const sorted = winners.slice().sort((a, b) => ranking.get(a) - ranking.get(b));
    fixtures.push({ home: sorted[0], away: sorted[3], played: false, result: null, winner: null });
    fixtures.push({ home: sorted[1], away: sorted[2], played: false, result: null, winner: null });
  } else {
    fixtures.push({ home: winners[0], away: winners[1], played: false, result: null, winner: null });
  }
  rounds.push({ number: rounds.length + 1, label, fixtures });
  state.playoffRound = rounds.length;
}
function simulatePlayoffFixture(state, fixture, round, index, userScore) {
  if (userScore) {
    fixture.played = true; fixture.result = { homeGoals: userScore.homeGoals, awayGoals: userScore.awayGoals };
  } else {
    const seed = `${state.season}|${state.division}|PO${round.number}|${index}|${fixture.home}|${fixture.away}`;
    fixture.played = true; fixture.result = { homeGoals: scoreFor(seed, 'home'), awayGoals: scoreFor(seed, 'away') };
  }
  const label = `${state.season}|${state.division}|PO${round.number}|${index}`;
  const { homeGoals: hg, awayGoals: ag } = fixture.result;
  if (hg === ag) {
    fixture.penalties = {
      home: 3 + hash32(`${label}|${fixture.home}|pen`) % 3,
      away: 3 + hash32(`${label}|${fixture.away}|pen`) % 3
    };
    if (fixture.penalties.home === fixture.penalties.away) {
      // Regra determinística para empate persistente na disputa: vence a equipe
      // mais bem colocada na fase classificatória.
      const ranks = new Map(standings(state).map(r => [r.teamId, r.position]));
      fixture.winner = ranks.get(fixture.home) < ranks.get(fixture.away) ? fixture.home : fixture.away;
    } else fixture.winner = fixture.penalties.home > fixture.penalties.away ? fixture.home : fixture.away;
  } else fixture.winner = hg > ag ? fixture.home : fixture.away;
}
function finishCurrentPlayoffRound(state) {
  const r = state.playoff.rounds[state.playoff.rounds.length - 1];
  if (r.fixtures.every(f => f.played)) prepareNextPlayoffRound(state);
}
function finishPlayoffsIfUserOut(state, clubId) {
  while (state.stage === 'playoff') {
    const round = state.playoff.rounds[state.playoff.rounds.length - 1];
    if (round.fixtures.some(f => !f.played)) break;
    const active = round.fixtures.some(f => f.winner === clubId);
    if (!active) {
      // O restante do mata-mata é concluído automaticamente; nunca bloqueia
      // a campanha do usuário depois da eliminação.
      while (state.stage === 'playoff') {
        const r = state.playoff.rounds[state.playoff.rounds.length - 1];
        for (let i = 0; i < r.fixtures.length; i++) if (!r.fixtures[i].played) simulatePlayoffFixture(state, r.fixtures[i], r, i, null);
        finishCurrentPlayoffRound(state);
      }
      return;
    }
    finishCurrentPlayoffRound(state);
  }
}

function create({ division, club, teams, season } = {}) {
  const code = divisionCode(division), clubName = cleanName(club);
  const normalized = normalizeTeams(clubName, teams, DIVISIONS[code]);
  const clubId = normalized.find(t => keyName(t.name) === keyName(clubName)).id;
  return {
    version: 1, division: code, divisionName: DIVISIONS[code], season: season == null ? 'Temporada 1' : String(season),
    clubId, teams: normalized, stage: 'league', round: 0, rounds: makeLeagueRounds(normalized.map(t => t.id)),
    table: emptyTable(normalized), playoffRound: null, playoff: null
  };
}
function resolveClubId(state, club) {
  if (!state || !Array.isArray(state.teams)) throw new TypeError('Estado de temporada inválido.');
  if (club == null) return state.clubId;
  const id = typeof club === 'string' && state.teams.some(t => t.id === club) ? club : null;
  const name = id ? null : keyName(cleanName(club));
  const team = state.teams.find(t => t.id === id || keyName(t.name) === name);
  if (!team) throw new RangeError(`Clube não encontrado na ${state.divisionName}: ${typeof club === 'string' ? club : cleanName(club)}`);
  return team.id;
}
function getNextMatch(state, club) {
  const id = resolveClubId(state, club);
  if (state.stage === 'league') {
    const round = state.rounds[state.round];
    if (!round) return null;
    const fixture = round.find(f => isUserFixture(f, id) && !f.played);
    return fixture ? { stage: 'league', round: state.round + 1, home: fixture.home, away: fixture.away, homeName: state.teams.find(t => t.id === fixture.home).name, awayName: state.teams.find(t => t.id === fixture.away).name } : null;
  }
  if (state.stage === 'playoff') {
    const r = state.playoff.rounds[state.playoff.rounds.length - 1];
    const f = r.fixtures.find(x => isUserFixture(x, id) && !x.played);
    return f ? { stage: 'playoff', round: r.number, roundName: r.label, home: f.home, away: f.away, homeName: state.teams.find(t => t.id === f.home).name, awayName: state.teams.find(t => t.id === f.away).name, penaltiesOnDraw: true } : null;
  }
  return null;
}
function validateGoals(x, label) {
  if (!Number.isInteger(x) || x < 0 || x > 99) throw new RangeError(`${label} deve ser um inteiro entre 0 e 99.`);
}
function playMatch(inputState, club, homeGoals, awayGoals) {
  validateGoals(homeGoals, 'homeGoals'); validateGoals(awayGoals, 'awayGoals');
  const state = copy(inputState), id = resolveClubId(state, club);
  if (state.stage === 'league') {
    const round = state.rounds[state.round];
    if (!round) throw new Error('A fase de pontos corridos já terminou.');
    const userFixture = round.find(f => isUserFixture(f, id) && !f.played);
    if (!userFixture) throw new Error('O clube não tem partida pendente nesta rodada.');
    for (let i = 0; i < round.length; i++) {
      const f = round[i];
      if (f === userFixture) resultFor(state, f, state.round + 1, i, { homeGoals, awayGoals });
      else resultFor(state, f, state.round + 1, i, null);
    }
    state.round++;
    if (state.round === state.rounds.length) {
      if (state.division === 'C') startPlayoff(state);
      else state.stage = 'complete';
    }
    return state;
  }
  if (state.stage === 'playoff') {
    const r = state.playoff.rounds[state.playoff.rounds.length - 1];
    const f = r.fixtures.find(x => isUserFixture(x, id) && !x.played);
    if (!f) throw new Error('O clube não tem partida pendente no mata-mata.');
    for (let i = 0; i < r.fixtures.length; i++) {
      const current = r.fixtures[i];
      simulatePlayoffFixture(state, current, r, i, current === f ? { homeGoals, awayGoals } : null);
    }
    finishPlayoffsIfUserOut(state, id);
    return state;
  }
  throw new Error('A temporada já terminou.');
}
function summarize(state, club) {
  const id = resolveClubId(state, club), standingsNow = standings(state);
  const summary = {
    division: state.divisionName, season: state.season, club: state.teams.find(t => t.id === id).name,
    stage: state.stage, round: state.stage === 'league' ? state.round + 1 : state.round,
    totalLeagueRounds: state.rounds.length, table: standingsNow
  };
  if (state.stage === 'complete') {
    summary.finalTable = standingsNow;
    if (state.division === 'C') {
      summary.promotedTeams = (state.playoff.promoted || []).map(teamId => state.teams.find(t => t.id === teamId).name);
      summary.relegatedTeams = standingsNow.slice(-4).map(r => r.team);
      summary.playoffChampion = state.teams.find(t => t.id === state.playoff.champion).name;
    } else if (state.division === 'B') {
      summary.promotedTeams = standingsNow.slice(0, 4).map(r => r.team);
      summary.relegatedTeams = standingsNow.slice(-4).map(r => r.team);
    } else {
      summary.relegatedTeams = standingsNow.slice(-4).map(r => r.team);
      summary.libertadores = standingsNow.slice(0, 5).map(r => r.team);
      summary.sulAmericana = standingsNow.slice(5, 13).map(r => r.team);
    }
  } else if (state.stage === 'playoff') {
    summary.playoffRound = state.playoff.rounds[state.playoff.rounds.length - 1].label;
    // Sem classificação final nem destinos esportivos antes de concluir o mata-mata.
  }
  if (state.stage === 'complete') {
    const clubPosition = standingsNow.findIndex(r => r.teamId === id) + 1;
    summary.clubOutcome = { position: clubPosition, nextDivision: null, qualification: null };
    if (state.division === 'C') {
      if ((state.playoff.promoted || []).includes(id)) { summary.clubOutcome.nextDivision = 'B'; summary.clubOutcome.qualification = 'Promovido à Série B'; }
      else if (clubPosition >= 17) { summary.clubOutcome.nextDivision = 'D'; summary.clubOutcome.qualification = 'Rebaixado à Série D'; }
      else summary.clubOutcome.qualification = 'Permanece na Série C';
    } else if (state.division === 'B') {
      if (clubPosition <= 4) { summary.clubOutcome.nextDivision = 'A'; summary.clubOutcome.qualification = 'Promovido à Série A'; }
      else if (clubPosition >= 17) { summary.clubOutcome.nextDivision = 'C'; summary.clubOutcome.qualification = 'Rebaixado à Série C'; }
      else summary.clubOutcome.qualification = 'Permanece na Série B';
    } else {
      if (clubPosition >= 17) { summary.clubOutcome.nextDivision = 'B'; summary.clubOutcome.qualification = 'Rebaixado à Série B'; }
      else if (clubPosition <= 5) summary.clubOutcome.qualification = 'Classificado para a Libertadores';
      else if (clubPosition <= 13) summary.clubOutcome.qualification = 'Classificado para a Sul-Americana';
      else summary.clubOutcome.qualification = 'Permanece na Série A';
    }
  }
  summary.tiebreakRules = ['Pontos (vitória 3, empate 1)', 'Saldo de gols', 'Gols marcados', 'Ordem alfabética do clube (desempate determinístico)'];
  if (state.division === 'C') summary.playoffRules = 'Oito melhores da liga; quartas, semifinais e final em jogo único. Empate vai aos pênaltis; igualdade também na disputa é resolvida pela melhor colocação na liga. Os quatro semifinalistas promovem-se à Série B; quatro últimos da liga rebaixam-se à Série D.';
  return summary;
}

module.exports = { create, getNextMatch, playMatch, summarize };
