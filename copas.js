'use strict';

const CLUB_POOLS = require('./club-pools');
const FORMATS = Object.freeze({ estadual: 4, copaPaulista: 4, copaRio: 4, copaBrasil: 16, libertadores: 16, sulAmericana: 16 });
const STATE_CUP_TYPES = Object.freeze(['estadual', 'copaPaulista', 'copaRio']);
const TYPES = Object.keys(FORMATS);
const CHOICES = Object.freeze(['serieD', 'copaBrasil']);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function teamName(team) {
  if (typeof team === 'string') return team.trim();
  if (team && typeof team.name === 'string') return team.name.trim();
  throw new TypeError('Cada clube deve ser texto ou objeto com name.');
}
function validateClub(club) {
  if (typeof club !== 'string' || !club.trim()) throw new TypeError('club deve ser um nome não vazio.');
  return club.trim();
}
function assertState(state, club) {
  if (!state || state.schema !== 'futebol-top-cup-v1' || !FORMATS[state.type]) throw new TypeError('Estado de copa inválido.');
  if (validateClub(club) !== state.club) throw new Error('O clube informado não corresponde a este estado.');
}
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function decide(match, homeGoals, awayGoals, userPlayed) {
  const m = { ...match, homeGoals, awayGoals, status: 'played', penalties: null, winner: null };
  if (homeGoals !== awayGoals) {
    m.winner = homeGoals > awayGoals ? m.home : m.away;
    m.result = `${homeGoals}–${awayGoals}`;
    return m;
  }
  const seed = hash(`${match.id}|${match.home}|${match.away}|${userPlayed ? 'user' : 'sim'}`);
  let homePens = 3 + (seed % 3), awayPens = 3 + ((seed >>> 4) % 3);
  if (homePens === awayPens) awayPens = (awayPens + 1) % 6;
  m.winner = homePens > awayPens ? m.home : m.away;
  m.penalties = { home: homePens, away: awayPens, winner: m.winner };
  m.result = `${homeGoals}–${awayGoals} (${homePens}–${awayPens} pên.)`;
  return m;
}
function simulatedScore(match) {
  const n = hash(`${match.id}|${match.home}|${match.away}|sim-score`);
  const home = n % 4, away = (n >>> 5) % 4;
  return [home, away];
}
function roundLabel(count) {
  return count === 2 ? 'Final' : count === 4 ? 'Semifinal' : count === 8 ? 'Quartas de final' : count === 16 ? 'Oitavas de final' : 'Rodada';
}
function addRound(state, advancing) {
  const roundNumber = state.rounds.length + 1;
  const matches = [];
  for (let i = 0; i < advancing.length; i += 2) {
    const home = advancing[i], away = advancing[i + 1];
    matches.push({ id: `${state.season}-${state.type}-R${roundNumber}-M${matches.length + 1}`, round: roundNumber, label: roundLabel(advancing.length), home, away, status: 'pending', homeGoals: null, awayGoals: null, penalties: null, winner: null, result: null });
  }
  state.rounds.push({ number: roundNumber, label: roundLabel(advancing.length), matches });
  const current = state.rounds[state.rounds.length - 1];
  for (let i = 0; i < current.matches.length; i++) {
    const match = current.matches[i];
    if (match.home !== state.club && match.away !== state.club) {
      const [hg, ag] = simulatedScore(match);
      current.matches[i] = decide(match, hg, ag, false);
    }
  }
  advanceIfReady(state);
}
function simulateRemaining(state) {
  while (!state.completed) {
    const round = state.rounds[state.rounds.length - 1];
    if (!round) break;
    for (let i = 0; i < round.matches.length; i++) {
      const m = round.matches[i];
      if (m.status === 'pending') {
        const [hg, ag] = simulatedScore(m);
        round.matches[i] = decide(m, hg, ag, false);
      }
    }
    advanceIfReady(state);
  }
}
function advanceIfReady(state) {
  const round = state.rounds[state.rounds.length - 1];
  if (!round || round.matches.some(m => m.status !== 'played')) return;
  const winners = round.matches.map(m => m.winner);
  if (winners.length === 1) {
    state.completed = true;
    state.champion = winners[0];
    state.runnerUp = round.matches[0].home === winners[0] ? round.matches[0].away : round.matches[0].home;
    if (STATE_CUP_TYPES.includes(state.type)) {
      state.qualification = { champion: state.champion, runnerUp: state.runnerUp, championChoice: null, championGets: null, runnerUpGets: null, availableChoices: [...CHOICES], requiresChampionChoice: true };
    }
    return;
  }
  addRound(state, winners);
}

