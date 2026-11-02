'use strict';
const stateClubs=require('./brazil-2026-state-clubs.json');
const formats=require('./brazil-2026-formats.json');
const nationalClubs=require('./brazil-2026-national-clubs.json');
nationalClubs['Série D']=Object.values(require('./brazil-2026-series-d-groups.json')).flat();
const seriesDGroups=require('./brazil-2026-series-d-groups.json');
const UFS={AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'};
function divisions(uf){return Object.keys(stateClubs[uf]||{});}
function clubs(uf,division){return (stateClubs[uf]||{})[division]||[];}
function stateSummary(){return Object.keys(UFS).map(uf=>({uf,name:UFS[uf],divisions:divisions(uf),clubs:Object.values(stateClubs[uf]||{}).flat().length,hasUnknownDivisions:!stateClubs[uf]}));}
function validate(){const errors=[];for(const [uf,ds] of Object.entries(stateClubs)){if(!UFS[uf])errors.push(`UF desconhecida: ${uf}`);for(const [d,teams] of Object.entries(ds)){if(!Array.isArray(teams)||new Set(teams).size!==teams.length)errors.push(`Lista inválida: ${uf}/${d}`);}}return errors;}
module.exports={stateClubs,formats,nationalClubs,seriesDGroups,UFS,divisions,clubs,stateSummary,validate};
