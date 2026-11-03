'use strict';
const assert=require('node:assert/strict');
const cup=require('./copa-paulista-2026');
const all=Object.values(cup.GROUPS).flat();
assert.equal(all.length,16);
assert.equal(new Set(all).size,16);
let s=cup.create({club:'Bandeirante',season:'2026'});
assert.equal(s.stage,'groups');
assert.equal(s.currentMatches.length,48);
for(const teams of Object.values(s.groups)) assert.equal(teams.length,4);
for(const [g,rows] of Object.entries(s.groupTable)) assert.equal(Object.keys(rows).length,4);
// Win every user fixture; unrelated fixtures resolve deterministically through the official bracket.
let guard=0;
while(!s.completed && guard++<20){
 const m=cup.getNextMatch(s,s.club);
 assert.ok(m,'team still alive must have its next match');
 assert.equal(m.status,'pending');
 s=cup.playMatch(s,s.club,m.home===s.club?2:0,m.away===s.club?2:0);
}
assert.ok(guard<20,'cup must complete');
assert.equal(s.champion,s.club);
assert.ok(s.runnerUp);
assert.equal(s.allMatches.length,70);
assert.ok(s.allMatches.every(m=>m.status==='played'));
assert.equal(s.allMatches.filter(m=>m.stage==='groups').length,48);
assert.equal(s.allMatches.filter(m=>m.stage==='playin').length,8);
assert.equal(s.allMatches.filter(m=>m.stage==='quarterfinals').length,8);
assert.equal(s.allMatches.filter(m=>m.stage==='semifinals').length,4);
assert.equal(s.allMatches.filter(m=>m.stage==='final').length,2);
const restored=JSON.parse(JSON.stringify(s));
assert.equal(cup.summarize(restored,s.club).champion,s.club);
let choice=cup.chooseStateCup(restored,s.club,'serieD');
assert.equal(choice.qualification.championGets,'serieD');
assert.equal(choice.qualification.runnerUpGets,'copaBrasil');
assert.throws(()=>cup.playMatch(choice,s.club,1,0),/concluída/);
assert.equal(cup.create({club:'Clube criado pelo usuário'}).participating,false);
console.log('Copa Paulista FPF 2026: 16 clubes, 70 jogos, cinco fases, salvamento/restauração e vagas aprovados.');
