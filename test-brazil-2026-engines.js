'use strict';
const assert=require('assert');const data=require('./brazil-2026-data');const cba=require('./series-cba');
for(const division of ['Série A','Série B','Série C']){
 const roster=data.nationalClubs[division];assert.equal(roster.length,20);
 const state=cba.create({division,club:roster[0],teams:roster,season:'2026'});
 assert.equal(state.teams.length,20);assert.deepStrictEqual(state.teams.map(t=>t.name),roster);
 assert.equal(state.rounds.length,38);assert(state.rounds.every(r=>r.length===10));
}
const checks=data.validate();assert.deepStrictEqual(checks,[]);console.log('Brazil 2026 engine setup checks passed');
