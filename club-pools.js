'use strict';

// Real club names used as illustrative opponents; rosters are not a verified
// snapshot of any official 2026 competition or participant list.
const STATE_CLUBS = {
 AC:['Rio Branco-AC','Atlético Acreano','Galvez','Humaitá','Andirá','Vasco-AC','Plácido de Castro','São Francisco-AC'],
 AL:['CRB','CSA','ASA','Murici','CSE','Coruripe','Penedense','Jaciobá'],
 AP:['Santos-AP','Ypiranga-AP','Trem','Oratório','São Paulo-AP','Macapá','Independente-AP','Santana'],
 AM:['Nacional-AM','Amazonas FC','Manaus FC','Princesa do Solimões','Manauara','Fast Clube','São Raimundo-AM','Iranduba'],
 BA:['Bahia','Vitória','Juazeirense','Jacuipense','Atlético de Alagoinhas','Barcelona de Ilhéus','Jequié','Itabuna'],
 CE:['Ceará','Fortaleza','Ferroviário-CE','Floresta','Maracanã-CE','Iguatu','Barbalha','Horizonte-CE'],
 DF:['Brasiliense','Gama','Ceilândia','Capital-DF','Real Brasília','Samambaia','Sobradinho','Planaltina-DF'],
 ES:['Rio Branco-ES','Desportiva Ferroviária','Real Noroeste','Vitória-ES','Serra-ES','Nova Venécia','Porto Vitória','Estrela do Norte-ES'],
 GO:['Goiás','Vila Nova','Atlético Goianiense','Aparecidense','Anápolis','Goianésia','Goiatuba','Crac'],
 MA:['Sampaio Corrêa','Moto Club','Maranhão Atlético','IAPE','Imperatriz','Tuntum','Pinheiro','Cordino'],
 MT:['Cuiabá','Mixto','União Rondonópolis','Luverdense','Operário VG','Dom Bosco','Nova Mutum','Cacerense'],
 MS:['Operário-MS','Costa Rica-MS','Dourados AC','Naviraiense','Aquidauanense','Comercial-MS','Ivinhema','Corumbaense'],
 MG:['Atlético Mineiro','Cruzeiro','América-MG','Tombense','Athletic Club','Pouso Alegre','Democrata-GV','Villa Nova'],
 PA:['Remo','Paysandu','Tuna Luso','Castanhal','Águia de Marabá','Bragantino-PA','São Francisco-PA','Independente-PA'],
 PB:['Botafogo-PB','Treze','Campinense','Sousa','Nacional de Patos','CSP','Serra Branca','Atlético-PB'],
 PR:['Athletico Paranaense','Coritiba','Londrina','Maringá','Operário-PR','Cianorte','FC Cascavel','Azuriz'],
 PE:['Sport','Náutico','Santa Cruz','Retrô','Maguary','Afogados','Central','Petrolina'],
 PI:['Altos','River-PI','Fluminense-PI','Parnahyba','4 de Julho','Picos','Teresina','Oeirense'],
 RJ:['Flamengo','Fluminense','Vasco da Gama','Botafogo','Volta Redonda','Boavista-RJ','Bangu','Madureira'],
 RN:['ABC','América-RN','Potiguar de Mossoró','Globo FC','Santa Cruz-RN','Baraúnas','Força e Luz','Alecrim'],
 RS:['Grêmio','Internacional','Juventude','Caxias','Ypiranga-RS','Brasil de Pelotas','São José-RS','Aimoré'],
 RO:['Ji-Paraná','Porto Velho','Real Ariquemes','Genus','Barcelona-RO','Guaporé','União Cacoalense','Rondoniense'],
 RR:['São Raimundo-RR','GAS','Baré','Atlético Roraima','Náutico-RR','River-RR','Progresso-RR','Real-RR'],
 SC:['Avaí','Figueirense','Chapecoense','Criciúma','Joinville','Brusque','Concórdia','Barra-SC'],
 SP:['Corinthians','Palmeiras','Santos','São Paulo','Red Bull Bragantino','Ponte Preta','Guarani','Botafogo-SP','Mirassol','Novorizontino','Ituano','São Bernardo','Portuguesa','Ferroviária','Noroeste','Inter de Limeira'],
 SE:['Sergipe','Confiança','Itabaiana','Lagarto','Falcon','América de Propriá','Dorense','Estanciano'],
 TO:['Tocantinópolis','Tocantins de Miracema','Capital-TO','Gurupi','Araguaína','União Araguainense','Bela Vista-TO','Interporto']
};
const INTERNATIONAL = {
 Argentina:['Boca Juniors','River Plate','Racing Club','Independiente','San Lorenzo','Rosario Central','Talleres','Estudiantes','Lanús','Vélez Sarsfield','Newell’s Old Boys','Huracán','Belgrano','Godoy Cruz','Argentinos Juniors','Defensa y Justicia'],
 Uruguai:['Peñarol','Nacional','Defensor Sporting','Liverpool Montevideo','Danubio','Cerro Largo','Wanderers','Plaza Colonia','Boston River','River Plate Montevideo','Racing Montevideo','Cerro'],
 Chile:['Colo-Colo','Universidad de Chile','Universidad Católica','Palestino','Unión Española','Everton','Cobresal','Huachipato','O’Higgins','Audax Italiano','Coquimbo Unido','Cobreloa'],
 Colômbia:['Atlético Nacional','Millonarios','América de Cali','Junior','Deportivo Cali','Santa Fe','Tolima','Once Caldas','Independiente Medellín','Deportivo Pereira','Atlético Bucaramanga','Envigado'],
 Peru:['Universitario','Alianza Lima','Sporting Cristal','Melgar','Cienciano','Sport Huancayo','Cusco FC','UTC','Sport Boys','Alianza Atlético','Deportivo Garcilaso','Carlos A. Mannucci'],
 Paraguai:['Olimpia','Cerro Porteño','Libertad','Guaraní','Nacional','Sportivo Luqueño','Tacuary','General Caballero','Sportivo Ameliano','2 de Mayo','Sol de América','Guaireña'],
 Equador:['Barcelona SC','Emelec','LDU Quito','Independiente del Valle','Aucas','Deportivo Cuenca','El Nacional','Delfín','Universidad Católica','Orense','Macará','Mushuc Runa'],
 México:['América','Guadalajara','Cruz Azul','Tigres','Monterrey','Pumas','Toluca','Pachuca','Atlas','León','Santos Laguna','Necaxa','Atlético San Luis','Querétaro','Tijuana','Puebla'],
 'Estados Unidos':['Inter Miami','LA Galaxy','Seattle Sounders','Atlanta United','LAFC','New York City FC','Orlando City','Portland Timbers','Columbus Crew','Philadelphia Union','Austin FC','New York Red Bulls','FC Dallas','Houston Dynamo','Minnesota United','Sporting Kansas City'],
 Inglaterra:['Arsenal','Liverpool','Manchester City','Manchester United','Chelsea','Tottenham','Newcastle United','Aston Villa','West Ham United','Everton','Leicester City','Leeds United','Southampton','Sunderland','Norwich City','Middlesbrough'],
 Espanha:['Real Madrid','Barcelona','Atlético de Madrid','Sevilla','Valencia','Real Sociedad','Athletic Club','Villarreal','Real Betis','Celta de Vigo','Getafe','Osasuna','Espanyol','Girona','Rayo Vallecano','Mallorca'],
 Itália:['Inter','Milan','Juventus','Roma','Napoli','Lazio','Atalanta','Fiorentina','Bologna','Torino','Genoa','Sampdoria','Palermo','Parma','Udinese','Sassuolo'],
 Alemanha:['Bayern de Munique','Borussia Dortmund','Bayer Leverkusen','RB Leipzig','Stuttgart','Eintracht Frankfurt','Wolfsburg','Freiburg','Werder Bremen','Borussia Mönchengladbach','Schalke 04','Hamburger SV','Hoffenheim','Mainz 05','Augsburg','Union Berlin'],
 França:['Paris Saint-Germain','Marseille','Lyon','Monaco','Lille','Nice','Lens','Rennes','Nantes','Bordeaux','Saint-Étienne','Toulouse','Montpellier','Strasbourg','Reims','Auxerre'],
 Portugal:['Benfica','Porto','Sporting','Braga','Vitória de Guimarães','Boavista','Famalicão','Rio Ave','Gil Vicente','Moreirense','Estoril','Casa Pia','Arouca','Nacional da Madeira','Marítimo','Académica'],
 'Países Baixos':['Ajax','PSV','Feyenoord','AZ Alkmaar','Twente','Utrecht','Heerenveen','Groningen','Vitesse','Sparta Rotterdam','NEC Nijmegen','Go Ahead Eagles','Fortuna Sittard','Willem II','Roda JC','NAC Breda'],
 Turquia:['Galatasaray','Fenerbahçe','Beşiktaş','Trabzonspor','Başakşehir','Samsunspor','Kasımpaşa','Antalyaspor','Sivasspor','Bursaspor','Göztepe','Adana Demirspor','Kayserispor','Konyaspor','Rizespor','Gaziantep FK'],
 Japão:['Kashima Antlers','Urawa Reds','Yokohama F. Marinos','Kawasaki Frontale','Gamba Osaka','Cerezo Osaka','Vissel Kobe','FC Tokyo','Urawa Red Diamonds','Sanfrecce Hiroshima','Nagoya Grampus','Kashiwa Reysol','Shimizu S-Pulse','Júbilo Iwata','Albirex Niigata','Consadole Sapporo'],
 'Arábia Saudita':['Al-Hilal','Al-Nassr','Al-Ittihad','Al-Ahli','Al-Shabab','Al-Ettifaq','Al-Taawoun','Al-Fateh','Al-Fayha','Al-Raed','Damac FC','Al-Wehda','Al-Khaleej','Al-Tai','Abha Club','Al-Hazem']
};
function normalize(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function unique(list){const seen=new Set();return (list||[]).filter(x=>{const k=normalize(x);if(!k||seen.has(k))return false;seen.add(k);return true})}
function brazilNational(){return unique(Object.values(STATE_CLUBS).flat())}
function teamsFor(country,state,division,count=8){const pool=country==='Brasil'?(STATE_CLUBS[state]||brazilNational()):(INTERNATIONAL[country]||[]);if(!pool.length)return [];const idx=Math.max(0, (division||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0))%pool.length;return unique(Array.from({length:pool.length},(_,i)=>pool[(idx+i)%pool.length])).slice(0,count)}
module.exports={STATE_CLUBS,INTERNATIONAL,brazilNational,teamsFor,unique};
