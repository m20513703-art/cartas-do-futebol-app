'use strict';
const SerieD=require('./serie-d');
const SeriesCBA=require('./series-cba');
const Copas=require('./copas');
function usable(item,key,club){
 if(!item||typeof item!=='object'||!item.state)return false;
 const state=item.state;
 try {
  if(key==='serieD')return item.kind==='serieD'&&state.version===1&&Array.isArray(state.clubs)&&state.clubs.length===120&&Array.isArray(state.fixtures)&&Array.isArray(state.groups)&&state.groups.length===8&&['groups','knockout'].includes(state.phase)&&!!SerieD.summarize(state,club);
  if(['C','B','A'].includes(key))return item.kind==='cba'&&state.version===1&&state.division===key&&state.divisionName===`Série ${key}`&&Array.isArray(state.teams)&&state.teams.length===20&&Array.isArray(state.rounds)&&state.rounds.length>0&&state.table&&['league','playoff','complete'].includes(state.stage)&&!!SeriesCBA.summarize(state,club);
  const expected={copaBrasil:'copaBrasil',libertadores:'libertadores',sulAmericana:'sulAmericana'}[key];
  const cupOk=key==='estadual'?['estadual','copaPaulista','copaRio'].includes(state.type):state.type===expected;
  return item.kind==='cup'&&state.schema==='futebol-top-cup-v1'&&cupOk&&Array.isArray(state.rounds)&&state.rounds.length>0&&Array.isArray(state.rounds[state.rounds.length-1].matches)&&!!Copas.summarize(state,club);
 } catch (_) { return false; }
}
function recoverTournamentEntries(game,factory){
 const repaired={...game};
 const fresh=factory(game.club,game.state||'SP',game.season||1,game.division||game.stage||'Série D',game.tournamentProgression,game.country||'Brasil');
 const existing=game.tournaments&&typeof game.tournaments==='object'&&!Array.isArray(game.tournaments)?game.tournaments:{};
 const next={...existing}; const recovered=[];
 for(const [key,fallback] of Object.entries(fresh)){
  const current=existing[key];
  if(!usable(current,key,game.club)){
   next[key]={...fallback,eligible:typeof current?.eligible==='boolean'?current.eligible:fallback.eligible};
   recovered.push(key);
  }
 }
 repaired.tournaments=next;
 if(recovered.length)repaired.tournamentRecoveryNotice=`Competições recuperadas com segurança: ${recovered.join(', ')}. A carreira e a liga foram preservadas.`;
 return {game:repaired,recovered};
}
module.exports={recoverTournamentEntries,usable};
