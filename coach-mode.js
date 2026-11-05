'use strict';
const ROLE = { GOL: 'GK', ZAG: 'DEF', LAT: 'DEF', MEI: 'MID', ATA: 'FWD' };
const slots = ['GOL','ZAG','ZAG','LAT','LAT','MEI','MEI','MEI','ATA','ATA','ATA'];
function group(player) { return ROLE[player && player.role] || 'MID'; }
function validStartingXI(players, lineup) {
  if (!Array.isArray(lineup) || lineup.length !== 11 || new Set(lineup).size !== 11) return false;
  const chosen = lineup.map(id => players.find(p => p.id === id));
  if (chosen.some(p => !p)) return false;
  const counts = chosen.reduce((a,p) => (a[group(p)] = (a[group(p)]||0)+1, a), {});
  return counts.GK === 1 && counts.DEF === 4 && counts.MID === 3 && counts.FWD === 3;
}
function makeStartingXI(players, previous = []) {
  const used = new Set();
  const result = [];
  const take = role => {
    const preferred = previous.map(id => players.find(p => p.id === id)).find(p => p && !used.has(p.id) && group(p) === group({role}));
    const p = preferred || players.find(p => !used.has(p.id) && group(p) === group({role}));
    if (p) { used.add(p.id); result.push(p.id); }
  };
  for (const role of slots) take(role);
  return validStartingXI(players, result) ? result : null;
}
function hasUsableId(id) { return (typeof id === 'string' && id.length > 0) || (typeof id === 'number' && Number.isFinite(id)); }
function ensureManagerState(game, makeMarket) {
  if (!game || !Array.isArray(game.players)) throw new TypeError('Carreira sem elenco válido.');
  // Preserve the source roster exactly: generated career players use integer IDs;
  // older/market-created saves may use strings. Do not coerce IDs or discard players.
  const seen = new Set();
  const unique = game.players.filter(p => {
    if (!p || !hasUsableId(p.id)) return false;
    const key = `${typeof p.id}:${String(p.id)}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  if (unique.length < 11 || !unique.some(p => group(p) === 'GK') || !unique.some(p => group(p) === 'DEF') || !unique.some(p => group(p) === 'MID') || !unique.some(p => group(p) === 'FWD')) throw new Error('O elenco precisa ter jogadores para uma escalação 4-3-3 completa.');
  const lineup = validStartingXI(unique, game.lineup) ? [...game.lineup] : makeStartingXI(unique, game.lineup || []);
  if (!lineup) throw new Error('Não foi possível montar uma escalação 4-3-3 válida.');
  return { ...game, players: unique, coins: Number.isFinite(game.coins) ? game.coins : 1000, lineup, subsUsed: Number.isInteger(game.subsUsed) && game.subsUsed >= 0 ? Math.min(game.subsUsed,5) : 0, substitutionsOut: Array.isArray(game.substitutionsOut) ? game.substitutionsOut : [], transferMarket: Array.isArray(game.transferMarket) ? game.transferMarket : makeMarket() };
}
function startMatch(game) { return { ...game, subsUsed: 0, substitutionsOut: [] }; }
function swapStarter(game, starterId, reserveId) {
  if (!(game.lineup || []).includes(starterId)) throw new Error('Escolha um titular para sair da escalação.');
  if ((game.lineup || []).includes(reserveId)) throw new Error('O outro jogador também já é titular.');
  const starter = game.players.find(p => p.id === starterId), reserve = game.players.find(p => p.id === reserveId);
  if (!starter || !reserve) throw new Error('Jogador não encontrado no elenco.');
  if (group(starter) !== group(reserve)) throw new Error('Escolha um reserva da mesma posição para manter a formação 4-3-3.');
  const lineup = game.lineup.map(id => id === starterId ? reserveId : id);
  if (!validStartingXI(game.players,lineup)) throw new Error('A alteração não mantém uma escalação válida.');
  return { ...game, lineup };
}
function substitute(game, outId, inId, { matchLive, paused, maxSubs = 5 } = {}) {
  if (!matchLive || !paused) throw new Error('Pause a partida para fazer uma substituição.');
  if ((game.subsUsed || 0) >= maxSubs) throw new Error('Limite de substituições atingido.');
  if (!(game.lineup || []).includes(outId)) throw new Error('O jogador que sai não está entre os titulares.');
  if ((game.lineup || []).includes(inId)) throw new Error('O jogador que entra já está em campo.');
  if ((game.substitutionsOut || []).includes(inId)) throw new Error('Jogador substituído não pode voltar nesta partida.');
  const outgoing = game.players.find(p => p.id === outId), incoming = game.players.find(p => p.id === inId);
  if (!outgoing || !incoming) throw new Error('Jogador não encontrado no elenco.');
  if (group(outgoing) !== group(incoming)) throw new Error('Escolha um reserva da mesma posição para manter a formação 4-3-3.');
  const lineup = game.lineup.map(id => id === outId ? inId : id);
  if (!validStartingXI(game.players,lineup)) throw new Error('A substituição não mantém uma escalação válida.');
  return { ...game, lineup, subsUsed: (game.subsUsed || 0) + 1, substitutionsOut: [...(game.substitutionsOut || []), outId] };
}
function signPlayer(game, player, { maxPlayers = 30 } = {}) {
  if (!player || !hasUsableId(player.id) || !(game.transferMarket || []).some(p => p.id === player.id)) throw new Error('Jogador não está disponível no mercado.');
  if ((game.players || []).length >= maxPlayers) throw new Error('Limite de 30 jogadores no elenco.');
  if (!Number.isFinite(player.price) || player.price < 0) throw new Error('Valor de contratação inválido.');
  if ((game.coins || 0) < player.price) throw new Error('Saldo insuficiente para essa contratação.');
  const signed = { ...player, id: `signed-${Date.now()}-${player.id}`, energy: 100 };
  return { ...game, coins: game.coins - player.price, players: [...game.players, signed], transferMarket: game.transferMarket.filter(p => p.id !== player.id), history: [{ type: 'contratação', player: `${player.name} ${player.surname}`, price: player.price }, ...(game.history || [])].slice(0, 30) };
}
module.exports = { ensureManagerState, startMatch, swapStarter, substitute, signPlayer, validStartingXI, makeStartingXI };
