'use strict';
const assert=require('node:assert/strict');
const Recovery=require('./tournament-recovery');
const SerieD=require('./serie-d'),SeriesCBA=require('./series-cba'),Copas=require('./copas');
const Progression=require('./progression');
const club='Meu Clube';
const factory=(club,state,season)=>({
 serieD:{kind:'serieD',eligible:true,state:SerieD.create({club,teams:[],season})},
 C:{kind:'cba',eligible:false,state:SeriesCBA.create({division:'Série C',club,teams:[],season})},
 B:{kind:'cba',eligible:false,state:SeriesCBA.create({division:'Série B',club,teams:[],season})},
 A:{kind:'cba',eligible:false,state:SeriesCBA.create({division:'Série A',club,teams:[],season})},
 copaBrasil:{kind:'cup',eligible:false,state:Copas.create({type:'copaBrasil',club,teams:[],season})},
 libertadores:{kind:'cup',eligible:false,state:Copas.create({type:'libertadores',club,teams:[],season})},
 sulAmericana:{kind:'cup',eligible:false,state:Copas.create({type:'sulAmericana',club,teams:[],season})},
 estadual:{kind:'cup',eligible:true,state:Copas.create({type:'estadual',club,teams:[],season,stateName:'Paulista'})}
});
const base={club,state:'SP',season:2,division:'Série D',country:'Brasil',tournamentTier:'D',tournamentProgression:Progression.makeProgression('D'),league:{teams:[{name:club,pts:7}],fixtures:[{home:club,away:'Rival',played:true}],round:5},players:[{id:'p1'}],coins:333};
const malformed={...base,tournaments:{serieD:{kind:'serieD',eligible:true,state:{version:1,clubs:[],fixtures:[],groups:[]}},C:{kind:'cba',eligible:false,state:{division:'C'}},B:{kind:'cba',eligible:false,state:{}},A:{kind:'cba',eligible:false,state:{}},copaBrasil:{kind:'cup',eligible:false,state:{schema:'bad'}},libertadores:null,sulAmericana:{kind:'cup',eligible:false,state:{}},estadual:{kind:'cup',eligible:true,state:{}}}};
const result=Recovery.recoverTournamentEntries(malformed,factory);
assert.deepEqual(result.recovered.sort(),['A','B','C','copaBrasil','estadual','libertadores','serieD','sulAmericana'].sort());
assert.equal(result.game.league.teams[0].pts,7);assert.equal(result.game.coins,333);assert.equal(result.game.players[0].id,'p1');
assert.equal(result.game.tournaments.serieD.state.clubs.length,120);
for(const key of ['C','B','A'])assert.equal(result.game.tournaments[key].state.teams.length,20);
for(const key of ['copaBrasil','libertadores','sulAmericana','estadual'])assert.equal(result.game.tournaments[key].state.schema,'futebol-top-cup-v1');
const second=Recovery.recoverTournamentEntries(result.game,factory);assert.deepEqual(second.recovered,[]);assert.equal(second.game.league.teams[0].pts,7);
console.log('Tournament save recovery tests passed; existing league/career progress preserved.');
