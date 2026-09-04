# 🎵 Sonet — Red Social Musical con AI

> La red social de música más completa: califica, matchea, cita, descubre conciertos y deja que el AI elija tu canción del día.

[![Expo](https://img.shields.io/badge/Expo-54-black?style=flat&logo=expo)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat&logo=supabase)](https://supabase.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)

---

## 🚀 Setup Rápido (para el demo del domingo)

```bash
# 1. Clonar y entrar
git clone <repo-url>
cd sonet

# 2. Instalar dependencias mobile
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# → Editar .env.local con tus keys (ver sección Keys abajo)

# 4. Correr
npx expo start
```

Para la app completa con mapas: `npx expo run:ios` o `npx expo run:android`

---

## 🔑 Keys Necesarias

| Key | Dónde conseguirla | Env var |
|-----|-------------------|---------|
| Supabase URL + Anon Key | supabase.com → proyecto → Settings → API | `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Spotify Client ID | developer.spotify.com → Create App | `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` |
| Ticketmaster | developer.ticketmaster.com | `EXPO_PUBLIC_TICKETMASTER_API_KEY` |
| YouTube | console.cloud.google.com → YouTube Data API v3 | `EXPO_PUBLIC_YOUTUBE_API_KEY` |

### Supabase Database Setup

```sql
-- En Supabase SQL Editor, ejecutar:
-- supabase/schema.sql   (fuente única de verdad — schema_v2.sql fue retirado y fusionado aquí)
```

Después de correr el schema:
1. **Authentication → Providers**: habilita **Google** y **Apple** (Email ya viene habilitado). Cada uno pide su propio Client ID/Secret desde Google Cloud Console / Apple Developer — Supabase te da la URL de callback exacta a pegar en cada uno.
2. **Authentication → URL Configuration**: agrega `sonet://auth/callback` como Redirect URL.

### Spotify Redirect URIs

Agregar en Spotify Developer Dashboard:
- `sonet://auth/callback`
- `exp://127.0.0.1:8081/--/auth/callback` (para Expo Go en dev)

### Nota sobre probar login en Expo Go

`stores/authStore.ts` y `lib/spotify.ts` fuerzan el esquema `sonet://` en `AuthSession.makeRedirectUri` — correcto para un build real (EAS/dev client), pero significa que el login con Google/Apple/Spotify **no completará el regreso a la app dentro de Expo Go**, porque Expo Go no es dueño de ese esquema. Esto ya no es una limitación nueva: `expo-audio`, `expo-notifications` (push remoto), `expo-location` y `react-native-maps` tampoco funcionan completamente en Expo Go a partir de este sprint — para probar el flujo completo, usa un dev client (`npx expo run:ios` / `npx expo run:android`) o un build de EAS, no Expo Go.

---

## 🔒 Manual — Cuentas y Setup Externo (fuera del alcance de este repo)

Esto es lo que **tú** tienes que hacer con tus propias cuentas — no es código, son pasos administrativos que nadie puede hacer por ti:

| Paso | Dónde | Notas |
|------|-------|-------|
| Crear proyecto Supabase | supabase.com | Plan gratuito alcanza para el demo. Corre `supabase/schema.sql` completo en el SQL Editor. |
| App de Spotify Developer | developer.spotify.com/dashboard | Redirect URIs de arriba. Client ID va en `.env.local`. |
| API key de Ticketmaster | developer.ticketmaster.com | El mapa de conciertos reales y el deck de Hitster/juegos lo usan — sin esta key, esas pantallas degradan mostrando solo eventos de comunidad / modo silencioso, no se caen. |
| API key de YouTube (opcional) | console.cloud.google.com | Solo si quieres videos musicales reales. |
| Habilitar Google OAuth | Google Cloud Console → OAuth consent screen + credenciales | Pega el callback URL que te da Supabase. Necesita la URL del Aviso de Privacidad (siguiente fila). |
| Publicar Aviso de Privacidad + Términos | Ya redactados y publicados como páginas reales: [Aviso de Privacidad](https://claude.ai/code/artifact/484adb15-ec41-4b6a-aa9f-a11c1d67e892) · [Términos y Condiciones](https://claude.ai/code/artifact/8a7e634d-620f-429a-aba7-e8a61c1babe4) (fuente: `legal/`) | Están privados hasta que le des Share a cada uno — un clic — y luego pegas esa URL en App Store Connect / Google OAuth. Todavía necesitan una revisión legal antes de ser definitivos. |
| Bucket de Storage para Stories | Supabase → Storage → New bucket, nombre exacto `stories`, público en lectura | Sin este bucket, publicar una historia falla al subir la imagen — el resto de la app no lo necesita. |
| Volverte moderador | Supabase → SQL Editor: `INSERT INTO admin_users (user_id) VALUES ('tu-uuid-de-auth.users');` | Deliberadamente no hay forma de auto-otorgarte este acceso desde la app — es el arranque estándar de "quién es el primer admin". Una vez ahí, `Perfil → Moderación` te deja revisar y resolver reportes reales. |
| Cuenta RevenueCat + productos | app.revenuecat.com + App Store Connect / Play Console | Gatea la creación de eventos (paywall Premium, $99 MXN/mes). Sin `EXPO_PUBLIC_REVENUECAT_API_KEY` configurada, el paywall se muestra igual pero las compras quedan inertes (no truena la app). Configura un entitlement llamado exactamente `premium`. |
| Habilitar Apple OAuth | Apple Developer Program ($99 USD/año) | Requerido para "Sign in with Apple" real y, más adelante, Apple Music (MusicKit). Sin esto, el botón de Apple no funcionará — es la única pieza que depende de un pago tuyo. |
| Certificación SOC2 | Auditor externo (Vanta, Drata, Secureframe, o una firma directa) | Este repo ya implementa los controles técnicos que un auditor revisa (RLS en cada tabla, secretos aislados de tablas de lectura pública, políticas de mínimo privilegio). La certificación en sí es un proceso pagado de semanas/meses que solo tu empresa puede contratar — no es algo que se resuelva con código. |
| Desplegar el backend Python (`backend/`) | Railway / Fly.io (`Dockerfile` ya incluido) | Opcional. El matching y las recomendaciones ya funcionan 100% del lado del cliente (`lib/ai/matchEngine.ts` + `lib/ai/recommendations.ts`), así que este backend no es necesario para el demo. Solo despliégalo si más adelante quieres scoring SVM del lado del servidor o los cron jobs de APScheduler. |
| App stores (post-demo) | Apple Developer Program + Google Play Console | Necesario cuando quieran publicar de verdad, no para el demo con amigos. |

### Lo que quedó fuera — y por qué

Todo lo del pitch original está construido salvo lo que depende de una cuenta/pago tuyo (arriba) o de meses de trabajo real (certificación, publicación en stores). Gaps menores conocidos, por si los notas jugando:

- **Discovery Roulette** sigue siendo el shell de UI original — nunca se tocó, no era parte de ningún corte.
- **Mapa**: sin `expo-location` instalado (evita forzar un rebuild nativo), la ubicación es por búsqueda de ciudad, no GPS del dispositivo.
- **Chat**: solo texto — `song_share` ya existe en el schema pero no está cableado a la UI. Sin notificaciones push, solo se actualiza en vivo si tienes el hilo abierto.
- **Historias**: se ven pero no se borran solas a las 24h (el filtro es en la query, no hay job de limpieza) — no afecta la demo, sí el costo de Storage a largo plazo.
- **Apple Music OAuth**, **certificación SOC2 real**, y **publicación en App Store/Play Store** siguen bloqueadas en cuentas que solo tú puedes crear (ver tabla arriba).

---

## 🏗️ Stack

| Capa | Tecnología |
|------|-----------|
| Mobile | React Native + Expo SDK 54 |
| Routing | Expo Router v3 (file-based) |
| Backend DB | Supabase (Auth + PostgreSQL + Realtime) |
| ML Backend | FastAPI + scikit-learn (Python) |
| State | Zustand |
| Charts | Victory Native |
| Maps | React Native Maps |
| APIs | Spotify + Ticketmaster + YouTube |

---

## 🤖 Sistema de AI/ML

### Music DNA Vector (22 dimensiones)
Cada usuario tiene un vector de gusto musical generado automáticamente desde Spotify:

```
energy, danceability, valence, acousticness, instrumentalness,
speechiness, tempo_norm, loudness_norm, liveness,
genre_pop, genre_rock, genre_hip_hop, genre_electronic, genre_latin,
genre_rnb, genre_jazz, genre_classical, genre_other,
avg_rating_norm, bpm_preference, vocal_preference, mood_index, diversity
```

### SVM-Inspired Match Engine (`lib/ai/matchEngine.ts`)
- Pesos diferenciados por feature (valence=2.0 — mood es el signal más fuerte)
- Cosine similarity en espacio de features ponderadas
- Sigmoid scaling → score 0-100
- Breakdown: audio (40%) + géneros (35%) + mood (25%)
- Labels: Soul Twin → Frequency Match → Vibes Match → Groove Partner → Music Buddy

### Song of the Day (`components/recommendations/SongOfTheDay.tsx`)
- Spotify Recommendations API con target audio features del usuario
- Filtrado por artistas liked (≥8 rating) y excluded (≤3 rating)
- confidence score 0-99

### SoundMatch Dating (`app/(tabs)/date.tsx`)
- Swipe cards con compatibilidad calculada por el ML engine
- Perfil ciego: nunca se expone nombre/foto — solo edad, distancia y compatibilidad musical, todo opt-in por el usuario
- Modo configurable: dating, solo amigos, o apagado (recomendaciones sin match social)
- Like + Pass + Super Like
- Trigger SQL: match mutuo → notificación automática
- Icebreaker musical automático

### Ranking sin empates (`lib/ranking.ts`)
Igual que Beli/Letterboxd: cada rating nuevo se inserta por comparación binaria contra tu lista existente ("¿Cuál prefieres?"), nunca por un slider aislado — así que dos canciones nunca pueden empatar en tu ranking personal.
1. **Bucket**: "Me gustó" / "Estuvo bien" / "No fue lo mío" fija una banda de score (7.0–10.0 / 4.0–6.9 / 1.0–3.9).
2. **Duelo**: inserción binaria (O(log n) comparaciones) contra tu lista ya ordenada dentro de ese bucket.
3. El `score` mostrado se deriva de la posición final — la posición es la fuente de verdad, no un número que tú escribes.

---

## 📱 Pantallas

| Tab / Ruta | Descripción |
|-----|------------|
| 🏠 Feed | Timeline de ratings de la comunidad + Stories (rail arriba) + Daily Drop (pick del día, votación pública) + SongOfTheDay |
| 👥 Discover | Taste Match: personas con tu mismo gusto, mensaje directo desde cada perfil |
| 💘 SoundMatch | Dating musical con swipe, perfil ciego, configurable en `/soundmatch/settings` |
| 🗺️ Map | Mapa real (conciertos Ticketmaster + eventos de comunidad), "ya fui" / "amigos que van", crear evento (Premium) |
| 🎮 Juegos | Ver abajo |
| 👤 Profile | Dashboard personal + Mis ratings (ranking sin empates) + Top listas |
| 💬 Chat | `/chat` — accesible desde el ícono del Feed, un match de SoundMatch, o un perfil en Discover |

### Juegos (tab Juegos)
- **Hitster 🎧**: sala en vivo con código para compartir — escuchas una canción, la colocas en tu línea de tiempo cronológica, tus amigos pueden robártela con un token si creen que te equivocaste. El reemplazo real de lo que antes era el shell "Versus".
- **Adivina 🎵**: puzzle diario tipo Wordle (género/artista/álbum/canción), pistas progresivas, 6 intentos, racha persistente en Supabase.
- **Carrera Mundial 🌍**: la misma canción para todo el mundo cada día — el primero en adivinar es el #1, tabla de posiciones en vivo.
- **Perfect Lineup 🎪**: arma un cartel (headliner + actos de apoyo) de un pool diario de artistas reales, puntuado por cohesión de género + balance de popularidad.
- **Adivina el Artista 🎤** / **Adivina el Año 📅**: práctica libre (no diaria), ronda de 8 preguntas por audio, sin persistencia — reutilizan el mismo pool de canciones que Hitster.
- **Discovery Roulette 🎰**: shell de UI original, sin tocar — swipe para descubrir música nueva.

---

## 📁 Estructura del Proyecto

```
sonet/
├── app/                    Expo Router screens
│   ├── (auth)/            login, register, onboarding
│   ├── (tabs)/            feed, discover, date, map, games, profile, soundmatch/settings
│   ├── hitster/           lobby + live room (outside the tab bar — full-screen)
│   ├── chat/              conversation list + thread
│   └── stories/           full-screen story viewer
├── components/
│   ├── dashboard/         MusicDashboard (charts)
│   ├── rating/            CompareDuel (no-ties duel UI)
│   ├── soundmatch/        SoundMatchCard (Tinder-style, blind profile)
│   ├── recommendations/   SongOfTheDay
│   ├── stories/           StoryRail, CreateStoryModal
│   ├── premium/           PaywallModal (RevenueCat)
│   └── games/             GuessSongGame, PerfectLineupGame, WorldwideRaceGame, ListenQuizGame, DiscoveryRoulette
├── lib/
│   ├── ai/               tasteVector.ts, matchEngine.ts, recommendations.ts
│   ├── ranking.ts        Pairwise-comparison forced ranking (no ties)
│   ├── dailyGame.ts, hitsterDeck.ts, racePool.ts, lineupPool.ts, lineupScore.ts, dailyDrop.ts, stories.ts
│   ├── purchases.ts      RevenueCat wrapper
│   ├── supabase.ts, spotify.ts, ticketmaster.ts, youtube.ts
│   └── musicDB.ts        Unified search API
├── stores/               Zustand: auth, rating, social, ai, recommendations, hitster, games, lineup, race, chat, story
├── backend/              Python FastAPI ML service (optional, not deployed by default — see Manual)
│   ├── main.py           FastAPI + APScheduler cron
│   ├── music_dna.py      256-dim feature vector
│   ├── svm_model.py      RBF SVC compatibility model
│   ├── recommendations.py Hybrid SOTD engine
│   └── catalog_sync.py   Spotify/Ticketmaster/YouTube sync
└── supabase/
    └── schema.sql         Single source of truth — run this, nothing else
```

---

## 🤝 Cómo Contribuir

1. Clona el repo y crea tu branch: `git checkout -b feature/nombre`
2. Lee `CLAUDE.md` para contexto completo del proyecto
3. Corre `npx expo start` y prueba en tu teléfono con Expo Go
4. PR con descripción de qué cambiaste y por qué

---

## 📅 Roadmap Post-Demo

- [ ] Listening Parties en tiempo real (más allá de crearlas — sync de audio compartido)
- [ ] Notificaciones push (Expo Notifications) — hoy Chat y Hitster solo actualizan en vivo con la app abierta
- [ ] Bandsintown/Songkick como fuente adicional de conciertos
- [ ] Apple Music OAuth (bloqueado en cuenta de pago, ver Manual)
- [ ] Limpieza automática de Stories vencidas (hoy solo se filtran, no se borran)
- [ ] Song-share dentro del Chat (`message_type: 'song_share'` ya existe en el schema, falta la UI)
- [ ] Widget de canción favorita para iOS/Android
