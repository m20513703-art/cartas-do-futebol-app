# Futebol Top — Android

Versão de validação v1.3.5 (branch isolada; não publicada). Na criação da carreira, o jogador escolhe entre os 20 países disponíveis e, no Brasil, qualquer uma das 27 UFs e sua cidade. A carreira começa sempre no primeiro/menor nível do caminho de divisões daquele país/estado. As listas locais de adversários usam nomes de clubes reais conhecidos, selecionados por país/estado. São pools demonstrativos: não garantem os participantes oficiais da temporada 2026 nem reproduzem calendários, resultados ou divisões oficiais completos.

A carreira agora inclui uma copa eliminatória simplificada jogável no país: uma semifinal do clube contra rival e jogo simulado entre rivais, seguida de final. No Brasil, a copa é nomeada por estado (Copa Paulista, Copa Carioca etc.). A regra de carreira solicitada dá ao campeão a escolha entre Série D e Copa do Brasil e ao vice a vaga restante; é regra ficcional do jogo, não descrição de regras oficiais. Outros países têm uma copa nacional simplificada e o jogador pode disputar a liga escolhida e a copa.

Migração da chave `footballCareerV1`: preserva clube, cidade, país/estado, temporada, elenco e campeonato/tabela existente, acrescentando a copa compatível para carreiras antigas. Não apaga nem reinicia o progresso existente.

Nas temporadas de liga, os dois primeiros colocados sobem ao próximo nível do caminho; no topo das ligas estaduais de SP, posições 6–7 e RJ, posições 4–5 qualificam para Série D como regras ficcionais da carreira. Rebaixamento é aplicado pelo fim da tabela, quando existe nível inferior.

O jogo usa nomes reais em pools demonstrativos; temporadas, participantes, vagas, chaves e resultados continuam simplificados e não devem ser entendidos como listas ou regulamentos oficiais de 2026. Ainda não estão implementados como torneios jogáveis: Copa do Brasil independente (a vaga obtida é registrada), promoção/rebaixamento, Libertadores, Sul-Americana, Mundial, copas continentais e estaduais oficiais com regulamentos completos. A lista de divisões e as copas são versões simplificadas para carreira; não se deve interpretar o botão ou nome como homologação oficial de participantes/formato.

`npm install` e `npx expo start`; `.github/workflows/android.yml` cria e valida o APK Android assinado.


## Pools de clubes
O arquivo `club-pools.js` fornece nomes de clubes conhecidos por país e por estado brasileiro. Cada campeonato é uma seleção determinística e sem duplicatas dentro da própria competição. Os nomes reais são usados apenas como identificação para o jogo; isso não afirma participação atual confirmada, afiliação oficial, nem dados competitivos de 2026.


## Pools de clubes
`club-pools.js` fornece nomes de clubes conhecidos por país e por estado brasileiro. Cada campeonato seleciona adversários determinísticos, evitando duplicatas dentro da competição. Nomes reais são usados apenas como identificação para o jogo: isso não afirma participação atual confirmada, afiliação oficial, nem dados competitivos de 2026. Formatos e resultados seguem as regras simplificadas do jogo.
