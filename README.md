# Cartas do Futebol — Android

Career-game project for Android (Expo / React Native). This is an incomplete development build, not the finished game.

## Current playable scope
- Create a custom club for Brazil in one of three verified state entry leagues: Paulista A4, Carioca Série B2 or Mineiro Segunda Divisão (2026 participant lists sourced below).
- Round-robin league table/fixtures, generated fictional player roster, tactical choices, minute-by-minute match events, pause/resume and selectable match speed.
- Progress is currently limited to the selected opening league. The project does **not** yet implement state promotion, national divisions, Copa do Brasil, Libertadores, other international cups, or the other 19 countries. No progression to national Série D–A is claimed.
- Clubs generated for the player's custom team are fictional. The named rival teams in supported state leagues are the published 2026 participant lists; official affiliations are not implied beyond participation.
- Save data is local to the Android installation.

## Verified 2026 entry-league participant sources
- São Paulo — Paulista A4 final participant table / clubs: https://ge.globo.com/sp/mogi-das-cruzes-suzano/futebol/paulista-serie-a4/noticia/2026/04/04/paulista-serie-a4-veja-classificados-rebaixados-e-confrontos-das-quartas-de-final.ghtml
- Rio de Janeiro — Carioca Série B2 participants: https://ge.globo.com/rj/sul-do-rio-costa-verde/futebol/noticia/2026/08/04/barra-mansa-sera-casa-de-dois-clubes-na-quarta-divisao-do-campeonato-carioca-entenda.ghtml
- Minas Gerais — Mineiro Segunda Divisão groups: https://ge.globo.com/mg/triangulo-mineiro/futebol/noticia/2026/06/11/segunda-divisao-do-mineiro-2026-veja-datas-grupos-e-formato-de-disputa.ghtml

## Brazilian national 2026 reference lists (not yet implemented)
- Série A–D participants: https://ge.globo.com/pi/futebol/noticia/2025/12/29/brasileirao-veja-os-156-clubes-das-series-a-b-c-e-d-em-2026.ghtml
- Copa do Brasil participants and entry rounds: https://ge.globo.com/pe/futebol/copa-do-brasil/noticia/2025/12/22/copa-do-brasil-2026-veja-todos-os-126-clubes-classificados-e-fase-de-estreia-de-cada-um.ghtml

## Build
The Android workflow builds a debug APK and checks its ZIP/package structure. A passing build only proves an APK artifact was produced; gameplay still needs device testing before release.