function create({ type, club, teams = [], season, stateName } = {}) {
  if (!FORMATS[type]) throw new TypeError(`type deve ser um destes: ${TYPES.join(', ')}.`);
  club = validateClub(club);
  if (!Array.isArray(teams)) throw new TypeError('teams deve ser um array.');
  if (season === undefined || season === null || String(season).trim() === '') throw new TypeError('season é obrigatório.');
  if (STATE_CUP_TYPES.includes(type) && (typeof stateName !== 'string' || !stateName.trim())) throw new TypeError('stateName é obrigatório para estadual.');
  let names = teams.map(teamName);
  if (names.some(n => !n)) throw new TypeError('Nome de clube vazio em teams.');
  if (!names.includes(club)) names.unshift(club);
  const keys = names.map(n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  if (new Set(keys).size !== keys.length) throw new TypeError('teams não pode conter clubes duplicados.');
  const size = FORMATS[type];
  if (names.length > size) throw new RangeError(`${type} aceita ${size} clubes neste formato simplificado.`);
  const candidatePool = CLUB_POOLS.brazilNational();
  const seen = new Set(names.map(n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')));
  for (const name of candidatePool) {
    if (names.length >= size) break;
    const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) { names.push(name); seen.add(key); }
  }
  // Fall back only if future edits remove too much curated data.
  let safety = 1;
  while (names.length < size) {
    const name = `Associação Atlética ${String(safety++).padStart(3, '0')}`;
    const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) { names.push(name); seen.add(key); }
  }
  const state = {
    schema: 'futebol-top-cup-v1', type, club, season: String(season), stateName: type === 'estadual' ? stateName.trim() : null,
    format: { kind: 'mata-mata simples', teams: size, notice: 'Formato demonstrativo simplificado; participantes simulados não são dados oficiais.' },
    dataNotice: 'Nomes de clubes podem ser reais, mas participantes e resultados são demonstrativos e não constituem listas oficiais atuais.',
    teams: names.map(name => ({ name, fictional: false })), rounds: [], completed: false,
    champion: null, runnerUp: null, qualification: null
  };
  addRound(state, names);
  return state;
}
function getNextMatch(state, club) {
  assertState(state, club);
  if (state.completed) return null;
  for (const round of state.rounds) {
    const match = round.matches.find(m => m.status === 'pending' && (m.home === state.club || m.away === state.club));
    if (match) return clone(match);
  }
  return null;
}
function playMatch(state, club, homeGoals, awayGoals) {
  assertState(state, club);
  if (!Number.isInteger(homeGoals) || homeGoals < 0 || !Number.isInteger(awayGoals) || awayGoals < 0) throw new TypeError('Gols devem ser inteiros não negativos.');
  if (state.completed) throw new Error('A copa já terminou.');
  const next = clone(state);
  let target = null;
  for (const round of next.rounds) {
    const i = round.matches.findIndex(m => m.status === 'pending' && (m.home === next.club || m.away === next.club));
    if (i >= 0) { target = { round, index: i, match: round.matches[i] }; break; }
  }
  if (!target) throw new Error('Não há jogo pendente do clube informado.');
  target.round.matches[target.index] = decide(target.match, homeGoals, awayGoals, true);
  advanceIfReady(next);
  if (target.match.home !== next.club && target.match.away !== next.club) throw new Error('Estado inconsistente: jogo não pertence ao clube.');
  if (target.round.matches[target.index].winner !== next.club) simulateRemaining(next);
  return next;
}
function chooseStateCup(state, championClub, choice) {
  if (!state || state.schema !== 'futebol-top-cup-v1' || !STATE_CUP_TYPES.includes(state.type)) throw new TypeError('A escolha de vaga só se aplica a uma copa estadual configurada.');
  if (!state.completed || !state.qualification) throw new Error('O estadual ainda não terminou.');
  if (championClub !== state.champion || championClub !== state.club) throw new Error('Somente o clube usuário campeão pode registrar sua escolha.');
  if (!CHOICES.includes(choice)) throw new TypeError(`choice deve ser ${CHOICES.join(' ou ')}.`);
  if (state.qualification.championChoice) throw new Error('A escolha do campeão já foi registrada.');
  const next = clone(state);
  next.qualification.championChoice = choice;
  next.qualification.championGets = choice;
  next.qualification.runnerUpGets = CHOICES.find(x => x !== choice);
  next.qualification.requiresChampionChoice = false;
  return next;
}
function summarize(state, club) {
  assertState(state, club);
  const played = state.rounds.flatMap(r => r.matches).filter(m => m.status === 'played');
  const userMatches = played.filter(m => m.home === state.club || m.away === state.club);
  return {
    type: state.type, club: state.club, season: state.season, stateName: state.stateName,
    format: state.format, completed: state.completed, champion: state.champion, runnerUp: state.runnerUp,
    eliminated: userMatches.some(m => m.winner !== state.club), userMatches: clone(userMatches),
    results: played.map(m => ({ round: m.round, label: m.label, home: m.home, away: m.away, homeGoals: m.homeGoals, awayGoals: m.awayGoals, penalties: m.penalties, winner: m.winner, result: m.result })),
    qualification: state.qualification ? clone(state.qualification) : null,
    dataNotice: state.dataNotice
  };
}

module.exports = { create, getNextMatch, playMatch, summarize, chooseStateCup, TYPES, FORMAT_SIZES: FORMATS };
