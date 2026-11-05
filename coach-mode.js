'use strict';
function ensureManagerState(game, makeMarket) {
  if (!game || !Array.isArray(game.players)) throw new TypeError('Carreira sem elenco válido.');
  const ids = new Set(game.players.map(p => p.id));
  const lineup = Array.isArray(game.lineup) ? game.lineup.filter(id => ids.has(id)).slice(0, 11) : game.players.slice(0, 11).map(p => p.id);
  while (lineup.length < Math.min(11, game.players.length)) {
    const next = game.players.find(p => !lineup.includes(p.id));
    if (!next) break;
    lineup.push(next.id);
  }
  return { ...game, coins: Number.isFinite(game.coins) ? game.coins : 1000, lineup, subsUsed: Number.isInteger(game.subsUsed) && game.subsUsed >= 0 ? game.subsUsed : 0, transferMarket: Array.isArray(game.transferMarket) ? game.transferMarket : makeMarket() };
}
function startMatch(game) { return { ...game, subsUsed: 0 }; }
function swapStarter(game, starterId, reserveId) {
  if (!(game.lineup || []).includes(starterId)) throw new Error('Escolha um titular para sair da escalação.');
  if ((game.lineup || []).includes(reserveId)) throw new Error('O outro jogador também já é titular.');
  if (!(game.players || []).some(p => p.id === reserveId)) throw new Error('Jogador não encontrado no elenco.');
  return { ...game, lineup: game.lineup.map(id => id === starterId ? reserveId : id) };
}
function substitute(game, outId, inId, { matchLive, paused, maxSubs = 5 } = {}) {
  if (!matchLive || !paused) throw new Error('Pause a partida para fazer uma substituição.');
  if ((game.subsUsed || 0) >= maxSubs) throw new Error('Limite de substituições atingido.');
  if (!(game.lineup || []).includes(outId)) throw new Error('O jogador que sai não está entre os titulares.');
  if ((game.lineup || []).includes(inId)) throw new Error('O jogador que entra já está em campo.');
  if (!(game.players || []).some(p => p.id === inId)) throw new Error('Jogador reserva não encontrado.');
  return { ...game, lineup: game.lineup.map(id => id === outId ? inId : id), subsUsed: (game.subsUsed || 0) + 1 };
}
function signPlayer(game, player, { maxPlayers = 30 } = {}) {
  if (!player || typeof player.id !== 'string' || !(game.transferMarket || []).some(p => p.id === player.id)) throw new Error('Jogador não está disponível no mercado.');
  if ((game.players || []).length >= maxPlayers) throw new Error('Limite de 30 jogadores no elenco.');
  if (!Number.isFinite(player.price) || player.price < 0) throw new Error('Valor de contratação inválido.');
  if ((game.coins || 0) < player.price) throw new Error('Saldo insuficiente para essa contratação.');
  const signed = { ...player, id: `signed-${Date.now()}-${player.id}`, energy: 100 };
  return { ...game, coins: game.coins - player.price, players: [...game.players, signed], transferMarket: game.transferMarket.filter(p => p.id !== player.id), history: [{ type: 'contratação', player: `${player.name} ${player.surname}`, price: player.price }, ...(game.history || [])].slice(0, 30) };
}
module.exports = { ensureManagerState, startMatch, swapStarter, substitute, signPlayer };
