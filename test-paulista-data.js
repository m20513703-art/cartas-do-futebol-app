'use strict';
const assert=require('assert');
const data=require('./brazil-2026-data');
const P=require('./paulista-rules');
for(const d of ['A1','A2','A3','A4']){
 const teams=data.clubs('SP',d);
 assert.equal(teams.length,16,`${d} roster count`);
 assert.equal(P.planSeason(d,teams).status.rosterComplete,true);
}
const expectedA2=['Água Santa','Ferroviária','Grêmio Prudente','Internacional de Limeira','Ituano','Juventus','Linense','Monte Azul','Oeste','Santo André','São Bento','São José','Sertãozinho','Taubaté','Votuporanguense','XV de Piracicaba'];
assert.deepEqual(data.clubs('SP','A2'),expectedA2,'authoritative A2 roster and order');
const bz=require('./brazil-2026-bezinha-groups.json');
assert.equal(bz.expectedClubs,24);
assert.equal(bz.status,'complete-user-supplied-roster');
assert.deepEqual(bz.groups['1'],['América-SP','Assisense','José Bonifácio','Riopretano','Santa Fé','Tupã']);
assert.deepEqual(bz.groups['2'],['Santacruzense','Grêmio Catanduvense','Independente de Limeira','Mogi Mirim','São Carlos','Matonense']);
assert.deepEqual(bz.groups['3'],['Flamengo de Guarulhos','Guarulhos','Osasco Audax','Paulínia','Sporting Club Paulinense','Votoraty']);
assert.deepEqual(bz.groups['4'],['Manthiqueira','Barcelona Capela','Grêmio Mauaense','Itaquaquecetuba (IAC)','Mauá','União Mogi']);
assert.equal(Object.values(bz.groups).flat().length,24);
assert.equal(bz.knockout.roundOf16.tie,'aggregate-penalties');
assert.equal(bz.knockout.quarterfinals.tie,'unspecified');
assert.equal(bz.knockout.semifinals.legs,'unspecified');
assert.equal(bz.knockout.promotedFinalists,2);
assert.equal(bz.champion,null);
assert.equal(bz.runnerUp,null);
console.log('Paulista roster data tests passed');
