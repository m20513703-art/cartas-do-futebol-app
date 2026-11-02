'use strict';
const assert = require('assert');
const P = require('./paulista-rules');
const clubs = Array.from({length:16}, (_,i)=>`Clube ${i+1}`);
const table = clubs.map((club,i)=>({club,points:48-i,goalsFor:40-i,goalsAgainst:10+i}));
for (const d of ['A1','A2','A3','A4']) {
  const plan=P.planSeason(d,clubs); assert.equal(plan.status.rosterComplete,true);
  if(d==='A1') { assert.equal(plan.fixtures.filter(x=>x.home==='Clube 1'||x.away==='Clube 1').length,8); assert.equal(plan.potMapping,'not-supplied'); }
  else { assert.equal(plan.fixtures.length,120); for(const n of clubs) assert.equal(plan.fixtures.filter(x=>x.home===n||x.away===n).length,15); }
}
const g=P.a2Groups(clubs.slice(0,8)); assert.deepEqual(g.A,['Clube 1','Clube 3','Clube 6','Clube 8']); assert.deepEqual(g.B,['Clube 2','Clube 4','Clube 5','Clube 7']); assert.equal(P.roundRobin(g.A,2).length,12);
assert.equal(P.qualifiers('A1',table).length,8); assert.equal(P.playoffPairings('A1',P.qualifiers('A1',table)).length,4);
assert.equal(P.resolveTie('A1','quarterfinals',{home:1,away:1}).requiresPenalties,true); assert.equal(P.resolveTie('A1','final',{home:1,away:1}).requiresPenalties,true);
assert.equal(P.resolveTie('A2','semifinal',{home:1,away:1},{homeRank:2,awayRank:3}).winner,'home'); assert.equal(P.resolveA2FinalTie(),'unresolved');
assert.equal(P.resolveTie('A3','final',{home:2,away:2}).requiresPenalties,true); assert.equal(P.resolveTie('A4','final',{home:2,away:2},{homeRank:2,awayRank:5}).winner,'home');
assert.equal(P.outcomes('A1',16).nextDivision,'A2'); assert.equal(P.outcomes('A2',5,16,{semiFinalWinner:true}).nextDivision,'A1'); assert.equal(P.outcomes('A3',9,16,{finalist:true}).nextDivision,'A2'); assert.equal(P.outcomes('A4',9,16,{finalist:true}).nextDivision,'A3'); assert.equal(P.outcomes('A4',16).nextDivision,'BEZINHA');
assert.equal(P.nextAfterStage('A1','quarterfinals',['a','b','c','d']).stage,'semifinals'); assert.equal(P.nextAfterStage('A1','semifinals',['a','b']).stage,'final'); assert.equal(P.nextAfterStage('A3','final',['champion','runner']).promoted.length,2);
const b=P.planSeason('BEZINHA',[]); assert.equal(b.fixtures['1'].length,30); assert.equal(b.fixtures['1'].filter(x=>x.home==='América-SP'||x.away==='América-SP').length,10); const mockTables=Object.fromEntries(Object.keys(P.BEZINHA_GROUPS).map(g=>[g,P.BEZINHA_GROUPS[g].map((club,i)=>({club,points:6-i,goalsFor:10-i,goalsAgainst:i}))])); assert.equal(P.bezaineQualifiers(mockTables)['1'].length,4);
assert.equal(P.bezaineStageRule('roundOf16').tie,'aggregate-penalties'); assert.equal(P.bezaineStageRule('quarterfinals').legs,null); assert.equal(P.bezaineStageRule('semifinals').tie,null); assert.equal(P.bezaineStageRule('final').finalistsPromoted,2);
console.log('Paulista rules tests passed');
