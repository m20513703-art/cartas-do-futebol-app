'use strict';
function normalizeKey(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(); }
function buildLeagueTeams(clubName, listedTeams = []) {
  if (typeof clubName !== 'string' || !clubName.trim()) throw new TypeError('clubName must be a non-empty string');
  if (!Array.isArray(listedTeams)) throw new TypeError('listedTeams must be an array');
  const club = clubName.trim(), key = normalizeKey(club);
  // Preserve every supplied participant; exclude only a duplicate of the user's club.
  return [club, ...listedTeams.filter(name => typeof name === 'string' && normalizeKey(name) !== key)];
}
function buildCustomClubCareer(name, city, listedTeams = []) {
  const club = typeof name === 'string' ? name.trim() : '';
  if (!club) throw new TypeError('name must be a non-empty string');
  if (typeof city !== 'string') throw new TypeError('city must be a string');
  return { club, city: city.trim(), leagueTeams: buildLeagueTeams(club, listedTeams) };
}
module.exports = { buildLeagueTeams, buildCustomClubCareer };
