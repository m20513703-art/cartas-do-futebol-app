# Futebol Top — Android

Jogo de carreira de futebol para Android (Expo / React Native). A versão atual permite criar um clube e jogar partidas da liga estadual de entrada nos estados com dados de participantes verificados. Tabela, elenco, escolhas táticas e eventos de partida ficam salvos localmente no aparelho.

A progressão para outras divisões, ligas nacionais, Copa do Brasil, Libertadores, demais copas e ligas internacionais ainda não está implementada. O objetivo exibido no jogo é uma meta, não uma mecânica de promoção já disponível.

O salvamento existente permanece compatível: o app continua lendo e gravando a chave local `footballCareerV1`.

## Build
`npm install` e `npx expo start`; o workflow em `.github/workflows/android.yml` gera e valida o APK assinado de release.
