# Cartas do Futebol — app Android

Aplicativo Expo em React Native. Este pacote implementa uma primeira base funcional da carreira: criação de clube, escolha de país/estado, ingresso na divisão estadual inferior, calendário de liga, classificação, elenco gerado, partidas em dois tempos com eventos minuto a minuto, cartas táticas, armazenamento local e progressão de acesso nacional. As regras projetadas para Libertadores, Copa do Brasil, Sul-Americana e Mundial aparecem na área Copas, mas ainda não há competição jogável nessas etapas.

No Brasil, a A4 Paulista, a B2 Carioca e a Segunda Divisão Mineira estão identificadas como divisões de entrada. Clubes de estaduais/países ainda não configurados têm elenco de demonstração; não são listas oficiais verificadas.

## Build
`npm install` e `npx expo start`; APK via `eas build -p android --profile preview`.
