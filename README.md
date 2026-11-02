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


## Edição isolada Brasil 2026

Esta edição começa pela escolha de estado, competição/divisão e clube no Brasil. Ela usa um identificador de armazenamento e um identificador Android novos: salvamentos da edição publicada não são lidos nem apagados. Dados estaduais fornecidos estão em `brazil-2026-state-clubs.json`; Série A/B/C, grupos listados da Série D, entradas da Copa do Brasil e formatos/regulamentos conhecidos ficam nos arquivos `brazil-2026-*.json`. Listas e regras ausentes são explicitamente assinaladas como não fornecidas; não completar participantes por suposição. A Série D ainda mantém um motor legado de temporada incompatível com a distribuição 16×6 — ver o registro `engineStatus` em `brazil-2026-formats.json`; portanto não alegamos equivalência regulatória total. O workflow desta branch cria apenas artifact de validação, não publica nem libera aplicativo.


**Copa do Brasil 2026 (regras escolhidas pelo usuário):** a lista nominal inicial enviada está em `brazil-2026-copa-brasil-entrants.json`, com exatamente 126 nomes únicos. Fórmula de elegibilidade informada: 3 elegíveis por UF × 27 unidades federativas (26 estados + DF) + 20 Série A + 20 Série B + 5 campeões = 126; a lista nominal permanece preservada e possíveis diferenças entre subtotais por UF e fórmula não são corrigidas inventando ou removendo clubes. As cinco copas de origem, confirmadas, são Copa Paulista, Copa Rio, Copa FGF, Copa Santa Catarina e Copa do Nordeste; os seis clubes nomeados para a Copa do Nordeste são participantes da competição, não seis vagas. Correção final do usuário: manter as regras anteriores, não as novas. Assim, conservar as nove fases anteriores (incluindo a 5ª fase/oitavas de 32 clubes), regras anteriores de mata-mata/desempate e final em jogo único em 6 de dezembro. A proposta de sete fases e final em dois jogos está supersedida. Para a Libertadores, manter regra anterior: campeão na fase de grupos e vice na fase preliminar; proposta mais nova de apenas o campeão foi supersedida. Premiação por fase, troféu e medalhas, sem valores monetários informados.

**Classificação Série D:** cotas de vagas estaduais informadas: SP 4; RJ/MG/RS/PR/CE/GO/SC/BA 3 cada; demais UFs 2 cada. Podem ainda participar rebaixados da Série C, desempenho na Série D anterior conforme o regulamento daquela edição e ranking nacional CBF. Cotas/critério podem mudar por decisão anual da CBF; o usuário enviará os participantes de cada temporada, sem geração automática de clubes. Pendência: informação anterior diz que 2 últimos da Série C 2026 caem à D; regra posterior recebida diz 4. Não definir ou implementar quantidade de rebaixados até confirmação.
