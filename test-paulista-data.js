'use strict';
const assert = require('assert');
const data = require('./brazil-2026-data');
const P = require('./paulista-rules');
for (const d of ['A1','A2','A3','A4']) {
  const teams = data.clubs('SP', d); assert.equal(teams.length, 16, `${d} roster count`); assert.equal(P.planSeason(d, teams).status.rosterComplete, true);
}
const expectedA2 = ['Água Santa','Ferroviária','Grêmio Prudente','Internacional de Limeira','Ituano','Juventus','Linense','Monte Azul','Oeste','Santo André','São Bento','São José','Sertãozinho','Taubaté','Votuporanguense','XV de Piracicaba'];
assert.deepEqual(data.clubs('SP','A2'), expectedA2, 'authoritative A2 roster and order');
assert.deepEqual(data.formats.knownStateRules.saoPaulo.divisions.A2.cities, {
  'Água Santa':'Diadema','Ferroviária':'Araraquara','Grêmio Prudente':'Presidente Prudente','Internacional de Limeira':'Limeira','Ituano':'Itu','Juventus':'São Paulo','Linense':'Lins','Monte Azul':'Monte Azul Paulista','Oeste':'Barueri','Santo André':'Santo André','São Bento':'Sorocaba','São José':'São José dos Campos','Sertãozinho':'Sertãozinho','Taubaté':'Taubaté','Votuporanguense':'Votuporanga','XV de Piracicaba':'Piracicaba'
}, 'authoritative A2 club-city mapping');
const bezinha=require('./brazil-2026-bezinha-groups.json');
assert.equal(bezinha.expectedClubs,24);assert.equal(bezinha.status,'complete-user-supplied-roster');
assert.deepEqual(bezinha.groups['1'],['América-SP','Assisense','José Bonifácio','Riopretano','Santa Fé','Tupã']);
assert.deepEqual(bezinha.groups['2'],['Santacruzense','Grêmio Catanduvense','Independente de Limeira','Mogi Mirim','São Carlos','Matonense']);
assert.deepEqual(bezinha.groups['3'],['Flamengo de Guarulhos','Guarulhos','Osasco Audax','Paulínia','Sporting Club Paulinense','Votoraty']);
assert.deepEqual(bezinha.groups['4'],['Manthiqueira','Barcelona Capela','Grêmio Mauaense','Itaquaquecetuba (IAC)','Mauá','União Mogi']);
assert.equal(Object.values(bezinha.groups).flat().length,24);
assert.equal(bezinha.knockout.roundOf16.tie,'aggregate-penalties');
assert.equal(bezinha.knockout.quarterfinals.tie,'unspecified');assert.equal(bezinha.knockout.semifinals.legs,'unspecified');
assert.equal(bezinha.knockout.promotedFinalists,2);assert.equal(bezinha.champion,null);assert.equal(bezinha.runnerUp,null);
console.log('Paulista roster data tests passed');
